/**
 * Export routes - Download cleaned data (CSV), analysis (JSON), and formatted report
 */
const express = require('express');
const { getStore } = require('../config/db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/export/:id/csv — download cleaned data as CSV
router.get('/:id/csv', optionalAuth, async (req, res, next) => {
  try {
    const store = getStore();
    const storedData = await store.getStoredData(req.params.id);
    if (!storedData) return res.status(404).json({ success: false, error: 'Dataset not found' });

    const { cleanedData, columns } = storedData;

    // Build CSV manually (no dependency needed)
    const escapeCSV = (val) => {
      const str = val === null || val === undefined ? '' : String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const header = columns.map(escapeCSV).join(',');
    const rows = cleanedData.map(row => columns.map(col => escapeCSV(row[col])).join(','));
    const csv = [header, ...rows].join('\n');

    const dataset = await store.getDataset(req.params.id);
    const filename = dataset?.filename?.replace('.csv', '') || 'data';

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}_cleaned.csv"`);
    res.send(csv);
  } catch (error) { next(error); }
});

// GET /api/export/:id/json — download full analysis as JSON
router.get('/:id/json', optionalAuth, async (req, res, next) => {
  try {
    const store = getStore();
    const dataset = await store.getDataset(req.params.id);
    if (!dataset) return res.status(404).json({ success: false, error: 'Dataset not found' });

    const analysis = await store.getAnalysis(req.params.id);
    const prediction = await store.getPrediction(req.params.id);
    const anomalies = await store.getAnomalies(req.params.id);
    const report = await store.getReport(req.params.id);

    const exportData = {
      metadata: {
        filename: dataset.filename,
        exportedAt: new Date().toISOString(),
        originalRows: dataset.originalRowCount || dataset.original_row_count,
        cleanedRows: dataset.cleanedRowCount || dataset.cleaned_row_count
      },
      analysis: analysis ? { statistics: analysis.statistics, correlations: analysis.correlations, outliers: analysis.outliers, insights: analysis.insights } : null,
      predictions: prediction ? { predictions: prediction.predictions, summary: prediction.summary } : null,
      anomalies: anomalies?.anomalies || null,
      report: report?.report || null
    };

    const filename = dataset.filename?.replace('.csv', '') || 'analysis';
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}_analysis.json"`);
    res.json(exportData);
  } catch (error) { next(error); }
});

// GET /api/export/:id/report — download formatted text report
router.get('/:id/report', optionalAuth, async (req, res, next) => {
  try {
    const store = getStore();
    const reportData = await store.getReport(req.params.id);
    const dataset = await store.getDataset(req.params.id);
    if (!reportData || !dataset) return res.status(404).json({ success: false, error: 'Report not found' });

    const report = reportData.report;
    const lines = [];

    lines.push('═'.repeat(70));
    lines.push(`  ${report.title || 'Data Analysis Report'}`);
    lines.push(`  ${report.subtitle || dataset.filename}`);
    lines.push(`  Generated: ${new Date(report.generatedAt).toLocaleString()}`);
    lines.push('═'.repeat(70));
    lines.push('');

    (report.sections || []).forEach(section => {
      lines.push(`${section.icon || '•'} ${section.title}`);
      lines.push('─'.repeat(50));

      if (typeof section.content === 'string') {
        lines.push(section.content);
      } else if (section.content?.description) {
        lines.push(section.content.description);
      }

      if (section.content?.metrics) {
        section.content.metrics.forEach(m => {
          lines.push(`  ${m.icon || '•'} ${m.label}: ${m.value}`);
        });
      }

      if (section.content?.actions) {
        section.content.actions.forEach(a => {
          lines.push(`  [${a.status === 'good' ? '✓' : '!'}] ${a.action}: ${a.count} — ${a.detail}`);
        });
      }

      if (section.content?.insights) {
        section.content.insights.forEach(ins => {
          lines.push(`  [${ins.severity}] ${ins.title}`);
          lines.push(`    ${ins.description}`);
        });
      }

      if (section.content?.recommendations) {
        section.content.recommendations.forEach(rec => {
          lines.push(`  ${rec.icon || '•'} [${rec.priority}] ${rec.title}`);
          lines.push(`    ${rec.description}`);
        });
      }

      if (section.content?.columns && section.type === 'statistics') {
        const cols = section.content.columns;
        lines.push(`  ${'Column'.padEnd(20)} ${'Mean'.padStart(12)} ${'Median'.padStart(12)} ${'Std'.padStart(12)} ${'Min'.padStart(12)} ${'Max'.padStart(12)}`);
        lines.push(`  ${'─'.repeat(80)}`);
        cols.forEach(c => {
          lines.push(`  ${(c.name || '').padEnd(20)} ${(c.mean?.toFixed(2) || '').padStart(12)} ${(c.median?.toFixed(2) || '').padStart(12)} ${(c.std?.toFixed(2) || '').padStart(12)} ${(c.min?.toFixed(2) || '').padStart(12)} ${(c.max?.toFixed(2) || '').padStart(12)}`);
        });
      }

      lines.push('');
    });

    lines.push('═'.repeat(70));
    lines.push('  Report generated by DataFlow AI Pipeline');
    lines.push('═'.repeat(70));

    const filename = dataset.filename?.replace('.csv', '') || 'report';
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}_report.txt"`);
    res.send(lines.join('\n'));
  } catch (error) { next(error); }
});

module.exports = router;
