/**
 * Agent 5 - Data Cleaner
 *
 * Responsibilities:
 * - Parse CSV files into structured data
 * - Detect column types (numeric, categorical, date, boolean)
 * - Handle missing values (median for numeric, mode for categorical)
 * - Remove duplicate rows
 * - Convert and normalize numeric columns
 * - Return a clean, structured dataset with a cleaning summary
 */

const fs = require('fs');
const csv = require('csv-parser');

// ─── Utility Functions ──────────────────────────────────────────────────────────

function median(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mode(arr) {
  if (arr.length === 0) return null;
  const freq = {};
  arr.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
  let maxFreq = 0;
  let modeVal = arr[0];
  for (const [val, count] of Object.entries(freq)) {
    if (count > maxFreq) {
      maxFreq = count;
      modeVal = val;
    }
  }
  return modeVal;
}

/**
 * Detect the data type of a column by sampling its values.
 */
function detectColumnType(values) {
  const nonEmpty = values.filter(v => v !== null && v !== undefined && v.toString().trim() !== '');
  if (nonEmpty.length === 0) return 'unknown';

  const sampleSize = Math.min(nonEmpty.length, 100);
  const sample = nonEmpty.slice(0, sampleSize);

  // Check numeric
  const numericCount = sample.filter(v => {
    const n = parseFloat(v);
    return !isNaN(n) && isFinite(n);
  }).length;
  if (numericCount / sampleSize > 0.85) return 'numeric';

  // Check date
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}/,                  // ISO date
    /^\d{1,2}\/\d{1,2}\/\d{2,4}/,          // MM/DD/YYYY
    /^\d{1,2}-\d{1,2}-\d{2,4}/,            // MM-DD-YYYY
    /^[A-Za-z]+\s+\d{1,2},?\s+\d{4}/       // Month DD, YYYY
  ];
  const dateCount = sample.filter(v => {
    const str = v.toString();
    return datePatterns.some(p => p.test(str)) && !isNaN(Date.parse(str));
  }).length;
  if (dateCount / sampleSize > 0.8) return 'date';

  // Check boolean
  const boolValues = new Set(['true', 'false', 'yes', 'no', '1', '0', 'y', 'n']);
  const boolCount = sample.filter(v => boolValues.has(v.toString().toLowerCase().trim())).length;
  if (boolCount / sampleSize > 0.85) return 'boolean';

  return 'categorical';
}

// ─── Main Cleaning Process ──────────────────────────────────────────────────────

async function process(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('error', (err) => reject(new Error(`CSV parsing error: ${err.message}`)))
      .on('end', () => {
        try {
          if (rows.length === 0) {
            return reject(new Error('CSV file is empty or has no data rows'));
          }

          const columns = Object.keys(rows[0]);
          const originalRowCount = rows.length;

          // ── Detect column types ──────────────────────────────────────────
          const columnTypes = {};
          columns.forEach(col => {
            const values = rows.map(r => r[col]);
            columnTypes[col] = detectColumnType(values);
          });

          // ── Count missing values before cleaning ─────────────────────────
          let totalMissing = 0;
          const missingByColumn = {};
          columns.forEach(col => {
            const missing = rows.filter(r =>
              r[col] === '' || r[col] === null || r[col] === undefined || r[col].toString().trim() === ''
            ).length;
            missingByColumn[col] = missing;
            totalMissing += missing;
          });

          // ── Fill missing values ──────────────────────────────────────────
          // Pre-compute fill values for each column
          const fillValues = {};
          columns.forEach(col => {
            if (columnTypes[col] === 'numeric') {
              const validValues = rows
                .map(r => parseFloat(r[col]))
                .filter(v => !isNaN(v));
              fillValues[col] = validValues.length > 0 ? String(median(validValues)) : '0';
            } else if (columnTypes[col] === 'categorical' || columnTypes[col] === 'boolean') {
              const validValues = rows
                .map(r => r[col])
                .filter(v => v !== '' && v !== null && v !== undefined && v.toString().trim() !== '');
              fillValues[col] = mode(validValues) || 'Unknown';
            }
          });

          let cleanedRows = rows.map(row => {
            const cleaned = { ...row };
            columns.forEach(col => {
              const val = cleaned[col];
              if (val === '' || val === null || val === undefined || val.toString().trim() === '') {
                if (fillValues[col] !== undefined) {
                  cleaned[col] = fillValues[col];
                }
              }
            });
            return cleaned;
          });

          // ── Remove duplicates ────────────────────────────────────────────
          const seen = new Set();
          const beforeDedup = cleanedRows.length;
          cleanedRows = cleanedRows.filter(row => {
            const key = columns.map(c => row[c]).join('|');
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          const duplicatesRemoved = beforeDedup - cleanedRows.length;

          // ── Convert numeric columns to actual numbers ────────────────────
          cleanedRows = cleanedRows.map(row => {
            const converted = { ...row };
            columns.forEach(col => {
              if (columnTypes[col] === 'numeric') {
                const parsed = parseFloat(converted[col]);
                converted[col] = isNaN(parsed) ? 0 : parsed;
              }
            });
            return converted;
          });

          // ── Compute normalization parameters ─────────────────────────────
          const normalizationParams = {};
          columns.forEach(col => {
            if (columnTypes[col] === 'numeric') {
              const values = cleanedRows.map(r => r[col]);
              const min = Math.min(...values);
              const max = Math.max(...values);
              normalizationParams[col] = { min, max, range: max - min };
            }
          });

          // ── Build summary ────────────────────────────────────────────────
          const summary = {
            totalColumns: columns.length,
            numericColumns: columns.filter(c => columnTypes[c] === 'numeric').length,
            categoricalColumns: columns.filter(c => columnTypes[c] === 'categorical').length,
            dateColumns: columns.filter(c => columnTypes[c] === 'date').length,
            booleanColumns: columns.filter(c => columnTypes[c] === 'boolean').length,
            missingValuesFilled: totalMissing,
            missingByColumn,
            duplicatesRemoved,
            originalRows: originalRowCount,
            cleanedRows: cleanedRows.length,
            dataQualityScore: calculateQualityScore(totalMissing, duplicatesRemoved, originalRowCount, columns.length)
          };

          resolve({
            columns,
            columnTypes,
            originalRowCount,
            cleanedRowCount: cleanedRows.length,
            cleanedData: cleanedRows,
            normalizationParams,
            summary
          });

        } catch (err) {
          reject(new Error(`Data cleaning error: ${err.message}`));
        }
      });
  });
}

function calculateQualityScore(missingCount, duplicates, totalRows, totalCols) {
  const totalCells = totalRows * totalCols;
  if (totalCells === 0) return 100;

  let score = 100;
  score -= (missingCount / totalCells) * 150;        // Penalize missing values
  score -= (duplicates / totalRows) * 80;             // Penalize duplicates
  return Math.max(0, Math.min(100, Math.round(score)));
}

module.exports = { process };
