/**
 * Agent 6 - Data Analyzer
 *
 * Responsibilities:
 * - Calculate descriptive statistics for each numeric column
 * - Compute correlation matrix between numeric columns
 * - Detect outliers using the IQR method
 * - Analyze categorical distributions
 * - Generate human-readable insights with severity levels
 */

// ─── Statistical Utilities ──────────────────────────────────────────────────────

function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function standardDeviation(arr) {
  if (arr.length < 2) return 0;
  const avg = mean(arr);
  const sumSqDiff = arr.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0);
  return Math.sqrt(sumSqDiff / (arr.length - 1));
}

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (index - lower) * (sorted[upper] - sorted[lower]);
}

function correlation(x, y) {
  const n = x.length;
  if (n < 3) return 0;
  const mx = mean(x);
  const my = mean(y);
  const sx = standardDeviation(x);
  const sy = standardDeviation(y);
  if (sx === 0 || sy === 0) return 0;

  const sum = x.reduce((acc, xi, i) => acc + (xi - mx) * (y[i] - my), 0);
  return sum / ((n - 1) * sx * sy);
}

function skewness(arr) {
  const n = arr.length;
  if (n < 3) return 0;
  const avg = mean(arr);
  const std = standardDeviation(arr);
  if (std === 0) return 0;

  const m3 = arr.reduce((acc, v) => acc + Math.pow((v - avg) / std, 3), 0) / n;
  return m3;
}

function kurtosis(arr) {
  const n = arr.length;
  if (n < 4) return 0;
  const avg = mean(arr);
  const std = standardDeviation(arr);
  if (std === 0) return 0;

  const m4 = arr.reduce((acc, v) => acc + Math.pow((v - avg) / std, 4), 0) / n;
  return m4 - 3; // Excess kurtosis
}

// ─── Main Analysis Process ──────────────────────────────────────────────────────

function process(cleanResult) {
  const { cleanedData, columns, columnTypes } = cleanResult;
  const numericColumns = columns.filter(c => columnTypes[c] === 'numeric');
  const categoricalColumns = columns.filter(c => columnTypes[c] === 'categorical');

  // ── Descriptive Statistics ─────────────────────────────────────────────────
  const statistics = {};
  numericColumns.forEach(col => {
    const values = cleanedData.map(r => r[col]).filter(v => typeof v === 'number' && !isNaN(v));
    if (values.length === 0) return;

    const sorted = [...values].sort((a, b) => a - b);
    const q1 = percentile(values, 25);
    const q3 = percentile(values, 75);

    statistics[col] = {
      count: values.length,
      mean: parseFloat(mean(values).toFixed(4)),
      median: parseFloat(percentile(values, 50).toFixed(4)),
      std: parseFloat(standardDeviation(values).toFixed(4)),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      q1: parseFloat(q1.toFixed(4)),
      q3: parseFloat(q3.toFixed(4)),
      iqr: parseFloat((q3 - q1).toFixed(4)),
      range: parseFloat((sorted[sorted.length - 1] - sorted[0]).toFixed(4)),
      skewness: parseFloat(skewness(values).toFixed(4)),
      kurtosis: parseFloat(kurtosis(values).toFixed(4)),
      coeffOfVariation: mean(values) !== 0
        ? parseFloat((standardDeviation(values) / Math.abs(mean(values)) * 100).toFixed(2))
        : 0
    };
  });

  // ── Correlation Matrix ─────────────────────────────────────────────────────
  const correlations = {};
  numericColumns.forEach(col1 => {
    correlations[col1] = {};
    numericColumns.forEach(col2 => {
      if (col1 === col2) {
        correlations[col1][col2] = 1;
      } else {
        const x = cleanedData.map(r => r[col1]);
        const y = cleanedData.map(r => r[col2]);
        correlations[col1][col2] = parseFloat(correlation(x, y).toFixed(4));
      }
    });
  });

  // ── Outlier Detection (IQR Method) ─────────────────────────────────────────
  const outliers = {};
  numericColumns.forEach(col => {
    if (!statistics[col]) return;
    const q1 = statistics[col].q1;
    const q3 = statistics[col].q3;
    const iqr = statistics[col].iqr;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const outlierIndices = [];
    cleanedData.forEach((row, i) => {
      if (row[col] < lowerBound || row[col] > upperBound) {
        outlierIndices.push({ index: i, value: row[col] });
      }
    });

    outliers[col] = {
      count: outlierIndices.length,
      percentage: parseFloat(((outlierIndices.length / cleanedData.length) * 100).toFixed(2)),
      lowerBound: parseFloat(lowerBound.toFixed(4)),
      upperBound: parseFloat(upperBound.toFixed(4)),
      samples: outlierIndices.slice(0, 10)
    };
  });

  // ── Generate Insights ──────────────────────────────────────────────────────
  const insights = generateInsights(
    statistics, correlations, outliers, columnTypes, columns, cleanedData
  );

  return { statistics, correlations, outliers, insights };
}

