/**
 * Agent 9 - Report Generator
 *
 * Responsibilities:
 * - Combine outputs from all other agents
 * - Generate a structured, actionable report
 * - Include executive summary, data overview, key insights,
 *   predictions, and recommendations
 */

// ─── Main Report Generation ─────────────────────────────────────────────────────

function process(allResults) {
  const { filename, cleaning, analysis, visualizations, predictions, anomalies, memory } = allResults;

  const report = {
    title: `Data Analysis Report`,
    subtitle: filename,
    generatedAt: new Date().toISOString(),
    sections: []
  };

  // ── Executive Summary ──────────────────────────────────────────────────────
  report.sections.push({
    id: 'executive-summary',
    title: 'Executive Summary',
    icon: '📋',
    type: 'summary',
    content: generateExecutiveSummary(cleaning, analysis, predictions)
  });

  // ── Data Overview ──────────────────────────────────────────────────────────
  report.sections.push({
    id: 'data-overview',
    title: 'Data Overview',
    icon: '📁',
    type: 'overview',
    content: {
      description: `The dataset contains ${cleaning.summary.originalRows} records across ${cleaning.summary.totalColumns} columns, including ${cleaning.summary.numericColumns} numeric and ${cleaning.summary.categoricalColumns} categorical variables.`,
      metrics: [
        { label: 'Total Records', value: cleaning.summary.originalRows, icon: '📊' },
        { label: 'Total Columns', value: cleaning.summary.totalColumns, icon: '📋' },
        { label: 'Numeric Columns', value: cleaning.summary.numericColumns, icon: '🔢' },
        { label: 'Categorical Columns', value: cleaning.summary.categoricalColumns, icon: '🏷️' },
        { label: 'Date Columns', value: cleaning.summary.dateColumns, icon: '📅' }
      ],
      columnDetails: Object.entries(cleaning.columnTypes).map(([name, type]) => ({
        name,
        type,
        stats: analysis.statistics[name] || null
      }))
    }
  });

  // ── Data Quality ───────────────────────────────────────────────────────────
  report.sections.push({
    id: 'data-quality',
    title: 'Data Quality Assessment',
    icon: '✅',
    type: 'quality',
    content: {
      description: 'Assessment of data quality and cleaning actions performed.',
      qualityScore: cleaning.summary.dataQualityScore,
      actions: [
        {
          action: 'Missing Values Imputed',
          count: cleaning.summary.missingValuesFilled,
          status: cleaning.summary.missingValuesFilled > 0 ? 'warning' : 'good',
          detail: cleaning.summary.missingValuesFilled > 0
            ? `${cleaning.summary.missingValuesFilled} cells were filled using statistical imputation (median for numeric, mode for categorical).`
            : 'No missing values found — excellent data completeness.'
        },
        {
          action: 'Duplicates Removed',
          count: cleaning.summary.duplicatesRemoved,
          status: cleaning.summary.duplicatesRemoved > 0 ? 'warning' : 'good',
          detail: cleaning.summary.duplicatesRemoved > 0
            ? `${cleaning.summary.duplicatesRemoved} exact duplicate rows were identified and removed.`
            : 'No duplicate records found.'
        },
        {
          action: 'Clean Records Retained',
          count: cleaning.summary.cleanedRows,
          status: 'good',
          detail: `${cleaning.summary.cleanedRows} out of ${cleaning.summary.originalRows} records retained after cleaning (${((cleaning.summary.cleanedRows / cleaning.summary.originalRows) * 100).toFixed(1)}%).`
        }
      ]
    }
  });

  // ── Key Insights ───────────────────────────────────────────────────────────
  if (analysis.insights && analysis.insights.length > 0) {
    report.sections.push({
      id: 'key-insights',
      title: 'Key Insights',
      icon: '💡',
      type: 'insights',
      content: {
        description: `${analysis.insights.length} notable patterns and observations were discovered in the data.`,
        highPriority: analysis.insights.filter(i => i.severity === 'high').length,
        mediumPriority: analysis.insights.filter(i => i.severity === 'medium').length,
        insights: analysis.insights.map(insight => ({
          ...insight,
          icon: getInsightIcon(insight.type)
        }))
      }
    });
  }

  // ── Statistical Summary ────────────────────────────────────────────────────
  if (Object.keys(analysis.statistics).length > 0) {
    report.sections.push({
      id: 'statistics',
      title: 'Statistical Summary',
      icon: '📈',
      type: 'statistics',
      content: {
        description: 'Descriptive statistics for each numeric variable in the dataset.',
        columns: Object.entries(analysis.statistics).map(([name, stats]) => ({
          name,
          ...stats
        }))
      }
    });
  }

  // ── Predictions ────────────────────────────────────────────────────────────
  if (predictions.predictions && predictions.predictions.length > 0) {
    report.sections.push({
      id: 'predictions',
      title: 'Predictive Analysis',
      icon: '🔮',
      type: 'predictions',
      content: {
        description: predictions.summary,
        variables: predictions.predictions.map(pred => ({
          column: pred.column,
          trend: pred.trend,
          trendStrength: pred.trendStrength,
          rSquared: pred.regression.rSquared,
          volatility: pred.volatility,
          explanation: pred.explanation,
          nextValues: pred.futurePredictions.slice(0, 5)
        }))
      }
    });
  }

  // ── Anomaly Detection ──────────────────────────────────────────────────────
  if (anomalies && anomalies.summary) {
    report.sections.push({
      id: 'anomalies',
      title: 'Anomaly Detection',
      icon: '⚠️',
      type: 'insights',
      content: {
        description: `${anomalies.summary.totalAnomalies} anomalies detected across ${anomalies.summary.affectedColumns} columns. Data health score: ${anomalies.summary.healthScore}/100.`,
        highPriority: anomalies.summary.critical,
        mediumPriority: anomalies.summary.high,
        insights: (anomalies.topAnomalies || []).slice(0, 5).map(a => ({
          icon: a.severity === 'critical' ? '🔴' : '🟡',
          title: `${a.column}: ${a.label}`,
          severity: a.severity,
          description: `Value ${a.value} is ${a.zScore} standard deviations from mean (${a.deviation}% deviation)`
        }))
      }
    });
  }

  // ── Historical Comparison ──────────────────────────────────────────────────
  if (memory && memory.hasPrevious && memory.insights && memory.insights.length > 0) {
    report.sections.push({
      id: 'comparison',
      title: 'Historical Comparison',
      icon: '🧠',
      type: 'insights',
      content: {
        description: `Compared with previous upload "${memory.previousDataset?.filename}". ${memory.insights.length} change(s) detected.`,
        highPriority: memory.insights.filter(i => i.significance === 'high').length,
        mediumPriority: memory.insights.filter(i => i.significance === 'medium').length,
        insights: memory.insights.map(i => ({
          icon: i.icon,
          title: i.column || 'Dataset',
          severity: i.significance === 'high' ? 'high' : 'medium',
          description: i.text
        }))
      }
    });
  }

  // ── Recommendations ────────────────────────────────────────────────────────
  const recommendations = generateRecommendations(cleaning, analysis, predictions);
  report.sections.push({
    id: 'recommendations',
    title: 'Recommendations',
    icon: '🎯',
    type: 'recommendations',
    content: {
      description: 'Actionable next steps based on the analysis findings.',
      recommendations
    }
  });

  return report;
}

