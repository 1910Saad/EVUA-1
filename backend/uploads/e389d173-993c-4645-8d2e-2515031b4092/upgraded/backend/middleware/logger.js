/**
 * Agent 4 (DevOps) - Request logging middleware.
 * Logs request details with timing for performance monitoring.
 */

function requestLogger(req, res, next) {
  const start = Date.now();

  // Log request start
  const timestamp = new Date().toISOString();
  console.log(`📨 [${timestamp}] ${req.method} ${req.originalUrl}`);

  // Capture response finish for timing
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusIcon = res.statusCode < 400 ? '✅' : '❌';
    console.log(
      `${statusIcon} [${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`
    );
  });

  next();
}

module.exports = { requestLogger };
