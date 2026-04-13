/**
 * Upload route with SSE streaming + smart orchestrator + anomaly detection + memory
 */
const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { getStore } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const cleaner = require('../agents/cleaner');
const analyzer = require('../agents/analyzer');
const visualizer = require('../agents/visualizer');
const predictor = require('../agents/predictor');
const reporter = require('../agents/reporter');
const anomalyAgent = require('../agents/anomaly');
const orchestrator = require('../agents/orchestrator');
const memory = require('../agents/memory');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) cb(null, true);
    else cb(new Error('Only CSV files are allowed'));
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});

// ─── Shared pipeline logic ──────────────────────────────────────────────────────

async function runPipeline(filePath, filename, userId, sendEvent) {
  const datasetId = uuidv4();
  const store = getStore();
  const startTime = Date.now();

  sendEvent('progress', { step: 'upload', status: 'complete', message: 'File received' });

  // Agent 5: Clean
  sendEvent('progress', { step: 'clean', status: 'started', message: 'Cleaning data...' });
  const cleanResult = await cleaner.process(filePath);
  sendEvent('progress', { step: 'clean', status: 'complete', message: `Cleaned: ${cleanResult.originalRowCount} → ${cleanResult.cleanedRowCount} rows` });

  await store.insertDataset({
    id: datasetId, filename, userId,
    originalRowCount: cleanResult.originalRowCount,
    cleanedRowCount: cleanResult.cleanedRowCount,
    columns: cleanResult.columns,
    columnTypes: cleanResult.columnTypes,
    cleaningSummary: cleanResult.summary,
    status: 'analyzing'
  });

  // Orchestrator decides pipeline
  sendEvent('progress', { step: 'orchestrate', status: 'started', message: 'Planning pipeline...' });
  const plan = orchestrator.createExecutionPlan(cleanResult);
  sendEvent('progress', { step: 'orchestrate', status: 'complete', message: `${plan.agents.length} agents queued`, plan: plan.reasoning });

  // Agent 6: Analyze
  sendEvent('progress', { step: 'analyze', status: 'started', message: 'Analyzing patterns...' });
  const analysisResult = await analyzer.process(cleanResult);
  sendEvent('progress', { step: 'analyze', status: 'complete', message: `${analysisResult.insights.length} insights found` });

  await store.insertAnalysis({
    id: uuidv4(), datasetId,
    statistics: analysisResult.statistics,
    correlations: analysisResult.correlations,
    outliers: analysisResult.outliers,
    insights: analysisResult.insights
  });

  // Anomaly Detection
  let anomalyResult = null;
  if (plan.agents.some(a => a.name === 'anomaly')) {
    sendEvent('progress', { step: 'anomaly', status: 'started', message: 'Detecting anomalies...' });
    anomalyResult = anomalyAgent.process(cleanResult, analysisResult);
    sendEvent('progress', { step: 'anomaly', status: 'complete', message: `${anomalyResult.summary.totalAnomalies} anomalies detected` });

    await store.insertAnomalies({ id: uuidv4(), datasetId, anomalies: anomalyResult });
  }

  // Agent 7: Visualize
  sendEvent('progress', { step: 'visualize', status: 'started', message: 'Generating charts...' });
  const vizResult = await visualizer.process(cleanResult, analysisResult);
  sendEvent('progress', { step: 'visualize', status: 'complete', message: `${vizResult.charts.length} charts created` });

  await store.insertVisualization({ id: uuidv4(), datasetId, charts: vizResult.charts });

  // Agent 8: Predict
  let predResult = { predictions: [], summary: 'Predictions not applicable.' };
  if (plan.agents.some(a => a.name === 'predictor')) {
    sendEvent('progress', { step: 'predict', status: 'started', message: 'Making predictions...' });
    predResult = await predictor.process(cleanResult);
    sendEvent('progress', { step: 'predict', status: 'complete', message: predResult.summary });
  }

  await store.insertPrediction({ id: uuidv4(), datasetId, predictions: predResult.predictions, summary: predResult.summary });

  // Memory: Compare with previous
  sendEvent('progress', { step: 'memory', status: 'started', message: 'Checking history...' });
  const memoryResult = await memory.compareWithPrevious(
    { statistics: analysisResult.statistics, columns: cleanResult.columns, columnTypes: cleanResult.columnTypes, cleanedData: cleanResult.cleanedData },
    datasetId, store
  );
  sendEvent('progress', { step: 'memory', status: 'complete', message: memoryResult.summary || 'No previous data' });

  // Agent 9: Report
  sendEvent('progress', { step: 'report', status: 'started', message: 'Compiling report...' });
  const reportResult = await reporter.process({
    filename, cleaning: cleanResult, analysis: analysisResult,
    visualizations: vizResult, predictions: predResult,
    anomalies: anomalyResult, memory: memoryResult
  });
  sendEvent('progress', { step: 'report', status: 'complete', message: 'Report ready' });

  await store.insertReport({ id: uuidv4(), datasetId, report: reportResult });

  // Store cleaned data for chat
  await store.storeData(datasetId, {
    cleanedData: cleanResult.cleanedData.slice(0, 2000),
    columns: cleanResult.columns,
    columnTypes: cleanResult.columnTypes,
    statistics: analysisResult.statistics,
    correlations: analysisResult.correlations
  });

  await store.updateDatasetStatus(datasetId, 'completed');

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  try { fs.unlinkSync(filePath); } catch {}

  return {
    success: true, datasetId, filename, duration: `${duration}s`,
    cleaning: cleanResult.summary,
    analysis: analysisResult,
    visualizations: vizResult,
    predictions: predResult,
    anomalies: anomalyResult,
    memory: memoryResult,
    report: reportResult,
    orchestration: plan
  };
}

