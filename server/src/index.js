require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Initialize database & demo seeds
require('./db');

const authRoutes = require('./routes/auth');
const evidenceRoutes = require('./routes/evidence');
const healthRoutes = require('./routes/health');
const liveRoutes = require('./routes/live');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security middleware
app.use(helmet());
app.set('trust proxy', 1);

// CORS configuration
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman) or matching client url
    if (!origin || origin === allowedOrigin || origin.startsWith('http://localhost:')) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy does not allow access from ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/live', liveRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Centralized error handler
app.use(errorHandler);

const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
  console.log(`=========================================`);
  console.log(`🩺 Veridoc Clinical Evidence Server`);
  console.log(`🚀 Running on http://localhost:${PORT}`);
  console.log(`📡 CORS Client URL: ${allowedOrigin}`);
  console.log(`🔑 NCBI API Key: ${process.env.NCBI_API_KEY ? 'Configured' : 'None (Public Mode)'}`);
  console.log(`🤖 Gemini API Key: ${process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'PASTE_KEY_HERE' ? 'Configured' : 'Using Clinical Synthesis Fallback'}`);
  console.log(`=========================================`);
});

module.exports = { app, server };
