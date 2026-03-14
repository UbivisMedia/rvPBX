export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
}

export function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode ?? 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || 'Unexpected server error'
  });
}
