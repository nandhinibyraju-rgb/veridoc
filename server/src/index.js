const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../server/.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');

// Initialize database
require('./db');

const authRoutes = require('./routes/auth');
const migrationRoutes = require('./routes/migrations');
const healthRoutes = require('./routes/health');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);
app.set('trust proxy', 1);

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost:')
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
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', migrationRoutes);

// Serve frontend production build
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
  console.log(`[Static] Serving frontend from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(clientDistPath, 'index.html'));
    }
    next();
  });
} else {
  console.warn('[Static] Frontend build not found. Run `npm run build` in client/');
}

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`=========================================`);
  console.log(`⚡ VERYNTH Migration Engine`);
  console.log(`🚀 Running on http://localhost:${PORT}`);
  console.log(`🌐 Frontend: ${clientDistPath ? 'Mounted' : 'Not Built'}`);
  console.log(`🤖 AI Model: Qwen2.5-Coder-7B-Instruct via Ollama`);
  console.log(`📦 Demo Project: ${path.resolve(__dirname, '../../demo-project')}`);
  console.log(`=========================================`);
});

module.exports = app;