// ─── Executive Summary ──────────────────────────────────────────────────────────

function generateExecutiveSummary(cleaning, analysis, predictions) {
  const parts = [];

  parts.push(`This report analyzes a dataset of ${cleaning.summary.originalRows.toLocaleString()} records across ${cleaning.summary.totalColumns} variables (${cleaning.summary.numericColumns} numeric, ${cleaning.summary.categoricalColumns} categorical).`);

  // Data quality
  const qualityDescriptor =
    cleaning.summary.dataQualityScore >= 90 ? 'excellent' :
    cleaning.summary.dataQualityScore >= 70 ? 'good' :
    cleaning.summary.dataQualityScore >= 50 ? 'moderate' : 'poor';
  parts.push(`Data quality is ${qualityDescriptor} (score: ${cleaning.summary.dataQualityScore}/100).`);

  if (cleaning.summary.missingValuesFilled > 0 || cleaning.summary.duplicatesRemoved > 0) {
    const cleaningActions = [];
    if (cleaning.summary.missingValuesFilled > 0) {
      cleaningActions.push(`${cleaning.summary.missingValuesFilled} missing values were imputed`);
    }
    if (cleaning.summary.duplicatesRemoved > 0) {
      cleaningActions.push(`${cleaning.summary.duplicatesRemoved} duplicates were removed`);
    }
    parts.push(cleaningActions.join(' and ') + '.');
  }

  // Key findings
  const highSeverity = analysis.insights.filter(i => i.severity === 'high');
  if (highSeverity.length > 0) {
    parts.push(`⚠️ ${highSeverity.length} high-priority finding(s) require attention.`);
  }

  // Predictions summary
  if (predictions.predictions && predictions.predictions.length > 0) {
    const up = predictions.predictions.filter(p => p.trend === 'increasing').length;
    const down = predictions.predictions.filter(p => p.trend === 'decreasing').length;
    if (up > 0 || down > 0) {
      const trendParts = [];
      if (up > 0) trendParts.push(`${up} trending upward`);
      if (down > 0) trendParts.push(`${down} trending downward`);
      parts.push(`Predictive analysis reveals ${trendParts.join(' and ')}.`);
    }
  }

  return parts.join(' ');
}

