/**
 * Agent Orchestrator - Smart controller that decides which agents to invoke
 * based on dataset characteristics. Makes the pipeline dynamic.
 */

function createExecutionPlan(cleanResult) {
  const { columns, columnTypes, cleanedData, summary } = cleanResult;

  const numericCols = columns.filter(c => columnTypes[c] === 'numeric');
  const categoricalCols = columns.filter(c => columnTypes[c] === 'categorical');
  const dateCols = columns.filter(c => columnTypes[c] === 'date');
  const rowCount = cleanedData.length;

  const plan = {
    agents: [],
    reasoning: [],
    optimizations: [],
    estimatedTime: 0
  };

  // Always run analyzer
  plan.agents.push({
    name: 'analyzer',
    priority: 1,
    reason: 'Core analysis is always required',
    config: { fullCorrelation: numericCols.length <= 20 }
  });
  plan.reasoning.push('✅ Analyzer: always needed for insights');

  // Anomaly detection — only if enough data
  if (rowCount >= 10 && numericCols.length > 0) {
    plan.agents.push({
      name: 'anomaly',
      priority: 2,
      reason: `${rowCount} rows with numeric data warrants anomaly detection`,
      config: { methods: rowCount > 100 ? ['zscore', 'changepoint'] : ['zscore'] }
    });
    plan.reasoning.push(`✅ Anomaly Detection: ${rowCount} rows with ${numericCols.length} numeric columns`);
  } else {
    plan.reasoning.push('⏭️ Anomaly Detection: skipped (too few rows or no numeric data)');
  }

  // Visualizer — always if there's data to visualize
  if (numericCols.length > 0 || categoricalCols.length > 0) {
    const chartLimit = numericCols.length > 10 ? 6 : 4;
    plan.agents.push({
      name: 'visualizer',
      priority: 3,
      reason: `${numericCols.length} numeric + ${categoricalCols.length} categorical columns`,
      config: { maxHistograms: chartLimit, maxScatters: 3, maxPies: Math.min(categoricalCols.length, 3) }
    });
    plan.reasoning.push(`✅ Visualizer: ${numericCols.length + categoricalCols.length} visualizable columns`);
  }

  // Predictor — only for numeric data with enough rows
  if (numericCols.length > 0 && rowCount >= 10) {
    plan.agents.push({
      name: 'predictor',
      priority: 4,
      reason: `${numericCols.length} numeric columns with ${rowCount} data points`,
      config: {
        maxColumns: Math.min(numericCols.length, 5),
        stepsAhead: rowCount > 100 ? 10 : 5,
        includeTimeSeries: dateCols.length > 0
      }
    });
    plan.reasoning.push(`✅ Predictor: sufficient data (${rowCount} rows)`);
  } else {
    plan.reasoning.push('⏭️ Predictor: skipped (insufficient data)');
  }

  // Reporter — always last
  plan.agents.push({
    name: 'reporter',
    priority: 10,
    reason: 'Report compilation always runs last',
    config: { includeAnomalies: plan.agents.some(a => a.name === 'anomaly') }
  });
  plan.reasoning.push('✅ Reporter: always runs last');

  // Performance optimizations
  if (rowCount > 5000) {
    plan.optimizations.push(`Large dataset (${rowCount} rows): sampling enabled for scatter plots`);
  }
  if (numericCols.length > 15) {
    plan.optimizations.push(`Many numeric columns (${numericCols.length}): limiting correlation pairs`);
  }

  // Sort by priority
  plan.agents.sort((a, b) => a.priority - b.priority);
  plan.estimatedTime = plan.agents.length * 0.5; // rough estimate in seconds

  return plan;
}

module.exports = { createExecutionPlan };
