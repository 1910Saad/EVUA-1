/**
 * Chat with Data - Natural language query engine.
 * Parses questions, identifies intent, executes data operations, returns answers.
 */
import express from 'express';
import { v4: uuidv4 } from 'uuid';
import { getStore } from '../config/db';
import { optionalAuth } from '../middleware/auth';

const router = express.Router();

// POST /api/chat
router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const { datasetId, question } = req.body;
    if (!datasetId || !question) {
      return res.status(400).json({ success: false, error: 'datasetId and question are required' });
    }

    const store = getStore();
    const storedData = await store.getStoredData(datasetId);
    if (!storedData) {
      return res.status(404).json({ success: false, error: 'Dataset not found. Please upload first.' });
    }

    const { cleanedData, columns, columnTypes, statistics, correlations } = storedData;
    const engine = new ChatEngine(cleanedData, columns, columnTypes, statistics, correlations);
    const answer = engine.answer(question);

    // Save chat history
    await store.insertChatMessage({
      id: uuidv4(),
      datasetId,
      userId: req.user?.id || null,
      question,
      answer
    });

    res.json({ success: true, answer });
  } catch (error) { next(error); }
});

// GET /api/chat/:datasetId/history
router.get('/:datasetId/history', optionalAuth, async (req, res, next) => {
  try {
    const store = getStore();
    const history = await store.getChatHistory(req.params.datasetId);
    res.json({ success: true, history });
  } catch (error) { next(error); }
});

// ─── Chat Engine ────────────────────────────────────────────────────────────────

class ChatEngine {
  constructor(data, columns, columnTypes, statistics, correlations) {
    this.data = data;
    this.columns = columns;
    this.columnTypes = columnTypes;
    this.stats = statistics || {};
    this.correlations = correlations || {};
    this.numericCols = columns.filter(c => columnTypes[c] === 'numeric');
    this.categoricalCols = columns.filter(c => columnTypes[c] === 'categorical');
  }

  answer(question) {
    const q = question.toLowerCase().trim();
    const intent = this.detectIntent(q);
    const cols = this.findRelevantColumns(q);

    try {
      switch (intent) {
        case 'aggregate': return this.handleAggregate(q, cols);
        case 'top_n': return this.handleTopN(q, cols);
        case 'compare': return this.handleCompare(q, cols);
        case 'why': return this.handleWhy(q, cols);
        case 'correlation': return this.handleCorrelation(q, cols);
        case 'distribution': return this.handleDistribution(q, cols);
        case 'outlier': return this.handleOutliers(q, cols);
        case 'count': return this.handleCount(q, cols);
        case 'filter': return this.handleFilter(q, cols);
        case 'trend': return this.handleTrend(q, cols);
        case 'predict': return this.handlePredict(q, cols);
        default: return this.handleGeneral(q, cols);
      }
    } catch (e) {
      return { text: `I couldn't process that query. Try asking about specific columns like: ${this.columns.slice(0, 4).join(', ')}`, type: 'error' };
    }
  }

  detectIntent(q) {
    if (/\b(average|mean|avg|median|sum|total)\b/.test(q)) return 'aggregate';
    if (/\b(max|maximum|highest|top \d|best|most|largest|biggest)\b/.test(q)) return 'top_n';
    if (/\b(min|minimum|lowest|bottom \d|worst|least|smallest)\b/.test(q)) return 'top_n';
    if (/\b(compare|vs|versus|difference|across|between)\b/.test(q)) return 'compare';
    if (/\b(why|reason|cause|explain|due to|because|drop|increase|decline|spike|change)\b/.test(q)) return 'why';
    if (/\b(correlat|relationship|related|affect|impact|influence)\b/.test(q)) return 'correlation';
    if (/\b(distribution|spread|histogram|range|variance)\b/.test(q)) return 'distribution';
    if (/\b(outlier|unusual|anomal|strange|weird|abnormal)\b/.test(q)) return 'outlier';
    if (/\b(count|how many|number of|total records)\b/.test(q)) return 'count';
    if (/\b(filter|where|when|only|show me|find)\b/.test(q)) return 'filter';
    if (/\b(trend|over time|growth|pattern|direction)\b/.test(q)) return 'trend';
    if (/\b(predict|forecast|future|expect|next|will)\b/.test(q)) return 'predict';
    return 'general';
  }