// ─── Insight Generation ─────────────────────────────────────────────────────────

function generateInsights(statistics, correlations, outliers, columnTypes, columns, data) {
  const insights = [];
  const numericColumns = columns.filter(c => columnTypes[c] === 'numeric');
  const categoricalColumns = columns.filter(c => columnTypes[c] === 'categorical');

  // ── Correlation Insights ───────────────────────────────────────────────────
  const corrPairs = [];
  numericColumns.forEach((col1, i) => {
    numericColumns.forEach((col2, j) => {
      if (i < j) {
        corrPairs.push({ col1, col2, value: correlations[col1]?.[col2] || 0 });
      }
    });
  });
  corrPairs.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  corrPairs.slice(0, 5).forEach(pair => {
    const absVal = Math.abs(pair.value);
    if (absVal > 0.5) {
      const direction = pair.value > 0 ? 'positive' : 'negative';
      const strength = absVal > 0.8 ? 'Strong' : 'Moderate';
      insights.push({
        type: 'correlation',
        severity: absVal > 0.8 ? 'high' : 'medium',
        title: `${strength} ${direction} correlation found`,
        description: `"${pair.col1}" and "${pair.col2}" have a ${strength.toLowerCase()} ${direction} correlation (r = ${pair.value.toFixed(3)}). Changes in one variable tend to ${direction === 'positive' ? 'mirror' : 'oppose'} changes in the other.`,
        columns: [pair.col1, pair.col2],
        value: pair.value
      });
    }
  });

  // ── Outlier Insights ───────────────────────────────────────────────────────
  numericColumns.forEach(col => {
    if (!outliers[col]) return;
    const pct = outliers[col].percentage;
    if (pct > 2) {
      insights.push({
        type: 'outlier',
        severity: pct > 15 ? 'high' : pct > 5 ? 'medium' : 'low',
        title: `Outliers detected in "${col}"`,
        description: `${outliers[col].count} data points (${pct}%) fall outside the expected range [${outliers[col].lowerBound.toFixed(2)}, ${outliers[col].upperBound.toFixed(2)}]. These may indicate data quality issues or genuinely extreme values.`,
        columns: [col],
        value: pct
      });
    }
  });

  // ── Distribution Insights ──────────────────────────────────────────────────
  numericColumns.forEach(col => {
    if (!statistics[col]) return;
    const skew = statistics[col].skewness;
    if (Math.abs(skew) > 1) {
      const direction = skew > 0 ? 'right (positive)' : 'left (negative)';
      insights.push({
        type: 'distribution',
        severity: Math.abs(skew) > 2 ? 'medium' : 'low',
        title: `Skewed distribution in "${col}"`,
        description: `"${col}" shows ${direction} skew (${skew.toFixed(3)}). The data is not symmetrically distributed, which may affect statistical analyses.`,
        columns: [col],
        value: skew
      });
    }
  });

  // ── Variability Insights ───────────────────────────────────────────────────
  numericColumns.forEach(col => {
    if (!statistics[col]) return;
    const cv = statistics[col].coeffOfVariation;
    if (cv > 100) {
      insights.push({
        type: 'variability',
        severity: 'medium',
        title: `High variability in "${col}"`,
        description: `"${col}" has a coefficient of variation of ${cv.toFixed(1)}%, indicating values are widely spread relative to the mean.`,
        columns: [col],
        value: cv
      });
    }
  });

  // ── Categorical Insights ───────────────────────────────────────────────────
  categoricalColumns.forEach(col => {
    const values = data.map(r => r[col]);
    const freq = {};
    values.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    const uniqueCount = sorted.length;

    const topItem = sorted[0];
    const topPct = ((topItem[1] / values.length) * 100).toFixed(1);

    insights.push({
      type: 'categorical',
      severity: 'info',
      title: `"${col}" has ${uniqueCount} categories`,
      description: `Most common: "${topItem[0]}" (${topPct}% of data). ${uniqueCount > 10 ? 'High cardinality — consider grouping rare categories.' : ''}`,
      columns: [col],
      topCategories: sorted.slice(0, 6).map(([name, count]) => ({
        name,
        count,
        percentage: parseFloat(((count / values.length) * 100).toFixed(1))
      }))
    });
  });

  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2, info: 3 };
  insights.sort((a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4));

  return insights;
}

module.exports = { process };
