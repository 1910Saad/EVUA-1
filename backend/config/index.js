import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const config = {
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',

  // File upload
  uploadDir: path.resolve(rootDir, process.env.UPLOAD_DIR || './uploads'),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 100 * 1024 * 1024, // 100MB

  // Database
  databasePath: path.resolve(rootDir, process.env.DATABASE_PATH || './data/evua.db'),

  // AI Configuration
  ai: {
    apiKey: process.env.AI_API_KEY || '',
    apiUrl: process.env.AI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/',
    model: process.env.AI_MODEL || 'gemini-2.5-flash',
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Paths
  rootDir,
};

export default config;