// ─── POST /api/upload — Standard JSON response (Protected) ───────────────────────
router.post('/upload', requireAuth, upload.array('file', 10), async (req, res, next) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    if (files.length === 0) return res.status(400).json({ success: false, error: 'No file uploaded' });

    const noop = () => {};
    const allResults = [];

    for (const file of files) {
      const result = await runPipeline(file.path, file.originalname, req.user?.id, noop);
      allResults.push(result);
    }

    res.json(allResults.length === 1 ? allResults[0] : { success: true, results: allResults, count: allResults.length });
  } catch (error) {
    if (req.files) req.files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
    next(error);
  }
});

// ─── POST /api/upload/stream — SSE streaming response (Protected) ──────────────────
router.post('/upload/stream', requireAuth, upload.single('file'), async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    if (!req.file) {
      sendEvent('error', { message: 'No file uploaded' });
      return res.end();
    }

    const result = await runPipeline(req.file.path, req.file.originalname, req.user?.id, sendEvent);
    sendEvent('complete', result);
  } catch (error) {
    sendEvent('error', { message: error.message });
    if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch {}
  }

  res.end();
});

// ─── GET /api/datasets ──────────────────────────────────────────────────────────
router.get('/datasets', async (req, res, next) => {
  try {
    const store = getStore();
    const datasets = await store.getAllDatasets(req.user?.id);
    res.json({ success: true, datasets });
  } catch (error) { next(error); }
});

// ─── GET /api/dataset/:id ───────────────────────────────────────────────────────
router.get('/dataset/:id', async (req, res, next) => {
  try {
    const store = getStore();
    const dataset = await store.getDataset(req.params.id);
    if (!dataset) return res.status(404).json({ success: false, error: 'Dataset not found' });

    const analysis = await store.getAnalysis(req.params.id);
    const viz = await store.getVisualization(req.params.id);
    const pred = await store.getPrediction(req.params.id);
    const report = await store.getReport(req.params.id);
    const anomalies = await store.getAnomalies(req.params.id);

    res.json({ success: true, dataset, analysis, visualization: viz, prediction: pred, report, anomalies });
  } catch (error) { next(error); }
});

module.exports = router;
