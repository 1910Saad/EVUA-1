import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import config from '../config/index.js';
import logger from '../middleware/logger.js';

let db;

/**
 * Agent 3: Database — Initialize SQLite database with schema.
 */
export function initDatabase() {
  const dbDir = path.dirname(config.databasePath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(config.databasePath);

  // Enable WAL mode for better concurrent reads
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      original_path TEXT NOT NULL,
      upgraded_path TEXT,
      status TEXT NOT NULL DEFAULT 'uploaded',
      file_count INTEGER DEFAULT 0,
      total_size INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS technologies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      current_version TEXT,
      latest_version TEXT,
      file_path TEXT,
      confidence REAL DEFAULT 1.0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS upgrade_suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      technology TEXT NOT NULL,
      description TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium',
      category TEXT NOT NULL,
      auto_fixable INTEGER DEFAULT 0,
      file_path TEXT,
      line_start INTEGER,
      line_end INTEGER,
      original_code TEXT,
      suggested_code TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS upgrade_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      agent TEXT NOT NULL,
      action TEXT NOT NULL,
      file_path TEXT,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'success',
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pipeline_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      current_stage TEXT,
      progress INTEGER DEFAULT 0,
      started_at TEXT,
      completed_at TEXT,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS diff_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      original_content TEXT,
      upgraded_content TEXT,
      diff_content TEXT,
      change_type TEXT NOT NULL DEFAULT 'modified',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_technologies_project ON technologies(project_id);
    CREATE INDEX IF NOT EXISTS idx_suggestions_project ON upgrade_suggestions(project_id);
    CREATE INDEX IF NOT EXISTS idx_history_project ON upgrade_history(project_id);
    CREATE INDEX IF NOT EXISTS idx_diffs_project ON diff_results(project_id);
  `);

  logger.info('Database initialized successfully', { path: config.databasePath });
  return db;
}

/**
 * Get database instance.
 */
export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export default { initDatabase, getDb };
