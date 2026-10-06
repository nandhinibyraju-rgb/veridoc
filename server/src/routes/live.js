const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { addClient } = require('../services/liveStream');

/**
 * GET /api/live/stream
 * Server-Sent Events (SSE) authenticated stream
 * Supports either Authorization header or ?token= query parameter (for standard EventSource)
 */
router.get('/stream', (req, res) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required for live stream' });
  }

  let decoded;
  try {
    const jwtSecret = process.env.JWT_SECRET || 'veridoc-default-dev-secret-key-change-in-production';
    decoded = jwt.verify(token, jwtSecret);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token for live stream' });
  }

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (res.flushHeaders) res.flushHeaders();

  const userId = decoded.userId || decoded.id;
  addClient(userId, res);
});

module.exports = router;
