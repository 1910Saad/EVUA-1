/**
 * Agent 7 - Data Visualizer
 *
 * Responsibilities:
 * - Determine the best chart types based on data characteristics
 * - Generate Recharts-compatible chart configurations
 * - Create histograms, scatter plots, bar charts, pie charts, line charts
 * - Return chart specs that the frontend can render directly
 */

const COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd',
  '#10b981', '#06b6d4', '#f59e0b', '#ef4444',
  '#ec4899', '#14b8a6'
];

// ─── Main Visualization Process ─────────────────────────────────────────────────

function process(cleanResult, analysisResult) {
  const { cleanedData, columns, columnTypes } = cleanResult;
  const { statistics, correlations } = analysisResult;

  const numericColumns = columns.filter(c => columnTypes[c] === 'numeric');
  const categoricalColumns = columns.filter(c => columnTypes[c] === 'categorical');
  const charts = [];

  // ── 1. Numeric Overview Bar Chart ──────────────────────────────────────────
  if (numericColumns.length > 0) {
    charts.push({
      id: 'overview-bar',
      type: 'bar',
      title: 'Numeric Columns — Mean & Median',
      description: 'Comparison of central tendency across all numeric columns',
      data: numericColumns.map(col => ({
        name: col.length > 15 ? col.slice(0, 12) + '...' : col,
        fullName: col,
        Mean: parseFloat(statistics[col]?.mean?.toFixed(2) ?? 0),
        Median: parseFloat(statistics[col]?.median?.toFixed(2) ?? 0)
      })),
      xKey: 'name',
      yKeys: ['Mean', 'Median'],
      colors: ['#6366f1', '#8b5cf6']
    });
  }

  // ── 2. Distribution Histograms ─────────────────────────────────────────────
  numericColumns.slice(0, 4).forEach((col, idx) => {
    const values = cleanedData.map(r => r[col]).filter(v => typeof v === 'number' && !isNaN(v));
    if (values.length < 2) return;

    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const range = max - min;
    if (range === 0) return;

    const bucketCount = Math.min(20, Math.max(5, Math.ceil(Math.sqrt(values.length))));
    const bucketSize = range / bucketCount;

    const histogram = Array.from({ length: bucketCount }, (_, i) => ({
      range: parseFloat((min + (i + 0.5) * bucketSize).toFixed(2)),
      label: `${(min + i * bucketSize).toFixed(1)}`,
      Count: 0
    }));

    values.forEach(v => {
      const idx = Math.min(Math.floor((v - min) / bucketSize), bucketCount - 1);
      histogram[idx].Count++;
    });

    charts.push({
      id: `histogram-${col}`,
      type: 'histogram',
      title: `Distribution of ${col}`,
      description: `Frequency distribution (${values.length} values, range: ${min.toFixed(1)} – ${max.toFixed(1)})`,
      data: histogram,
      xKey: 'label',
      yKeys: ['Count'],
      colors: [COLORS[idx % COLORS.length]]
    });
  });

  // ── 3. Scatter Plots for Top Correlations ──────────────────────────────────
  if (numericColumns.length >= 2) {
    const corrPairs = [];
    numericColumns.forEach((col1, i) => {
      numericColumns.forEach((col2, j) => {
        if (i < j) {
          const corr = correlations[col1]?.[col2] ?? 0;
          if (Math.abs(corr) > 0.3) {
            corrPairs.push({ col1, col2, corr });
          }
        }
      });
    });
    corrPairs.sort((a, b) => Math.abs(b.corr) - Math.abs(a.corr));

    corrPairs.slice(0, 3).forEach((pair, idx) => {
      // Sample data points for performance
      const step = Math.max(1, Math.floor(cleanedData.length / 150));
      const sampleData = cleanedData
        .filter((_, i) => i % step === 0)
        .slice(0, 150)
        .map(r => ({
          x: r[pair.col1],
          y: r[pair.col2]
        }))
        .filter(d => typeof d.x === 'number' && typeof d.y === 'number');

      charts.push({
        id: `scatter-${pair.col1}-${pair.col2}`,
        type: 'scatter',
        title: `${pair.col1} vs ${pair.col2}`,
        description: `Correlation: r = ${pair.corr.toFixed(3)} (${Math.abs(pair.corr) > 0.7 ? 'strong' : 'moderate'})`,
        data: sampleData,
        xKey: 'x',
        yKey: 'y',
        xLabel: pair.col1,
        yLabel: pair.col2,
        colors: [COLORS[idx + 4]]
      });
    });
  }

  // ── 4. Pie Charts for Categorical Columns ─────────────────────────────────
  categoricalColumns.slice(0, 3).forEach(col => {
    const freq = {};
    cleanedData.forEach(r => {
      const val = r[col]?.toString() || 'Unknown';
      freq[val] = (freq[val] || 0) + 1;
    });

    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    const topN = sorted.slice(0, 7);
    const otherCount = sorted.slice(7).reduce((sum, [, c]) => sum + c, 0);

    const pieData = topN.map(([name, count]) => ({
      name: name.length > 20 ? name.slice(0, 17) + '...' : name,
      value: count,
      percentage: parseFloat(((count / cleanedData.length) * 100).toFixed(1))
    }));

    if (otherCount > 0) {
      pieData.push({
        name: 'Other',
        value: otherCount,
        percentage: parseFloat(((otherCount / cleanedData.length) * 100).toFixed(1))
      });
    }

    charts.push({
      id: `pie-${col}`,
      type: 'pie',
      title: `${col} Breakdown`,
      description: `Category distribution (${sorted.length} unique values)`,
      data: pieData,
      colors: COLORS
    });
  });

  // ── 5. Trend Line Chart ────────────────────────────────────────────────────
  if (numericColumns.length >= 1) {
    const primaryCol = numericColumns[0];
    const secondaryCol = numericColumns.length > 1 ? numericColumns[1] : null;
    const sampleSize = Math.min(80, cleanedData.length);
    const step = Math.max(1, Math.floor(cleanedData.length / sampleSize));

    const lineData = cleanedData
      .filter((_, i) => i % step === 0)
      .slice(0, sampleSize)
      .map((r, i) => {
        const point = { index: i + 1 };
        point[primaryCol] = r[primaryCol];
        if (secondaryCol) point[secondaryCol] = r[secondaryCol];
        return point;
      });

    const yKeys = [primaryCol];
    const colors = ['#6366f1'];
    if (secondaryCol) {
      yKeys.push(secondaryCol);
      colors.push('#10b981');
    }

    charts.push({
      id: 'trend-line',
      type: 'line',
      title: 'Data Trend Overview',
      description: `Sequential values showing overall trend patterns`,
      data: lineData,
      xKey: 'index',
      yKeys,
      colors
    });
  }

  // ── 6. Box Plot Summary Data ───────────────────────────────────────────────
  if (numericColumns.length > 0) {
    const boxData = numericColumns.map(col => ({
      name: col.length > 12 ? col.slice(0, 9) + '...' : col,
      fullName: col,
      min: statistics[col]?.min ?? 0,
      q1: statistics[col]?.q1 ?? 0,
      median: statistics[col]?.median ?? 0,
      q3: statistics[col]?.q3 ?? 0,
      max: statistics[col]?.max ?? 0,
      outliers: cleanResult?.outliers?.[col]?.count ?? 0
    }));

    charts.push({
      id: 'box-summary',
      type: 'boxplot',
      title: 'Statistical Spread Summary',
      description: 'Min, Q1, Median, Q3, and Max for each numeric column',
      data: boxData,
      colors: ['#6366f1']
    });
  }

  return { charts };
}

module.exports = { process };
