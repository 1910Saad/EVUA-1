import mongoose from 'mongoose';
import config from '../config/index.js';
import logger from '../middleware/logger.js';

export async function initDatabase() {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/evua';
    await mongoose.connect(uri);
    logger.info('MongoDB initialized successfully', { path: uri });
    return mongoose.connection;
  } catch (err) {
    logger.error('Failed to connect to MongoDB', { error: err.message });
    throw err;
  }
}

export function getDb() {
  return mongoose.connection;
}
