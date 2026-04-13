import { getDb } from './init.js';

/**
 * Agent 3: Database — Query helper functions for all tables.
 */

// ============ PROJECTS ============

export function createProject({ id, name, originalPath, fileCount, totalSize }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO projects (id, name, original_path, file_count, total_size)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(id, name, originalPath, fileCount || 0, totalSize || 0);
}

export function getProject(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
}

export function getAllProjects() {
  const db = getDb();
  return db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
}

export function updateProject(id, fields) {
  const db = getDb();
  const allowed = ['name', 'upgraded_path', 'status', 'file_count', 'total_size'];
  const updates = [];
  const values = [];

  for (const [key, value] of Object.entries(fields)) {
    if (allowed.includes(key)) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (updates.length === 0) return null;
  updates.push("updated_at = datetime('now')");
  values.push(id);

  const stmt = db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`);
  return stmt.run(...values);
}

export function deleteProject(id) {
  const db = getDb();
  return db.prepare('DELETE FROM projects WHERE id = ?').run(id);
}

// ============ TECHNOLOGIES ============

export function addTechnology({ projectId, name, category, currentVersion, latestVersion, filePath, confidence }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO technologies (project_id, name, category, current_version, latest_version, file_path, confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(projectId, name, category, currentVersion || null, latestVersion || null, filePath || null, confidence || 1.0);
}

export function getTechnologies(projectId) {
  const db = getDb();
  return db.prepare('SELECT * FROM technologies WHERE project_id = ? ORDER BY category, name').all(projectId);
}

export function clearTechnologies(projectId) {
  const db = getDb();
  return db.prepare('DELETE FROM technologies WHERE project_id = ?').run(projectId);
}

// ============ UPGRADE SUGGESTIONS ============

export function addSuggestion({ projectId, technology, description, priority, category, autoFixable, filePath, lineStart, lineEnd, originalCode, suggestedCode }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO upgrade_suggestions (project_id, technology, description, priority, category, auto_fixable, file_path, line_start, line_end, original_code, suggested_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(projectId, technology, description, priority || 'medium', category, autoFixable ? 1 : 0, filePath || null, lineStart || null, lineEnd || null, originalCode || null, suggestedCode || null);
}

export function getSuggestions(projectId) {
  const db = getDb();
  return db.prepare('SELECT * FROM upgrade_suggestions WHERE project_id = ? ORDER BY priority DESC, category').all(projectId);
}

export function updateSuggestionStatus(id, status) {
  const db = getDb();
  return db.prepare('UPDATE upgrade_suggestions SET status = ? WHERE id = ?').run(status, id);
}

export function clearSuggestions(projectId) {
  const db = getDb();
  return db.prepare('DELETE FROM upgrade_suggestions WHERE project_id = ?').run(projectId);
}

// ============ UPGRADE HISTORY ============

export function addHistoryEntry({ projectId, agent, action, filePath, description, status, details }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO upgrade_history (project_id, agent, action, file_path, description, status, details)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(projectId, agent, action, filePath || null, description || null, status || 'success', details ? JSON.stringify(details) : null);
}

export function getHistory(projectId) {
  const db = getDb();
  return db.prepare('SELECT * FROM upgrade_history WHERE project_id = ? ORDER BY created_at DESC').all(projectId);
}

// ============ PIPELINE RUNS ============

export function createPipelineRun(projectId) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO pipeline_runs (project_id, status, started_at)
    VALUES (?, 'running', datetime('now'))
  `);
  return stmt.run(projectId);
}

export function updatePipelineRun(id, fields) {
  const db = getDb();
  const allowed = ['status', 'current_stage', 'progress', 'completed_at', 'error'];
  const updates = [];
  const values = [];

  for (const [key, value] of Object.entries(fields)) {
    if (allowed.includes(key)) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (updates.length === 0) return null;
  values.push(id);

  return db.prepare(`UPDATE pipeline_runs SET ${updates.join(', ')} WHERE id = ?`).run(...values);
}

export function getLatestPipelineRun(projectId) {
  const db = getDb();
  return db.prepare('SELECT * FROM pipeline_runs WHERE project_id = ? ORDER BY created_at DESC LIMIT 1').get(projectId);
}

// ============ DIFF RESULTS ============

export function addDiffResult({ projectId, filePath, originalContent, upgradedContent, diffContent, changeType }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO diff_results (project_id, file_path, original_content, upgraded_content, diff_content, change_type)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(projectId, filePath, originalContent || '', upgradedContent || '', diffContent || '', changeType || 'modified');
}

export function getDiffResults(projectId) {
  const db = getDb();
  return db.prepare('SELECT * FROM diff_results WHERE project_id = ? ORDER BY file_path').all(projectId);
}

export function clearDiffResults(projectId) {
  const db = getDb();
  return db.prepare('DELETE FROM diff_results WHERE project_id = ?').run(projectId);
}

export default {
  createProject, getProject, getAllProjects, updateProject, deleteProject,
  addTechnology, getTechnologies, clearTechnologies,
  addSuggestion, getSuggestions, updateSuggestionStatus, clearSuggestions,
  addHistoryEntry, getHistory,
  createPipelineRun, updatePipelineRun, getLatestPipelineRun,
  addDiffResult, getDiffResults, clearDiffResults,
};
