const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Ensure data directory exists
const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'veridoc.db');
const db = new Database(dbPath);

// Enable WAL mode for high concurrency and resilience
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS queries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      question TEXT NOT NULL,
      search_query TEXT,
      result_json TEXT NOT NULL,
      references_json TEXT NOT NULL,
      searched_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_queries_user_id ON queries(user_id);
    CREATE INDEX IF NOT EXISTS idx_queries_created_at ON queries(created_at DESC);
  `);

  // Migration for patient_context_json column
  try {
    db.exec(`ALTER TABLE queries ADD COLUMN patient_context_json TEXT;`);
  } catch (e) {
    // Column already exists, safe to ignore
  }

  // Migration for is_favorite on queries
  try {
    db.exec(`ALTER TABLE queries ADD COLUMN is_favorite INTEGER DEFAULT 0;`);
  } catch (e) {
    // Column already exists, safe to ignore
  }

  // Migration for user profile and preferences columns
  const userColumns = [
    { name: 'role', def: "TEXT DEFAULT 'doctor'" },
    { name: 'specialty', def: "TEXT DEFAULT 'Cardiology'" },
    { name: 'location', def: "TEXT DEFAULT 'Boston, MA'" },
    { name: 'institution', def: "TEXT DEFAULT 'Mass General Brigham'" },
    { name: 'career_stage', def: "TEXT DEFAULT 'Attending Physician'" },
    { name: 'preferred_specialties', def: "TEXT DEFAULT 'Cardiology, Nephrology, Endocrinology'" },
    { name: 'default_mode', def: "TEXT DEFAULT 'doctor'" },
    { name: 'history_retention', def: "TEXT DEFAULT 'forever'" },
    { name: 'theme', def: "TEXT DEFAULT 'light'" }
  ];

  for (const col of userColumns) {
    try {
      db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.def};`);
    } catch (e) {
      // Column already exists, safe to ignore
    }
  }

  // Seed demo user: demo@veridoc.com / Demo@1234
  const existingDemo = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@veridoc.com');
  if (!existingDemo) {
    const demoId = 'usr_demo_veridoc';
    const passwordHash = bcrypt.hashSync('Demo@1234', 10);
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(demoId, 'Dr. Sarah Chen, MD', 'demo@veridoc.com', passwordHash, now);
    console.log('[DB] Seeded demo user: demo@veridoc.com');
  }
}

initDatabase();

module.exports = db;
