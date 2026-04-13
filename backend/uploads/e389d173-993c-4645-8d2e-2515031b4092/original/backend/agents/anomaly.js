/**
 * Agent - Anomaly Detection
 * Z-score based point anomaly detection + change point detection + collective anomalies
 */

function process(cleanResult, analysisResult) {
  const { cleanedData, columns, columnTypes } = cleanResult;
  const { statistics } = analysisResult;
  const numericCols = columns.filter(c => columnTypes[c] === 'numeric');

  const pointAnomalies = [];
  const changePoints = [];
  const columnSummaries = {};

  numericCols.forEach(col => {
    const s = statistics[col];
    if (!s || s.std === 0) return;

    const values = cleanedData.map(r => r[col]);

    // ── Z-Score Point Anomalies ──────────────────────────────────────────
    const colAnomalies = [];
    values.forEach((v, i) => {
      const zScore = Math.abs((v - s.mean) / s.std);
      if (zScore > 2.5) {
        const labelCol = columns.find(c => columnTypes[c] === 'categorical') || columns[0];
        colAnomalies.push({
          row: i,
          column: col,
          value: v,
          zScore: parseFloat(zScore.toFixed(3)),
          severity: zScore > 3.5 ? 'critical' : zScore > 3 ? 'high' : 'medium',
          direction: v > s.mean ? 'above' : 'below',
          label: cleanedData[i][labelCol] || `Row ${i}`,
          deviation: parseFloat(((v - s.mean) / s.mean * 100).toFixed(1))
        });
      }
    });
    colAnomalies.sort((a, b) => b.zScore - a.zScore);
    pointAnomalies.push(...colAnomalies);

    // ── Change Point Detection ───────────────────────────────────────────
    const windowSize = Math.max(3, Math.floor(values.length / 10));
    for (let i = windowSize; i < values.length - windowSize; i++) {
      const before = values.slice(i - windowSize, i);
      const after = values.slice(i, i + windowSize);
      const beforeMean = before.reduce((a, b) => a + b, 0) / before.length;
      const afterMean = after.reduce((a, b) => a + b, 0) / after.length;
      const change = Math.abs(afterMean - beforeMean) / (s.std || 1);

      if (change > 2) {
        changePoints.push({
          row: i,
          column: col,
          magnitude: parseFloat(change.toFixed(3)),
          direction: afterMean > beforeMean ? 'spike' : 'drop',
          beforeMean: parseFloat(beforeMean.toFixed(2)),
          afterMean: parseFloat(afterMean.toFixed(2)),
          percentChange: parseFloat(((afterMean - beforeMean) / Math.abs(beforeMean || 1) * 100).toFixed(1)),
          description: `${afterMean > beforeMean ? 'Sudden increase' : 'Sudden decrease'} detected at row ${i}: ${beforeMean.toFixed(1)} → ${afterMean.toFixed(1)}`
        });
      }
    }

    // ── Collective Anomalies ─────────────────────────────────────────────
    const collectiveWindow = Math.max(5, Math.floor(values.length / 20));
    for (let c = 0; c <= values.length - collectiveWindow; c += Math.max(1, Math.floor(collectiveWindow / 2))) {
      const windowVals = values.slice(c, c + collectiveWindow);
      const windowMean = windowVals.reduce((a, b) => a + b, 0) / windowVals.length;
      const sumSqDiff = windowVals.reduce((acc, v) => acc + Math.pow(v - windowMean, 2), 0);
      const windowStd = Math.sqrt(sumSqDiff / (windowVals.length - 1 || 1));
      
      // 1. Variance spike (high volatility in window)
      if (s.std > 0 && windowStd > s.std * 2.5) {
        colAnomalies.push({
          row: c + Math.floor(collectiveWindow / 2),
          column: col,
          value: parseFloat(windowMean.toFixed(3)),
          zScore: parseFloat((windowStd / s.std).toFixed(3)),
          severity: windowStd > s.std * 3.5 ? 'critical' : 'high',
          direction: 'variance_spike',
          label: `Sequence Row ${c}-${c + collectiveWindow - 1}`,
          deviation: parseFloat(((windowStd - s.std) / s.std * 100).toFixed(1)),
          description: `High volatility sequence detected. Local Std: ${windowStd.toFixed(2)} (Global: ${s.std.toFixed(2)})`
        });
      }
      
      // 2. Sustained mean shift
      if (s.std > 0) {
        const meanZScore = Math.abs((windowMean - s.mean) / (s.std / Math.sqrt(collectiveWindow)));
        if (meanZScore > 4.0) {
          colAnomalies.push({
            row: c + Math.floor(collectiveWindow / 2),
            column: col,
            value: parseFloat(windowMean.toFixed(3)),
            zScore: parseFloat((meanZScore / 2).toFixed(3)), // scale down for regular zScore comparison
            severity: meanZScore > 6.0 ? 'critical' : 'high',
            direction: windowMean > s.mean ? 'sustained_above' : 'sustained_below',
            label: `Sequence Row ${c}-${c + collectiveWindow - 1}`,
            deviation: parseFloat(((windowMean - s.mean) / Math.abs(s.mean || 1) * 100).toFixed(1)),
            description: `Sustained deviation detected. Window mean: ${windowMean.toFixed(2)} (Global: ${s.mean.toFixed(2)})`
          });
        }
      }
    }

    // ── Column summary ───────────────────────────────────────────────────
    const criticalCount = colAnomalies.filter(a => a.severity === 'critical').length;
    const highCount = colAnomalies.filter(a => a.severity === 'high').length;

    columnSummaries[col] = {
      totalAnomalies: colAnomalies.length,
      critical: criticalCount,
      high: highCount,
      medium: colAnomalies.length - criticalCount - highCount,
      percentage: parseFloat(((colAnomalies.length / values.length) * 100).toFixed(2)),
      anomalies: colAnomalies.slice(0, 15)
    };
  });

  // Sort change points by magnitude
  changePoints.sort((a, b) => b.magnitude - a.magnitude);

  // Generate overall summary
  const totalAnomalies = pointAnomalies.length;
  const criticalTotal = pointAnomalies.filter(a => a.severity === 'critical').length;
  const affectedColumns = Object.entries(columnSummaries).filter(([, s]) => s.totalAnomalies > 0).length;

  return {
    summary: {
      totalAnomalies,
      critical: criticalTotal,
      high: pointAnomalies.filter(a => a.severity === 'high').length,
      medium: pointAnomalies.filter(a => a.severity === 'medium').length,
      changePoints: changePoints.length,
      affectedColumns,
      healthScore: Math.max(0, Math.min(100, Math.round(100 - (totalAnomalies / (cleanedData.length * numericCols.length) * 500))))
    },
    columnSummaries,
    changePoints: changePoints.slice(0, 20),
    topAnomalies: pointAnomalies.slice(0, 30),
    chartData: numericCols.slice(0, 3).map(col => ({
      column: col,
      data: cleanedData.map((r, i) => {
        const zScore = statistics[col]?.std ? Math.abs((r[col] - statistics[col].mean) / statistics[col].std) : 0;
        return {
          index: i,
          value: r[col],
          zScore: parseFloat(zScore.toFixed(2)),
          isAnomaly: zScore > 2.5
        };
      })
    }))
  };
}

module.exports = { process };
