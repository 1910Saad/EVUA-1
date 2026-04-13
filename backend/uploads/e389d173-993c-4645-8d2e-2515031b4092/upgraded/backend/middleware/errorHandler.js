/**
 * Agent 4 (DevOps) - Centralized error handling middleware.
 * Catches all unhandled errors and returns consistent JSON responses.
 */

function errorHandler(err, req, res, _next) {
  const timestamp = new Date().toISOString();

  // Log the full error server-side
  console.error(`\n❌ [${timestamp}] Error in ${req.method} ${req.originalUrl}`);
  console.error(`   Message: ${err.message}`);
  if (process.env.NODE_ENV === 'development' && err.stack) {
    console.error(`   Stack: ${err.stack.split('\n').slice(1, 4).join('\n         ')}`);
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File too large',
      message: 'The uploaded file exceeds the 50MB limit.',
      timestamp
    });
  }

  // Multer file type error
  if (err.message === 'Only CSV files are allowed') {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type',
      message: 'Only CSV files are accepted.',
      timestamp
    });
  }

  // CSV parsing error
  if (err.message && err.message.includes('CSV')) {
    return res.status(422).json({
      success: false,
      error: 'Invalid CSV',
      message: 'The uploaded file could not be parsed as valid CSV.',
      timestamp
    });
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? 'Internal server error' : err.message,
    message: process.env.NODE_ENV === 'development'
      ? err.message
      : 'An unexpected error occurred. Please try again.',
    timestamp
  });
}

module.exports = { errorHandler };
