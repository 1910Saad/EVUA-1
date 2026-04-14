import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as db from '../database/queries.js';
import { signToken, authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/auth/register
 */
router.post('/register', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password required' });
  }

  const existing = await db.getUserByUsername(username);
  if (existing) {
    return res.status(409).json({ success: false, error: 'Username already taken' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = await db.createUser(username, hashedPassword);
  
  const token = signToken({ id: userId, username });
  res.status(201).json({ success: true, data: { token, user: { id: userId, username } } });
}));

/**
 * POST /api/auth/login
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  
  const user = await db.getUserByUsername(username);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  const matches = await bcrypt.compare(password, user.password);
  if (!matches) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  const token = signToken(user);
  res.json({ success: true, data: { token, user: { id: user._id, username: user.username } } });
}));

/**
 * GET /api/auth/me
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await db.getUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  res.json({ success: true, data: { id: user._id, username: user.username } });
}));

export default router;