  findRelevantColumns(q) {
    return this.columns.filter(col => q.includes(col.toLowerCase()));
  }

  // ── Aggregate Handler ───────────────────────────────────────────────────────
  handleAggregate(q, cols) {
    const targetCols = cols.length > 0 ? cols.filter(c => this.numericCols.includes(c)) : this.numericCols;
    if (targetCols.length === 0) {
      return { text: `No numeric columns found to aggregate. Available: ${this.numericCols.join(', ')}`, type: 'info' };
    }

    let aggType = 'mean';
    if (/median/.test(q)) aggType = 'median';
    else if (/sum|total/.test(q)) aggType = 'sum';

    const results = targetCols.map(col => {
      const values = this.data.map(r => r[col]).filter(v => typeof v === 'number');
      let value;
      if (aggType === 'mean') value = values.reduce((a, b) => a + b, 0) / values.length;
      else if (aggType === 'median') {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        value = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      } else if (aggType === 'sum') value = values.reduce((a, b) => a + b, 0);
      return { column: col, value: parseFloat(value.toFixed(2)), aggType };
    });

    const summary = results.map(r => `**${r.column}**: ${r.value.toLocaleString()}`).join('\n');
    return {
      text: `📊 **${aggType.charAt(0).toUpperCase() + aggType.slice(1)}** values:\n\n${summary}`,
      type: 'aggregate',
      data: results,
      chart: {
        type: 'bar',
        data: results.map(r => ({ name: r.column, value: r.value })),
        xKey: 'name', yKeys: ['value'], colors: ['#6366f1']
      }
    };
  }

  // ── Top N Handler ───────────────────────────────────────────────────────────
  handleTopN(q, cols) {
    const nMatch = q.match(/\b(top|bottom|best|worst)\s+(\d+)\b/);
    const n = nMatch ? parseInt(nMatch[2]) : 5;
    const isBottom = /bottom|worst|lowest|least|min|smallest/.test(q);

    const numCol = cols.find(c => this.numericCols.includes(c)) || this.numericCols[0];
    if (!numCol) return { text: 'No numeric column found for ranking.', type: 'info' };

    const labelCol = this.categoricalCols[0] || this.columns.find(c => c !== numCol) || null;

    const sorted = [...this.data]
      .sort((a, b) => isBottom ? a[numCol] - b[numCol] : b[numCol] - a[numCol])
      .slice(0, n);

    const rows = sorted.map((r, i) => {
      const label = labelCol ? r[labelCol] : `Row ${i + 1}`;
      return `${i + 1}. **${label}** — ${numCol}: ${typeof r[numCol] === 'number' ? r[numCol].toLocaleString() : r[numCol]}`;
    });

    return {
      text: `🏆 **${isBottom ? 'Bottom' : 'Top'} ${n}** by ${numCol}:\n\n${rows.join('\n')}`,
      type: 'ranking',
      data: sorted,
      chart: {
        type: 'bar',
        data: sorted.map(r => ({
          name: labelCol ? (r[labelCol]?.toString().slice(0, 15) || '—') : `#${sorted.indexOf(r) + 1}`,
          [numCol]: r[numCol]
        })),
        xKey: 'name', yKeys: [numCol], colors: [isBottom ? '#ef4444' : '#10b981']
      }
    };
  }