// ─── Recommendations ────────────────────────────────────────────────────────────

function generateRecommendations(cleaning, analysis, predictions) {
  const recs = [];

  // Data quality recommendations
  const missingRatio = cleaning.summary.missingValuesFilled /
    (cleaning.summary.originalRows * cleaning.summary.totalColumns);

  if (missingRatio > 0.05) {
    recs.push({
      priority: 'high',
      icon: '🔴',
      title: 'Improve Data Collection',
      description: `${(missingRatio * 100).toFixed(1)}% of data cells were missing. Review data collection processes, validate input forms, and consider implementing required field constraints.`
    });
  }

  // Outlier recommendations
  const highOutliers = Object.entries(analysis.outliers || {})
    .filter(([, o]) => o.percentage > 10);
  if (highOutliers.length > 0) {
    recs.push({
      priority: 'high',
      icon: '🔴',
      title: 'Investigate Outliers',
      description: `${highOutliers.map(([c]) => `"${c}"`).join(', ')} have >10% outlier values. Verify whether these represent valid extreme cases or data entry errors.`
    });
  }

  // Strong correlation recommendations
  const strongCorr = (analysis.insights || [])
    .filter(i => i.type === 'correlation' && i.severity === 'high');
  if (strongCorr.length > 0) {
    recs.push({
      priority: 'medium',
      icon: '🟡',
      title: 'Leverage Strong Correlations',
      description: 'Highly correlated variables were detected. These relationships can be used for predictive modeling, but watch for multicollinearity in regression analyses.'
    });
  }

  // Prediction-based recommendations
  if (predictions.predictions) {
    const declining = predictions.predictions.filter(p => p.trend === 'decreasing');
    if (declining.length > 0) {
      recs.push({
        priority: 'medium',
        icon: '🟡',
        title: 'Address Declining Trends',
        description: `${declining.map(p => `"${p.column}"`).join(', ')} show downward trends. Investigate root causes and consider intervention strategies.`
      });
    }

    const volatile = predictions.predictions.filter(p => p.volatility > 0.5);
    if (volatile.length > 0) {
      recs.push({
        priority: 'medium',
        icon: '🟡',
        title: 'Monitor Volatile Metrics',
        description: `${volatile.map(p => `"${p.column}"`).join(', ')} exhibit high volatility. Increase monitoring frequency and set up alerts for anomalous values.`
      });
    }
  }

  // Skewness recommendation
  const skewedCols = (analysis.insights || [])
    .filter(i => i.type === 'distribution');
  if (skewedCols.length > 0) {
    recs.push({
      priority: 'low',
      icon: '🟢',
      title: 'Consider Data Transformation',
      description: `${skewedCols.length} column(s) have skewed distributions. Log or Box-Cox transformations may improve statistical modeling performance.`
    });
  }

  // Default positive recommendation
  if (recs.length === 0) {
    recs.push({
      priority: 'low',
      icon: '🟢',
      title: 'Data Quality is Strong',
      description: 'No critical issues detected. Continue monitoring and regularly reassess as new data comes in.'
    });
  }

  return recs;
}

// ─── Utility ────────────────────────────────────────────────────────────────────

function getInsightIcon(type) {
  const icons = {
    correlation: '🔗',
    outlier: '⚠️',
    distribution: '📊',
    variability: '📈',
    categorical: '🏷️'
  };
  return icons[type] || '💡';
}

module.exports = { process };
