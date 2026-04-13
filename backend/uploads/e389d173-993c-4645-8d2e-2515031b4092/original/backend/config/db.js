/**
 * Database configuration with MySQL + in-memory fallback.
 * Extended with user auth, chat history, anomaly results, and data storage.
 */
const fs = require('fs');
const path = require('path');

let store = null;

// ─── MySQL Store ──────────────────────────────────────────────────────────────
class MySQLStore {
  constructor(pool) { this.pool = pool; this.type = 'mysql'; this.dataCache = new Map(); }

  async initialize() {
    const initSQL = fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'init.sql'), 'utf-8');
    const connection = await this.pool.getConnection();
    try {
      const statements = initSQL.split(';').filter(s => s.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          await connection.execute(statement);
        }
      }
    } finally {
      connection.release();
    }
  }

  // Users
  async createUser(data) {
    await this.pool.execute(
      'INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
      [data.id, data.email, data.passwordHash, data.name]
    );
    return { id: data.id, email: data.email, password_hash: data.passwordHash, name: data.name, created_at: new Date().toISOString() };
  }
  async findUserByEmail(email) {
    const [rows] = await this.pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    const u = rows[0];
    if (u) u.passwordHash = u.password_hash;
    return u || null;
  }
  async findUserById(id) {
    const [rows] = await this.pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0] || null;
  }

  // Datasets
  async insertDataset(data) {
    await this.pool.execute(
      `INSERT INTO datasets (id, filename, original_row_count, cleaned_row_count, columns, column_types, cleaning_summary, status, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.id, data.filename, data.originalRowCount, data.cleanedRowCount,
       JSON.stringify(data.columns), JSON.stringify(data.columnTypes),
       JSON.stringify(data.cleaningSummary), data.status || 'processing', data.userId || null]
    );
    return { id: data.id, filename: data.filename, ...data };
  }
  async updateDatasetStatus(id, status) { 
    await this.pool.execute('UPDATE datasets SET status = ? WHERE id = ?', [status, id]); 
  }
  async getDataset(id) { 
    const [rows] = await this.pool.execute('SELECT * FROM datasets WHERE id = ?', [id]); 
    return rows[0] || null; 
  }
  async getAllDatasets(userId) {
    let rows;
    if (userId) {
      [rows] = await this.pool.execute('SELECT * FROM datasets WHERE user_id = ? ORDER BY uploaded_at DESC', [userId]);
    } else {
      [rows] = await this.pool.execute('SELECT * FROM datasets ORDER BY uploaded_at DESC');
    }
    return rows;
  }
  async deleteDataset(id) {
    await this.pool.execute('DELETE FROM datasets WHERE id = ?', [id]);
    this.dataCache.delete(id);
  }

  // Analysis
  async insertAnalysis(data) {
    await this.pool.execute(
      'INSERT INTO analysis_results (id, dataset_id, statistics, correlations, outliers, insights) VALUES (?, ?, ?, ?, ?, ?)',
      [data.id, data.datasetId, JSON.stringify(data.statistics), JSON.stringify(data.correlations), JSON.stringify(data.outliers), JSON.stringify(data.insights)]
    );
  }
  async getAnalysis(dsId) { 
    const [rows] = await this.pool.execute('SELECT * FROM analysis_results WHERE dataset_id = ?', [dsId]); 
    return rows[0] || null; 
  }

  // Visualizations
  async insertVisualization(data) {
    await this.pool.execute('INSERT INTO visualizations (id, dataset_id, charts) VALUES (?, ?, ?)', [data.id, data.datasetId, JSON.stringify(data.charts)]);
  }
  async getVisualization(dsId) { 
    const [rows] = await this.pool.execute('SELECT * FROM visualizations WHERE dataset_id = ?', [dsId]); 
    return rows[0] || null; 
  }

  // Predictions
  async insertPrediction(data) {
    await this.pool.execute('INSERT INTO predictions (id, dataset_id, predictions, summary) VALUES (?, ?, ?, ?)', [data.id, data.datasetId, JSON.stringify(data.predictions), data.summary]);
  }
  async getPrediction(dsId) { 
    const [rows] = await this.pool.execute('SELECT * FROM predictions WHERE dataset_id = ?', [dsId]); 
    return rows[0] || null; 
  }

  // Reports
  async insertReport(data) {
    await this.pool.execute('INSERT INTO reports (id, dataset_id, report) VALUES (?, ?, ?)', [data.id, data.datasetId, JSON.stringify(data.report)]);
  }
  async getReport(dsId) { 
    const [rows] = await this.pool.execute('SELECT * FROM reports WHERE dataset_id = ?', [dsId]); 
    return rows[0] || null; 
  }

  // Anomalies
  async insertAnomalies(data) {
    await this.pool.execute('INSERT INTO anomaly_results (id, dataset_id, anomalies) VALUES (?, ?, ?)', [data.id, data.datasetId, JSON.stringify(data.anomalies)]);
  }
  async getAnomalies(dsId) { 
    const [rows] = await this.pool.execute('SELECT * FROM anomaly_results WHERE dataset_id = ?', [dsId]); 
    return rows[0] || null; 
  }

  // Chat
  async insertChatMessage(data) {
    await this.pool.execute(
      'INSERT INTO chat_history (id, dataset_id, user_id, question, answer) VALUES (?, ?, ?, ?, ?)',
      [data.id, data.datasetId, data.userId, data.question, JSON.stringify(data.answer)]
    );
  }
  async getChatHistory(dsId) {
    const [rows] = await this.pool.execute('SELECT * FROM chat_history WHERE dataset_id = ? ORDER BY created_at ASC', [dsId]);
    return rows;
  }

  // Data storage for chat queries
  async storeData(datasetId, data) { this.dataCache.set(datasetId, data); }
  async getStoredData(datasetId) { return this.dataCache.get(datasetId) || null; }
}

// ─── In-Memory Store ───────────────────────────────────────────────────────────
class MemoryStore {
  constructor() {
    this.type = 'memory';
    this.tables = {
      users: [], datasets: [], analysis: [], visualizations: [],
      predictions: [], reports: [], anomalies: [], chatHistory: []
    };
    this.dataCache = new Map();
  }

  async initialize() {}

  // Users
  async createUser(data) {
    const user = { ...data, created_at: new Date().toISOString() };
    this.tables.users.push(user);
    return user;
  }
  async findUserByEmail(email) { return this.tables.users.find(u => u.email === email) || null; }
  async findUserById(id) { return this.tables.users.find(u => u.id === id) || null; }

  // Datasets
  async insertDataset(data) {
    const record = { ...data, uploaded_at: new Date().toISOString() };
    this.tables.datasets.push(record);
    return record;
  }
  async updateDatasetStatus(id, status) { const d = this.tables.datasets.find(d => d.id === id); if (d) d.status = status; }
  async getDataset(id) { return this.tables.datasets.find(d => d.id === id) || null; }
  async getAllDatasets(userId) {
    let ds = [...this.tables.datasets];
    if (userId) ds = ds.filter(d => d.userId === userId);
    return ds.reverse();
  }
  async deleteDataset(id) {
    this.tables.datasets = this.tables.datasets.filter(d => d.id !== id);
    this.tables.analysis = this.tables.analysis.filter(a => a.datasetId !== id);
    this.tables.visualizations = this.tables.visualizations.filter(v => v.datasetId !== id);
    this.tables.predictions = this.tables.predictions.filter(p => p.datasetId !== id);
    this.tables.reports = this.tables.reports.filter(r => r.datasetId !== id);
    this.tables.anomalies = this.tables.anomalies.filter(a => a.datasetId !== id);
    this.tables.chatHistory = this.tables.chatHistory.filter(c => c.datasetId !== id);
    this.dataCache.delete(id);
  }

  // Analysis
  async insertAnalysis(data) { this.tables.analysis.push({ ...data, created_at: new Date().toISOString() }); }
  async getAnalysis(dsId) { return this.tables.analysis.find(a => a.datasetId === dsId) || null; }

  // Visualizations
  async insertVisualization(data) { this.tables.visualizations.push({ ...data, created_at: new Date().toISOString() }); }
  async getVisualization(dsId) { return this.tables.visualizations.find(v => v.datasetId === dsId) || null; }

  // Predictions
  async insertPrediction(data) { this.tables.predictions.push({ ...data, created_at: new Date().toISOString() }); }
  async getPrediction(dsId) { return this.tables.predictions.find(p => p.datasetId === dsId) || null; }

  // Reports
  async insertReport(data) { this.tables.reports.push({ ...data, created_at: new Date().toISOString() }); }
  async getReport(dsId) { return this.tables.reports.find(r => r.datasetId === dsId) || null; }

  // Anomalies
  async insertAnomalies(data) { this.tables.anomalies.push({ ...data, created_at: new Date().toISOString() }); }
  async getAnomalies(dsId) { return this.tables.anomalies.find(a => a.datasetId === dsId) || null; }

  // Chat
  async insertChatMessage(data) { this.tables.chatHistory.push({ ...data, created_at: new Date().toISOString() }); }
  async getChatHistory(dsId) { return this.tables.chatHistory.filter(c => c.datasetId === dsId); }

  // Data storage for chat queries
  async storeData(datasetId, data) { this.dataCache.set(datasetId, data); }
  async getStoredData(datasetId) { return this.dataCache.get(datasetId) || null; }
}

// ─── Initialization ────────────────────────────────────────────────────────────
async function initDb() {
  try {
    const mysql = require('mysql2/promise');
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      database: process.env.DB_NAME || 'dataflow',
      user: process.env.DB_USER || 'dataflow_user',
      password: process.env.DB_PASSWORD || 'dataflow_pass',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    store = new MySQLStore(pool);
    await store.initialize();
    console.log('✅ Connected to MySQL');
  } catch (err) {
    store = new MemoryStore();
    console.log('⚠️  MySQL not available — using in-memory storage');
    console.log('   Run "docker compose up -d" to start MySQL\n');
  }
}

function getStore() {
  if (!store) throw new Error('Database not initialized');
  return store;
}

module.exports = { initDb, getStore };
