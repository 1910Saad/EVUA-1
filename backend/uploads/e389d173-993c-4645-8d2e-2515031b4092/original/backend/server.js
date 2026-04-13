const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { initDb } = require('./config/db');
const uploadRoutes = require('./routes/upload');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const historyRoutes = require('./routes/history');
const exportRoutes = require('./routes/export');
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/logger');
const { optionalAuth } = require('./middleware/auth');

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
