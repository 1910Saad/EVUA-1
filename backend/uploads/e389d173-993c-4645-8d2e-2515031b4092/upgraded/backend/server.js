import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { initDb } from './config/db';
import uploadRoutes from './routes/upload';
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import historyRoutes from './routes/history';
import exportRoutes from './routes/export';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger';
import { optionalAuth } from './middleware/auth';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(morgan('dev'));
app.use(requestLogger);
app.use(optionalAuth);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', uploadRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/export', exportRoutes);

// Error handling
app.use(errorHandler);

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`\n🚀 DataFlow AI Server — http://localhost:${PORT}`);
    console.log(`   POST /api/upload          Upload & process CSV`);
    console.log(`   POST /api/upload/stream    Upload with SSE streaming`);
    console.log(`   POST /api/auth/register    Register user`);
    console.log(`   POST /api/auth/login       Login`);
    console.log(`   POST /api/chat             Chat with data`);
    console.log(`   GET  /api/history          View past analyses`);
    console.log(`   GET  /api/export/:id/csv   Export cleaned CSV\n`);
  });
}

start().catch(err => { console.error('❌ Failed to start:', err.message); process.exit(1); });
