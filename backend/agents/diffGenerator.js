import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Diff = require('diff');

import fs from 'fs';
import path from 'path';
import { getAllFiles, readFileContent } from '../utils/fileUtils.js';
import logger from '../middleware/logger.js';

/**
 * Agent 10: Diff Generator
 * Compares the original and upgraded codebase and generates
 * a clear, file-by-file difference view.
 */

/**
 * Generate diffs between original and upgraded project directories.
 * @param {string} originalDir - Path to the original project.
 * @param {string} upgradedDir - Path to the upgraded project.
 * @returns {object} Diff results.
 */
export async function generateDiffs(originalDir, upgradedDir) {
  logger.info('Agent 10: Starting diff generation', { originalDir, upgradedDir });

  const originalFiles = getAllFiles(originalDir);
  const upgradedFiles = getAllFiles(upgradedDir);

  const originalMap = new Map(originalFiles.map((f) => [f.path, f]));
  const upgradedMap = new Map(upgradedFiles.map((f) => [f.path, f]));

  const results = {
    totalFiles: 0,
    modifiedFiles: 0,
    addedFiles: 0,
    deletedFiles: 0,
    unchangedFiles: 0,
    totalAdditions: 0,
    totalDeletions: 0,
    diffs: [],
  };

  // Find all unique file paths
  const allPaths = new Set([...originalMap.keys(), ...upgradedMap.keys()]);
  results.totalFiles = allPaths.size;

  for (const filePath of allPaths) {
    const original = originalMap.get(filePath);
    const upgraded = upgradedMap.get(filePath);

    if (!original && upgraded) {
      // File was added
      results.addedFiles++;
      const content = readFileContent(upgraded.fullPath);
      results.diffs.push({
        filePath,
        changeType: 'added',
        additions: content ? content.split('\n').length : 0,
        deletions: 0,
        diff: content
          ? createUnifiedDiff('', content, filePath)
          : null,
        originalContent: '',
        upgradedContent: content || '',
      });
    } else if (original && !upgraded) {
      // File was deleted
      results.deletedFiles++;
      const content = readFileContent(original.fullPath);
      results.diffs.push({
        filePath,
        changeType: 'deleted',
        additions: 0,
        deletions: content ? content.split('\n').length : 0,
        diff: content
          ? createUnifiedDiff(content, '', filePath)
          : null,
        originalContent: content || '',
        upgradedContent: '',
      });
    } else if (original && upgraded) {
      // File exists in both — check if modified
      if (original.isBinary || upgraded.isBinary) {
        // Binary files — check size change
        if (original.size !== upgraded.size) {
          results.modifiedFiles++;
          results.diffs.push({
            filePath,
            changeType: 'modified',
            additions: 0,
            deletions: 0,
            diff: `Binary file changed (${original.size} → ${upgraded.size} bytes)`,
            isBinary: true,
            originalContent: null,
            upgradedContent: null,
          });
        } else {
          results.unchangedFiles++;
        }
        continue;
      }

      const originalContent = readFileContent(original.fullPath) || '';
      const upgradedContent = readFileContent(upgraded.fullPath) || '';

      if (originalContent === upgradedContent) {
        results.unchangedFiles++;
        continue;
      }

      // Generate diff
      const patch = Diff.createPatch(filePath, originalContent, upgradedContent, 'original', 'upgraded');
      const changes = Diff.diffLines(originalContent, upgradedContent);

      let additions = 0;
      let deletions = 0;

      for (const change of changes) {
        if (change.added) additions += change.count;
        if (change.removed) deletions += change.count;
      }

      results.modifiedFiles++;
      results.totalAdditions += additions;
      results.totalDeletions += deletions;

      results.diffs.push({
        filePath,
        changeType: 'modified',
        additions,
        deletions,
        diff: patch,
        hunks: extractHunks(patch),
        originalContent,
        upgradedContent,
      });
    }
  }

  // Sort diffs: modified first, then added, then deleted
  const order = { modified: 0, added: 1, deleted: 2 };
  results.diffs.sort((a, b) => (order[a.changeType] || 99) - (order[b.changeType] || 99));

  logger.info('Agent 10: Diff generation complete', {
    total: results.totalFiles,
    modified: results.modifiedFiles,
    added: results.addedFiles,
    deleted: results.deletedFiles,
    unchanged: results.unchangedFiles,
    additions: results.totalAdditions,
    deletions: results.totalDeletions,
  });

  return results;
}

/**
 * Create a unified diff string.
 */
function createUnifiedDiff(oldContent, newContent, filePath) {
  return Diff.createPatch(filePath, oldContent, newContent, 'original', 'upgraded');
}

/**
 * Extract hunks from a unified diff for structured display.
 */
function extractHunks(patch) {
  const hunks = [];
  const lines = patch.split('\n');
  let currentHunk = null;

  for (const line of lines) {
    // Hunk header: @@ -start,count +start,count @@
    const hunkMatch = line.match(/^@@\s*-(\d+),?(\d*)\s*\+(\d+),?(\d*)\s*@@(.*)/);
    if (hunkMatch) {
      if (currentHunk) hunks.push(currentHunk);
      currentHunk = {
        oldStart: parseInt(hunkMatch[1], 10),
        oldLines: parseInt(hunkMatch[2] || '0', 10),
        newStart: parseInt(hunkMatch[3], 10),
        newLines: parseInt(hunkMatch[4] || '0', 10),
        header: line,
        context: hunkMatch[5]?.trim() || '',
        lines: [],
      };
      continue;
    }

    if (!currentHunk) continue;

    if (line.startsWith('+') && !line.startsWith('+++')) {
      currentHunk.lines.push({ type: 'add', content: line.substring(1) });
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      currentHunk.lines.push({ type: 'remove', content: line.substring(1) });
    } else if (line.startsWith(' ')) {
      currentHunk.lines.push({ type: 'context', content: line.substring(1) });
    }
  }

  if (currentHunk) hunks.push(currentHunk);
  return hunks;
}

/**
 * Get a summary of changes for display.
 */
export function getDiffSummary(diffResults) {
  return {
    totalFiles: diffResults.totalFiles,
    modified: diffResults.modifiedFiles,
    added: diffResults.addedFiles,
    deleted: diffResults.deletedFiles,
    unchanged: diffResults.unchangedFiles,
    totalAdditions: diffResults.totalAdditions,
    totalDeletions: diffResults.totalDeletions,
    files: diffResults.diffs.map((d) => ({
      path: d.filePath,
      type: d.changeType,
      additions: d.additions,
      deletions: d.deletions,
    })),
  };
}

export default { generateDiffs, getDiffSummary };
