import logger from './logger.js';

/**
 * Global error handler middleware (Agent 4: DevOps)
 * Catches all unhandled errors and returns consistent JSON responses.
 */
export function errorHandler(err, req, res, _next) {
  // Log full error
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
  });

  // Multer file-size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File too large',
      message: 'The uploaded file exceeds the maximum allowed size (100MB).',
    });
  }

  // Multer unexpected file field
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'Unexpected file field',
      message: 'Please upload using the "project" field name.',
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: err.message,
    });
  }

  // Default 500
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? 'Internal Server Error' : err.message,
    message:
      statusCode === 500
        ? 'An unexpected error occurred. Please try again later.'
        : err.message,
  });
}

/**
 * Wrapper for async route handlers — catches promise rejections.
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default errorHandler;
