const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// 1. Resolve and ensure database directory exists
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/verynth.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 2. Open SQLite database
const db = new Database(dbPath);

// 3. Configure core SQLite PRAGMAs
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * VERYNTH Database Schema
 * Tables: users, projects, migrations, migration_files, test_results, migration_history
 */
function initDatabase() {
  console.log('[DB] Initializing VERYNTH database schema...');

  // --- Users ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // --- Projects ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      source_path TEXT NOT NULL,
      language TEXT DEFAULT 'python',
      status TEXT DEFAULT 'imported',
      dependencies_json TEXT,
      deprecated_apis_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // --- Migrations ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      source_version TEXT NOT NULL,
      target_version TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      model_used TEXT,
      inference_time_ms INTEGER,
      patch_json TEXT,
      summary TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      approved_at TEXT,
      rejected_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // --- Migration Files (individual file changes) ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS migration_files (
      id TEXT PRIMARY KEY,
      migration_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      original_content TEXT NOT NULL,
      migrated_content TEXT NOT NULL,
      changes_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (migration_id) REFERENCES migrations(id) ON DELETE CASCADE
    );
  `);

  // --- Test Results ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_results (
      id TEXT PRIMARY KEY,
      migration_id TEXT NOT NULL,
      test_file TEXT NOT NULL,
      status TEXT NOT NULL,
      output TEXT,
      duration_ms INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (migration_id) REFERENCES migrations(id) ON DELETE CASCADE
    );
  `);

  // --- Migration History / Reports ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS migration_history (
      id TEXT PRIMARY KEY,
      migration_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // --- Indexes ---
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
    CREATE INDEX IF NOT EXISTS idx_migrations_project_id ON migrations(project_id);
    CREATE INDEX IF NOT EXISTS idx_migrations_user_id ON migrations(user_id);
    CREATE INDEX IF NOT EXISTS idx_migration_files_migration_id ON migration_files(migration_id);
    CREATE INDEX IF NOT EXISTS idx_test_results_migration_id ON test_results(migration_id);
    CREATE INDEX IF NOT EXISTS idx_migration_history_migration_id ON migration_history(migration_id);
    CREATE INDEX IF NOT EXISTS idx_migration_history_user_id ON migration_history(user_id);
  `);

  // --- Seed Demo User ---
  const demoUserId = 'usr_demo_verynth';
  const demoEmail = 'demo@verynth.dev';
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(demoEmail);

  if (!existing) {
    const passwordHash = bcrypt.hashSync('Demo@1234', 10);
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(demoUserId, 'Demo Developer', demoEmail, passwordHash, now);
    console.log('[DB] Created demo user (demo@verynth.dev / Demo@1234)');
  }

  console.log('[DB] VERYNTH database initialized successfully.');
}

// Execute initialization synchronously upon module import
initDatabase();

module.exports = db;
