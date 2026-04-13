/**
 * Agent - Memory & Comparison
 * Compares current analysis with previous uploads to detect changes over time.
 */

async function compareWithPrevious(currentResults, datasetId, store) {
  try {
    const allDatasets = await store.getAllDatasets();
    // Find previous datasets (exclude current)
    const previousDatasets = allDatasets
      .filter(d => d.id !== datasetId && (d.status === 'completed'))
      .slice(0, 5); // last 5

    if (previousDatasets.length === 0) {
      return {
        hasPrevious: false,
        message: 'This is the first dataset — no historical comparison available.',
        comparisons: []
      };
    }

    const prevId = previousDatasets[0].id;
    const prevData = await store.getStoredData(prevId);

    if (!prevData) {
      return { hasPrevious: false, message: 'Previous dataset data not available.', comparisons: [] };
    }

    const { statistics: curStats, columns: curCols, columnTypes: curTypes } = currentResults;
    const { statistics: prevStats, columns: prevCols, columnTypes: prevTypes } = prevData;

    // Find common numeric columns
    const commonNumeric = curCols.filter(c =>
      prevCols.includes(c) && curTypes[c] === 'numeric' && prevTypes[c] === 'numeric'
    );

    const comparisons = commonNumeric.map(col => {
      const cur = curStats[col];
      const prev = prevStats[col];
      if (!cur || !prev) return null;

      const meanChange = prev.mean !== 0
        ? ((cur.mean - prev.mean) / Math.abs(prev.mean) * 100)
        : 0;

      const medianChange = prev.median !== 0
        ? ((cur.median - prev.median) / Math.abs(prev.median) * 100)
        : 0;

      const stdChange = prev.std !== 0
        ? ((cur.std - prev.std) / Math.abs(prev.std) * 100)
        : 0;

      return {
        column: col,
        current: { mean: cur.mean, median: cur.median, std: cur.std, min: cur.min, max: cur.max },
        previous: { mean: prev.mean, median: prev.median, std: prev.std, min: prev.min, max: prev.max },
        changes: {
          mean: parseFloat(meanChange.toFixed(2)),
          median: parseFloat(medianChange.toFixed(2)),
          std: parseFloat(stdChange.toFixed(2))
        },
        direction: meanChange > 2 ? 'increased' : meanChange < -2 ? 'decreased' : 'stable',
        significance: Math.abs(meanChange) > 20 ? 'high' : Math.abs(meanChange) > 5 ? 'medium' : 'low'
      };
    }).filter(Boolean);

    // Generate natural language insights
    const insights = [];
    comparisons.forEach(comp => {
      if (Math.abs(comp.changes.mean) > 2) {
        const verb = comp.direction === 'increased' ? 'increased' : comp.direction === 'decreased' ? 'decreased' : 'remained stable';
        const emoji = comp.direction === 'increased' ? '📈' : comp.direction === 'decreased' ? '📉' : '➡️';
        insights.push({
          icon: emoji,
          text: `${comp.column} ${verb} by ${Math.abs(comp.changes.mean).toFixed(1)}% compared to the previous upload (${comp.previous.mean.toFixed(2)} → ${comp.current.mean.toFixed(2)})`,
          significance: comp.significance,
          column: comp.column
        });
      }
    });

    // Row count comparison
    const prevRowCount = prevData.cleanedData?.length || 0;
    const curRowCount = currentResults.cleanedData?.length || 0;
    if (prevRowCount > 0) {
      const rowChange = ((curRowCount - prevRowCount) / prevRowCount * 100).toFixed(1);
      if (Math.abs(rowChange) > 5) {
        insights.unshift({
          icon: curRowCount > prevRowCount ? '📊' : '📉',
          text: `Dataset size ${curRowCount > prevRowCount ? 'grew' : 'shrunk'} by ${Math.abs(rowChange)}% (${prevRowCount} → ${curRowCount} records)`,
          significance: Math.abs(rowChange) > 20 ? 'high' : 'medium',
          column: null
        });
      }
    }

    return {
      hasPrevious: true,
      previousDataset: {
        id: prevId,
        filename: previousDatasets[0].filename,
        uploadedAt: previousDatasets[0].uploaded_at || previousDatasets[0].uploadedAt
      },
      comparisons,
      insights,
      summary: insights.length > 0
        ? `Found ${insights.length} change(s) compared to previous upload "${previousDatasets[0].filename}"`
        : 'No significant changes compared to the previous upload.'
    };
  } catch (err) {
    return { hasPrevious: false, message: `Comparison error: ${err.message}`, comparisons: [] };
  }
}

module.exports = { compareWithPrevious };
