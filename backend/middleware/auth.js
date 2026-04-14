import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'evua-super-secret-key-for-dev';

export function authenticate(req, res, next) {
  let token;
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized', message: 'No valid token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Token invalid or expired' });
  }
}

export function signToken(user) {
  return jwt.sign({ id: user._id || user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
}