  // ── Compare Handler ─────────────────────────────────────────────────────────
  handleCompare(q, cols) {
    const groupCol = cols.find(c => this.categoricalCols.includes(c)) || this.categoricalCols[0];
    const metricCol = cols.find(c => this.numericCols.includes(c)) || this.numericCols[0];

    if (!groupCol || !metricCol) {
      return { text: `Need a categorical column to group by and a numeric column to measure. Available: ${this.categoricalCols.join(', ')} / ${this.numericCols.join(', ')}`, type: 'info' };
    }

    const groups = {};
    this.data.forEach(row => {
      const key = row[groupCol]?.toString() || 'Unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(row[metricCol]);
    });

    const comparison = Object.entries(groups).map(([name, values]) => ({
      name,
      count: values.length,
      mean: parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)),
      min: Math.min(...values),
      max: Math.max(...values)
    })).sort((a, b) => b.mean - a.mean);

    const lines = comparison.map(g =>
      `**${g.name}** (n=${g.count}): avg=${g.mean.toLocaleString()}, range=[${g.min.toLocaleString()}, ${g.max.toLocaleString()}]`
    );

    return {
      text: `📊 **${metricCol}** compared across **${groupCol}**:\n\n${lines.join('\n')}`,
      type: 'comparison',
      data: comparison,
      chart: {
        type: 'bar',
        data: comparison.map(g => ({ name: g.name, Average: g.mean, Min: g.min, Max: g.max })),
        xKey: 'name', yKeys: ['Average', 'Min', 'Max'], colors: ['#6366f1', '#06b6d4', '#f59e0b']
      }
    };
  }

  // ── Why / Root Cause Handler ────────────────────────────────────────────────
  handleWhy(q, cols) {
    const numCol = cols.find(c => this.numericCols.includes(c)) || this.numericCols[0];
    if (!numCol) return { text: 'No numeric column found for analysis.', type: 'info' };

    const values = this.data.map(r => r[numCol]);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    // Find which categorical columns best explain variance
    const explanations = [];
    this.categoricalCols.forEach(catCol => {
      const groups = {};
      this.data.forEach(row => {
        const key = row[catCol]?.toString() || 'Unknown';
        if (!groups[key]) groups[key] = [];
        groups[key].push(row[numCol]);
      });

      const groupStats = Object.entries(groups).map(([name, vals]) => ({
        name,
        mean: vals.reduce((a, b) => a + b, 0) / vals.length,
        count: vals.length
      })).sort((a, b) => b.mean - a.mean);

      const highGroup = groupStats[0];
      const lowGroup = groupStats[groupStats.length - 1];
      const spread = highGroup.mean - lowGroup.mean;
      const relativeSpread = mean !== 0 ? Math.abs(spread / mean) : 0;

      if (relativeSpread > 0.1 && groupStats.length > 1) {
        explanations.push({
          factor: catCol,
          spread: parseFloat(spread.toFixed(2)),
          relativeImpact: parseFloat((relativeSpread * 100).toFixed(1)),
          highGroup: highGroup.name,
          highMean: parseFloat(highGroup.mean.toFixed(2)),
          lowGroup: lowGroup.name,
          lowMean: parseFloat(lowGroup.mean.toFixed(2)),
          detail: `"${catCol}" explains variation: "${highGroup.name}" averages ${highGroup.mean.toFixed(0)} vs "${lowGroup.name}" at ${lowGroup.mean.toFixed(0)} (${(relativeSpread * 100).toFixed(1)}% difference)`
        });
      }
    });

    // Correlation-based explanations
    const corrExplanations = [];
    this.numericCols.forEach(otherCol => {
      if (otherCol === numCol) return;
      const corr = this.correlations[numCol]?.[otherCol];
      if (corr && Math.abs(corr) > 0.4) {
        const direction = corr > 0 ? 'positively' : 'negatively';
        corrExplanations.push({
          factor: otherCol,
          correlation: corr,
          detail: `"${otherCol}" is ${direction} correlated (r=${corr.toFixed(3)}) — changes in ${otherCol} ${direction === 'positively' ? 'mirror' : 'oppose'} changes in ${numCol}`
        });
      }
    });

    explanations.sort((a, b) => b.relativeImpact - a.relativeImpact);
    corrExplanations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

    let text = `🔍 **Root cause analysis for "${numCol}"** (overall mean: ${mean.toFixed(2)}):\n\n`;
    if (explanations.length > 0) {
      text += `**Key factors:**\n${explanations.slice(0, 3).map(e => `• ${e.detail}`).join('\n')}\n\n`;
    }
    if (corrExplanations.length > 0) {
      text += `**Correlated variables:**\n${corrExplanations.slice(0, 3).map(e => `• ${e.detail}`).join('\n')}`;
    }
    if (explanations.length === 0 && corrExplanations.length === 0) {
      text += 'No strong contributing factors identified. The variation may be due to random noise or unmeasured variables.';
    }

    return { text, type: 'root_cause', explanations, corrExplanations };
  }

  // ── Correlation Handler ─────────────────────────────────────────────────────
  handleCorrelation(q, cols) {
    const targetCols = cols.filter(c => this.numericCols.includes(c));
    if (targetCols.length < 2) {
      // Show correlation matrix for all
      const pairs = [];
      this.numericCols.forEach((c1, i) => {
        this.numericCols.forEach((c2, j) => {
          if (i < j) {
            const corr = this.correlations[c1]?.[c2] || 0;
            if (Math.abs(corr) > 0.2) pairs.push({ col1: c1, col2: c2, corr });
          }
        });
      });
      pairs.sort((a, b) => Math.abs(b.corr) - Math.abs(a.corr));

      const lines = pairs.slice(0, 8).map(p => {
        const strength = Math.abs(p.corr) > 0.7 ? '🔴 Strong' : Math.abs(p.corr) > 0.4 ? '🟡 Moderate' : '🟢 Weak';
        return `${strength}: ${p.col1} ↔ ${p.col2} (r=${p.corr.toFixed(3)})`;
      });

      return { text: `🔗 **Top correlations:**\n\n${lines.join('\n')}`, type: 'correlation', data: pairs };
    }

    const corr = this.correlations[targetCols[0]]?.[targetCols[1]] || 0;
    const strength = Math.abs(corr) > 0.7 ? 'strong' : Math.abs(corr) > 0.4 ? 'moderate' : 'weak';
    const direction = corr > 0 ? 'positive' : 'negative';

    const scatterData = this.data.slice(0, 100).map(r => ({ x: r[targetCols[0]], y: r[targetCols[1]] }));

    return {
      text: `🔗 "${targetCols[0]}" and "${targetCols[1]}" have a **${strength} ${direction}** correlation (r = ${corr.toFixed(3)}).`,
      type: 'correlation',
      chart: { type: 'scatter', data: scatterData, xKey: 'x', yKey: 'y', xLabel: targetCols[0], yLabel: targetCols[1], colors: ['#8b5cf6'] }
    };
  }

  // ── Distribution Handler ────────────────────────────────────────────────────
  handleDistribution(q, cols) {
    const col = cols.find(c => this.numericCols.includes(c)) || this.numericCols[0];
    if (!col) return { text: 'No numeric column found for distribution analysis.', type: 'info' };

    const s = this.stats[col];
    if (!s) return { text: `No statistics available for "${col}"`, type: 'info' };

    const text = `📊 **Distribution of "${col}":**\n\n` +
      `• Mean: ${s.mean.toLocaleString()}\n` +
      `• Median: ${s.median.toLocaleString()}\n` +
      `• Std Dev: ${s.std.toLocaleString()}\n` +
      `• Range: [${s.min.toLocaleString()}, ${s.max.toLocaleString()}]\n` +
      `• IQR: [${s.q1.toLocaleString()}, ${s.q3.toLocaleString()}]\n` +
      `• Skewness: ${s.skewness} (${Math.abs(s.skewness) < 0.5 ? 'approximately symmetric' : s.skewness > 0 ? 'right-skewed' : 'left-skewed'})`;

    const values = this.data.map(r => r[col]).filter(v => typeof v === 'number').sort((a, b) => a - b);
    const bucketCount = Math.min(15, Math.max(5, Math.ceil(Math.sqrt(values.length))));
    const min = values[0]; const max = values[values.length - 1];
    const bucketSize = (max - min) / bucketCount || 1;
    const histogram = Array.from({ length: bucketCount }, (_, i) => ({ range: `${(min + i * bucketSize).toFixed(0)}`, Count: 0 }));
    values.forEach(v => { const idx = Math.min(Math.floor((v - min) / bucketSize), bucketCount - 1); histogram[idx].Count++; });

    return {
      text, type: 'distribution',
      chart: { type: 'bar', data: histogram, xKey: 'range', yKeys: ['Count'], colors: ['#6366f1'] }
    };
  }

  // ── Outlier Handler ─────────────────────────────────────────────────────────
  handleOutliers(q, cols) {
    const col = cols.find(c => this.numericCols.includes(c)) || this.numericCols[0];
    if (!col || !this.stats[col]) return { text: 'No numeric column found for outlier detection.', type: 'info' };

    const s = this.stats[col];
    const iqr = s.q3 - s.q1;
    const lower = s.q1 - 1.5 * iqr;
    const upper = s.q3 + 1.5 * iqr;

    const outliers = this.data
      .map((r, i) => ({ index: i, value: r[col], ...r }))
      .filter(r => r.value < lower || r.value > upper)
      .sort((a, b) => Math.abs(b.value - s.mean) - Math.abs(a.value - s.mean));

    const labelCol = this.categoricalCols[0] || this.columns.find(c => c !== col);
    const lines = outliers.slice(0, 10).map(o => {
      const label = labelCol ? o[labelCol] : `Row ${o.index}`;
      const direction = o.value > upper ? '⬆️ above' : '⬇️ below';
      return `• **${label}**: ${o.value.toLocaleString()} (${direction} normal range)`;
    });

    return {
      text: `⚠️ **${outliers.length} outliers found in "${col}"**\n\nNormal range: [${lower.toFixed(2)}, ${upper.toFixed(2)}]\n\n${lines.join('\n')}${outliers.length > 10 ? `\n\n...and ${outliers.length - 10} more` : ''}`,
      type: 'outlier',
      data: outliers.slice(0, 20)
    };
  }

  // ── Count Handler ───────────────────────────────────────────────────────────
  handleCount(q, cols) {
    const col = cols.find(c => this.categoricalCols.includes(c)) || this.categoricalCols[0];
    if (!col) {
      return { text: `📊 Total records: **${this.data.length.toLocaleString()}**`, type: 'count' };
    }

    const freq = {};
    this.data.forEach(r => { const v = r[col]?.toString() || 'Unknown'; freq[v] = (freq[v] || 0) + 1; });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);

    // Check if user asked about a specific value
    const specificMatch = sorted.find(([name]) => q.includes(name.toLowerCase()));
    if (specificMatch) {
      return { text: `📊 **${specificMatch[0]}**: ${specificMatch[1].toLocaleString()} records (${((specificMatch[1] / this.data.length) * 100).toFixed(1)}%)`, type: 'count' };
    }

    const lines = sorted.map(([name, count]) => `• **${name}**: ${count.toLocaleString()} (${((count / this.data.length) * 100).toFixed(1)}%)`);
    return {
      text: `📊 **Counts by "${col}":**\n\n${lines.join('\n')}`,
      type: 'count',
      chart: { type: 'pie', data: sorted.slice(0, 8).map(([name, value]) => ({ name, value })), colors: ['#6366f1', '#8b5cf6', '#a78bfa', '#10b981', '#06b6d4', '#f59e0b', '#ef4444', '#ec4899'] }
    };
  }

  // ── Filter Handler ──────────────────────────────────────────────────────────
  handleFilter(q, cols) {
    let filtered = [...this.data];
    const numCol = cols.find(c => this.numericCols.includes(c));
    const catCol = cols.find(c => this.categoricalCols.includes(c));

    // Try to extract filter value from question
    if (catCol) {
      const values = [...new Set(this.data.map(r => r[catCol]?.toString()))];
      const matchedValue = values.find(v => q.includes(v.toLowerCase()));
      if (matchedValue) {
        filtered = filtered.filter(r => r[catCol]?.toString() === matchedValue);
      }
    }

    const numMatch = q.match(/(?:greater|more|above|over|>)\s*(?:than\s*)?(\d+(?:\.\d+)?)/);
    const numMatchLess = q.match(/(?:less|fewer|below|under|<)\s*(?:than\s*)?(\d+(?:\.\d+)?)/);
    if (numMatch && numCol) {
      const threshold = parseFloat(numMatch[1]);
      filtered = filtered.filter(r => r[numCol] > threshold);
    } else if (numMatchLess && numCol) {
      const threshold = parseFloat(numMatchLess[1]);
      filtered = filtered.filter(r => r[numCol] < threshold);
    }

    const labelCol = this.columns[0];
    const preview = filtered.slice(0, 8).map(r => {
      const parts = this.columns.slice(0, 4).map(c => `${c}: ${typeof r[c] === 'number' ? r[c].toLocaleString() : r[c]}`);
      return `• ${parts.join(' | ')}`;
    });

    return {
      text: `🔎 **Found ${filtered.length} matching records** (out of ${this.data.length}):\n\n${preview.join('\n')}${filtered.length > 8 ? `\n\n...and ${filtered.length - 8} more` : ''}`,
      type: 'filter',
      data: filtered.slice(0, 50),
      matchCount: filtered.length
    };
  }

  // ── Trend Handler ───────────────────────────────────────────────────────────
  handleTrend(q, cols) {
    const col = cols.find(c => this.numericCols.includes(c)) || this.numericCols[0];
    if (!col) return { text: 'No numeric column found for trend analysis.', type: 'info' };

    const values = this.data.map(r => r[col]);
    const n = values.length;
    const x = values.map((_, i) => i);

    // Linear regression
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * values[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;

    const trend = slope > 0.001 ? '📈 Upward' : slope < -0.001 ? '📉 Downward' : '➡️ Stable';
    const changePercent = ((slope * n) / (Math.abs(intercept) || 1) * 100).toFixed(1);

    const lineData = values.map((v, i) => ({
      index: i + 1,
      Actual: parseFloat(v.toFixed(2)),
      Trend: parseFloat((slope * i + intercept).toFixed(2))
    }));

    return {
      text: `📈 **Trend analysis for "${col}":**\n\n• Direction: ${trend}\n• Estimated total change: ${changePercent}%\n• Slope: ${slope.toFixed(4)} per record`,
      type: 'trend',
      chart: { type: 'line', data: lineData.slice(-50), xKey: 'index', yKeys: ['Actual', 'Trend'], colors: ['#6366f1', '#f59e0b'] }
    };
  }

  // ── Predict Handler ─────────────────────────────────────────────────────────
  handlePredict(q, cols) {
    const col = cols.find(c => this.numericCols.includes(c)) || this.numericCols[0];
    if (!col) return { text: 'No numeric column found for prediction.', type: 'info' };

    const values = this.data.map(r => r[col]);
    const n = values.length;
    const x = values.map((_, i) => i);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * values[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;

    const nextValues = Array.from({ length: 5 }, (_, i) => ({
      step: `+${i + 1}`,
      Predicted: parseFloat((slope * (n + i) + intercept).toFixed(2))
    }));

    return {
      text: `🔮 **Prediction for "${col}"** (next 5 steps):\n\n${nextValues.map(v => `• Step ${v.step}: **${v.Predicted.toLocaleString()}**`).join('\n')}\n\n_Based on linear trend extrapolation._`,
      type: 'predict',
      chart: { type: 'bar', data: nextValues, xKey: 'step', yKeys: ['Predicted'], colors: ['#f59e0b'] }
    };
  }

  // ── General / Fallback Handler ──────────────────────────────────────────────
  handleGeneral(q, cols) {
    const text = `📋 **Dataset Summary:**\n\n` +
      `• **Records:** ${this.data.length.toLocaleString()}\n` +
      `• **Columns:** ${this.columns.length} (${this.numericCols.length} numeric, ${this.categoricalCols.length} categorical)\n` +
      `• **Numeric:** ${this.numericCols.join(', ') || 'none'}\n` +
      `• **Categorical:** ${this.categoricalCols.join(', ') || 'none'}\n\n` +
      `💡 **Try asking:**\n` +
      `• "What is the average ${this.numericCols[0] || 'salary'}?"\n` +
      `• "Show top 5 by ${this.numericCols[0] || 'score'}"\n` +
      `• "Compare ${this.categoricalCols[0] || 'groups'}"\n` +
      `• "Why did ${this.numericCols[0] || 'revenue'} change?"\n` +
      `• "Any outliers in ${this.numericCols[0] || 'data'}?"`;

    return { text, type: 'summary' };
  }
}

module.exports = router;
