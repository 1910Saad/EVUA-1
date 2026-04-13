import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/index.js';
import { initDatabase } from './database/init.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import logger from './middleware/logger.js';

// Routes
import uploadRoutes from './routes/upload.js';
import projectRoutes from './routes/projects.js';
import upgradeRoutes from './routes/upgrade.js';
import downloadRoutes from './routes/download.js';
import authRoutes from './routes/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database
initDatabase();

// Create Express app
const app = express();

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: '*', // Allow all origins for the API since it is split from the frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ─── API Routes ──────────────────────────────────────────────
app.use('/api/upload', uploadRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/upgrade', upgradeRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/auth', authRoutes);

// ─── Health Check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'EVUA Backend',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ─── Base Route (for split environments) ─────────────────────
app.get('/', (req, res) => {
  res.json({ message: "EVUA API is active and running." });
});

// ─── Error Handler ───────────────────────────────────────────
app.use(errorHandler);

// ─── 404 Handler ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ─── Start Server ────────────────────────────────────────────
app.listen(config.port, () => {
  logger.info(`
  ╔══════════════════════════════════════════════╗
  ║     EVUA Backend Server                      ║
  ║     Port: ${String(config.port).padEnd(35)}║
  ║     Env:  ${String(config.nodeEnv).padEnd(35)}║
  ║     DB:   ${String(path.basename(config.databasePath)).padEnd(35)}║
  ╚══════════════════════════════════════════════╝
  `);
});

export default app;
