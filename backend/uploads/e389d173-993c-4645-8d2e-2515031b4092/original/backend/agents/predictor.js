/**
 * Agent 8 - Predictor
 *
 * Responsibilities:
 * - Perform linear regression on numeric columns
 * - Calculate moving averages
 * - Detect trends (increasing, decreasing, stable)
 * - Generate future predictions with confidence intervals
 * - Provide human-readable explanations
 */

// ─── Statistical Utilities ──────────────────────────────────────────────────────

function linearRegression(x, y) {
  const n = x.length;
  if (n < 2) return { slope: 0, intercept: y[0] || 0, rSquared: 0 };

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, rSquared: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared (coefficient of determination)
  const meanY = sumY / n;
  const ssRes = y.reduce((acc, yi, i) => acc + Math.pow(yi - (slope * x[i] + intercept), 2), 0);
  const ssTot = y.reduce((acc, yi) => acc + Math.pow(yi - meanY, 2), 0);
  const rSquared = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);

  // Standard error of estimate
  const standardError = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0;

  return { slope, intercept, rSquared, standardError };
}

function movingAverage(values, windowSize = 5) {
  const result = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = values.slice(start, i + 1);
    result.push(window.reduce((a, b) => a + b, 0) / window.length);
  }
  return result;
}

function exponentialMovingAverage(values, alpha = 0.3) {
  const result = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

// ─── Main Prediction Process ────────────────────────────────────────────────────

function process(cleanResult) {
  const { cleanedData, columns, columnTypes } = cleanResult;
  const numericColumns = columns.filter(c => columnTypes[c] === 'numeric');

  if (numericColumns.length === 0) {
    return {
      predictions: [],
      summary: 'No numeric columns available for prediction.'
    };
  }

  const predictions = numericColumns.slice(0, 5).map(col => {
    const values = cleanedData.map(r => r[col]).filter(v => typeof v === 'number' && !isNaN(v));
    if (values.length < 3) return null;

    const x = values.map((_, i) => i);

    // Linear regression
    const reg = linearRegression(x, values);

    // Moving averages
    const ma5 = movingAverage(values, 5);
    const ema = exponentialMovingAverage(values, 0.3);

    // Determine trend
    const trend = detectTrend(values, reg);

    // Generate future predictions
    const n = values.length;
    const stepsAhead = Math.min(10, Math.max(3, Math.floor(n * 0.1)));

    const futurePredictions = Array.from({ length: stepsAhead }, (_, i) => {
      const futureX = n + i;
      const predicted = reg.slope * futureX + reg.intercept;

      // Prediction interval widens with distance from data
      const distanceFactor = 1 + (i / stepsAhead) * 0.5;
      const interval = 1.96 * reg.standardError * distanceFactor;

      // Confidence decreases with distance
      const baseConfidence = Math.min(95, reg.rSquared * 100);
      const confidence = Math.max(20, baseConfidence - (i * 5));

      return {
        step: n + i + 1,
        label: `+${i + 1}`,
        predicted: parseFloat(predicted.toFixed(4)),
        lower: parseFloat((predicted - interval).toFixed(4)),
        upper: parseFloat((predicted + interval).toFixed(4)),
        confidence: parseFloat(confidence.toFixed(1))
      };
    });

    // Historical data (last 30 points for chart)
    const historyLength = Math.min(30, values.length);
    const historicalData = values.slice(-historyLength).map((v, i) => ({
      step: values.length - historyLength + i + 1,
      actual: parseFloat(v.toFixed(4)),
      trend: parseFloat((reg.slope * (values.length - historyLength + i) + reg.intercept).toFixed(4)),
      ma: parseFloat(ma5.slice(-historyLength)[i]?.toFixed(4) ?? v.toFixed(4))
    }));

    // Volatility
    const meanVal = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((a, v) => a + Math.pow(v - meanVal, 2), 0) / values.length);
    const volatility = meanVal !== 0 ? Math.abs(std / meanVal) : 0;

    return {
      column: col,
      trend: trend.direction,
      trendStrength: trend.strength,
      regression: {
        slope: parseFloat(reg.slope.toFixed(6)),
        intercept: parseFloat(reg.intercept.toFixed(4)),
        rSquared: parseFloat(reg.rSquared.toFixed(4)),
        standardError: parseFloat(reg.standardError.toFixed(4))
      },
      volatility: parseFloat(volatility.toFixed(4)),
      historicalData,
      futurePredictions,
      explanation: generateExplanation(col, trend, reg, volatility, futurePredictions, values)
    };
  }).filter(Boolean);

  const increasing = predictions.filter(p => p.trend === 'increasing').length;
  const decreasing = predictions.filter(p => p.trend === 'decreasing').length;
  const stable = predictions.filter(p => p.trend === 'stable').length;

  return {
    predictions,
    summary: `Analyzed ${predictions.length} numeric column(s): ${increasing} trending up, ${decreasing} trending down, ${stable} stable.`
  };
}

// ─── Trend Detection ────────────────────────────────────────────────────────────

function detectTrend(values, regression) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const relativeSlope = mean !== 0 ? Math.abs(regression.slope / mean) : Math.abs(regression.slope);

  let direction = 'stable';
  let strength = 'none';

  if (relativeSlope > 0.001 && regression.rSquared > 0.05) {
    direction = regression.slope > 0 ? 'increasing' : 'decreasing';
    if (relativeSlope > 0.05) strength = 'strong';
    else if (relativeSlope > 0.01) strength = 'moderate';
    else strength = 'weak';
  }

  return { direction, strength };
}

// ─── Explanation Generation ─────────────────────────────────────────────────────

function generateExplanation(column, trend, regression, volatility, predictions, values) {
  const parts = [];

  // Trend description
  if (trend.direction === 'stable') {
    parts.push(`"${column}" shows no significant directional trend, remaining relatively stable.`);
  } else {
    parts.push(`"${column}" shows a ${trend.strength} ${trend.direction} trend.`);
  }

  // Model fit
  const r2Pct = (regression.rSquared * 100).toFixed(1);
  if (regression.rSquared > 0.7) {
    parts.push(`The linear model captures ${r2Pct}% of the variance — a strong fit, meaning predictions should be reliable.`);
  } else if (regression.rSquared > 0.4) {
    parts.push(`The linear model captures ${r2Pct}% of the variance — a moderate fit. Some non-linear patterns may not be captured.`);
  } else {
    parts.push(`The linear model captures only ${r2Pct}% of the variance, suggesting significant non-linearity or randomness.`);
  }

  // Volatility assessment
  if (volatility > 0.5) {
    parts.push('High volatility is present — exercise caution with predictions.');
  } else if (volatility > 0.2) {
    parts.push('Moderate volatility detected — predictions carry some uncertainty.');
  } else {
    parts.push('Low volatility suggests relatively stable behavior.');
  }

  // Prediction summary
  if (predictions.length > 0) {
    const firstPred = predictions[0];
    const lastPred = predictions[predictions.length - 1];
    const change = ((lastPred.predicted - values[values.length - 1]) / Math.abs(values[values.length - 1] || 1) * 100).toFixed(1);
    parts.push(`Projected ${predictions.length}-step change: ${change > 0 ? '+' : ''}${change}%.`);
  }

  return parts.join(' ');
}

module.exports = { process };
