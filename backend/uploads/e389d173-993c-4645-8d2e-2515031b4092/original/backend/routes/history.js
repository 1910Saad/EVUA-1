/**
 * History & Comparison routes - View past analyses, compare datasets
 */
const express = require('express');
const { getStore } = require('../config/db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/history — list past analyses
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const store = getStore();
    const datasets = await store.getAllDatasets(req.user?.id);
    res.json({
      success: true,
      datasets: datasets.map(d => ({
        id: d.id,
        filename: d.filename,
        originalRowCount: d.originalRowCount || d.original_row_count,
        cleanedRowCount: d.cleanedRowCount || d.cleaned_row_count,
        status: d.status,
        uploadedAt: d.uploaded_at || d.uploadedAt,
        cleaningSummary: d.cleaningSummary || d.cleaning_summary
      }))
    });
  } catch (error) { next(error); }
});

// GET /api/history/:id — get full results
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const store = getStore();
    const { id } = req.params;

    const dataset = await store.getDataset(id);
    if (!dataset) return res.status(404).json({ success: false, error: 'Dataset not found' });

    const analysis = await store.getAnalysis(id);
    const visualization = await store.getVisualization(id);
    const prediction = await store.getPrediction(id);
    const report = await store.getReport(id);
    const anomalies = await store.getAnomalies(id);

    res.json({
      success: true,
      datasetId: id,
      filename: dataset.filename,
      cleaning: dataset.cleaningSummary || dataset.cleaning_summary,
      analysis: analysis ? {
        statistics: analysis.statistics,
        correlations: analysis.correlations,
        outliers: analysis.outliers,
        insights: analysis.insights
      } : null,
      visualizations: visualization ? { charts: visualization.charts } : null,
      predictions: prediction ? { predictions: prediction.predictions, summary: prediction.summary } : null,
      report: report?.report || null,
      anomalies: anomalies?.anomalies || null
    });
  } catch (error) { next(error); }
});

// DELETE /api/history/:id — delete a dataset
router.delete('/:id', optionalAuth, async (req, res, next) => {
  try {
    const store = getStore();
    await store.deleteDataset(req.params.id);
    res.json({ success: true, message: 'Dataset deleted' });
  } catch (error) { next(error); }
});

// GET /api/history/:id/compare/:prevId — compare two datasets
router.get('/:id/compare/:prevId', optionalAuth, async (req, res, next) => {
  try {
    const store = getStore();
    const current = await store.getStoredData(req.params.id);
    const previous = await store.getStoredData(req.params.prevId);

    if (!current || !previous) {
      return res.status(404).json({ success: false, error: 'One or both datasets not found' });
    }

    const comparison = generateComparison(current, previous);
    res.json({ success: true, comparison });
  } catch (error) { next(error); }
});

function generateComparison(current, previous) {
  const commonColumns = current.columns.filter(c =>
    previous.columns.includes(c) && current.columnTypes[c] === 'numeric' && previous.columnTypes[c] === 'numeric'
  );

  const changes = commonColumns.map(col => {
    const curStats = current.statistics[col] || {};
    const prevStats = previous.statistics[col] || {};

    const meanChange = curStats.mean && prevStats.mean
      ? ((curStats.mean - prevStats.mean) / Math.abs(prevStats.mean || 1) * 100)
      : null;

    return {
      column: col,
      current: { mean: curStats.mean, median: curStats.median, std: curStats.std, min: curStats.min, max: curStats.max },
      previous: { mean: prevStats.mean, median: prevStats.median, std: prevStats.std, min: prevStats.min, max: prevStats.max },
      meanChange: meanChange ? parseFloat(meanChange.toFixed(2)) : null,
      direction: meanChange > 1 ? 'increased' : meanChange < -1 ? 'decreased' : 'stable'
    };
  });

  const insights = changes
    .filter(c => c.meanChange !== null && Math.abs(c.meanChange) > 1)
    .map(c => `${c.column} ${c.direction} by ${Math.abs(c.meanChange).toFixed(1)}% (${c.previous.mean?.toFixed(2)} → ${c.current.mean?.toFixed(2)})`);

  return {
    commonColumns: commonColumns.length,
    rowCountChange: {
      previous: previous.cleanedData.length,
      current: current.cleanedData.length,
      change: current.cleanedData.length - previous.cleanedData.length
    },
    changes,
    insights,
    summary: insights.length > 0
      ? `Key changes: ${insights.slice(0, 5).join('; ')}`
      : 'No significant changes detected between the two datasets.'
  };
}

module.exports = router;
