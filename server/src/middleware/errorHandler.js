function errorHandler(err, req, res, next) {
  console.error('[Error Handler]', err);

  // Zod validation error
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors ? err.errors.map(e => e.message) : err.message
    });
  }

  // Syntax / Invalid JSON in body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Malformed JSON payload'
    });
  }

  // PubMed / NCBI API specific errors
  if (err.isPubMedError) {
    return res.status(502).json({
      error: 'PubMed service communication failed. NCBI servers may be experiencing delays. Please try again.',
      details: err.message
    });
  }

  // LLM API specific errors
  if (err.isLLMError) {
    return res.status(502).json({
      error: 'AI synthesis service error. Please verify API key configuration or try again.',
      details: err.message
    });
  }

  // Generic status or 500
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    error: err.message || 'An unexpected server error occurred. Please try again later.'
  });
}

module.exports = errorHandler;
