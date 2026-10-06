require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

// Initialize database & demo seeds
require('./db');

const authRoutes = require('./routes/auth');
const evidenceRoutes = require('./routes/evidence');
const healthRoutes = require('./routes/health');
const liveRoutes = require('./routes/live');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security middleware - disable CSP to allow Google Fonts and client assets in production
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);
app.set('trust proxy', 1);

// CORS configuration - allow Render and Vercel production URLs, localhost origins, and custom CLIENT_URL
const allowedOrigins = [
  'https://veridoc-y2st.onrender.com',
  'https://veridoc-zeta.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like same-origin browser requests, mobile apps, curl) or matching allowed origins
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.endsWith('.onrender.com') ||
        origin.endsWith('.vercel.app')
      ) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy does not allow access from ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// 1. Mount API Routes first (never intercepted by frontend fallback)
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/live', liveRoutes);

// 2. Locate frontend production build directory
const candidateDistPaths = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), '../client/dist')
];

let clientDistPath = null;
for (const candidate of candidateDistPaths) {
  if (fs.existsSync(path.join(candidate, 'index.html'))) {
    clientDistPath = candidate;
    break;
  }
}

if (clientDistPath) {
  console.log(`[Static] Serving production frontend from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  // SPA fallback for all non-API GET requests (returns index.html for client-side routing)
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(clientDistPath, 'index.html'));
    }
    next();
  });
} else {
  console.warn('[Static] Frontend build directory (client/dist) not found. Checked:', candidateDistPaths);
}

// 3. 404 handler for unknown API routes or unresolved assets
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// 4. Centralized error handler
app.use(errorHandler);

// Listen on process.env.PORT || 10000 (standard Render port)
const PORT = parseInt(process.env.PORT || '10000', 10);
const HOST = '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
  console.log(`=========================================`);
  console.log(`🩺 Veridoc Clinical Evidence Server`);
  console.log(`🚀 Running on http://localhost:${PORT}`);
  console.log(`🌐 Production Frontend: ${clientDistPath ? 'Mounted & Active' : 'Not Found'}`);
  console.log(`📡 CORS Allowed Origins: ${allowedOrigins.join(', ')}`);
  console.log(`🔑 NCBI API Key: ${process.env.NCBI_API_KEY ? 'Configured' : 'None (Public Mode)'}`);
  console.log(`🤖 Gemini API Key: ${process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'PASTE_KEY_HERE' ? 'Configured' : 'Using Clinical Synthesis Fallback'}`);
  console.log(`=========================================`);
});

module.exports = { app, server };
