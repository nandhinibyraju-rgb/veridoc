const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// 1. Resolve and ensure database directory exists
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/veridoc.db');
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
 * Clean, sequential, and idempotent database initialization.
 * Guaranteed execution order:
 *  A. Parent tables (users)
 *  B. Child tables (queries, live_updates, notifications)
 *  C. Indexes
 *  D. Safe schema migrations (checked against PRAGMA table_info)
 *  E. Demo user seeding
 *  F. Dependent data seeding (live_updates, notifications)
 */
function initDatabase() {
  console.log('[DB] Initializing database schema and dependencies...');

  // --- Step A: Parent table (users) ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      role TEXT DEFAULT 'doctor',
      specialty TEXT DEFAULT 'Cardiology',
      location TEXT DEFAULT 'Boston, MA',
      institution TEXT DEFAULT 'Mass General Brigham',
      career_stage TEXT DEFAULT 'Attending Physician',
      preferred_specialties TEXT DEFAULT 'Cardiology, Nephrology, Endocrinology',
      default_mode TEXT DEFAULT 'doctor',
      history_retention TEXT DEFAULT 'forever',
      theme TEXT DEFAULT 'light'
    );
  `);

  // --- Step B: Child & Auxiliary tables ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS queries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      question TEXT NOT NULL,
      search_query TEXT,
      result_json TEXT NOT NULL,
      references_json TEXT NOT NULL,
      searched_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      patient_context_json TEXT,
      is_favorite INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS live_updates (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      source TEXT NOT NULL,
      summary TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      pmid TEXT,
      specialty TEXT DEFAULT 'General',
      severity TEXT DEFAULT 'info',
      published_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link_url TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // --- Step C: Indexes ---
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_queries_user_id ON queries(user_id);
    CREATE INDEX IF NOT EXISTS idx_queries_created_at ON queries(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_live_updates_published ON live_updates(published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
  `);

  // --- Step D: Safe Migrations (for pre-existing databases) ---
  const existingUserCols = new Set(db.pragma('table_info(users)').map(col => col.name));
  const userMigrations = [
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
  for (const col of userMigrations) {
    if (!existingUserCols.has(col.name)) {
      db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.def};`);
    }
  }

  const existingQueryCols = new Set(db.pragma('table_info(queries)').map(col => col.name));
  const queryMigrations = [
    { name: 'patient_context_json', def: 'TEXT' },
    { name: 'is_favorite', def: 'INTEGER DEFAULT 0' }
  ];
  for (const col of queryMigrations) {
    if (!existingQueryCols.has(col.name)) {
      db.exec(`ALTER TABLE queries ADD COLUMN ${col.name} ${col.def};`);
    }
  }

  // --- Step E: Seed / Verify Demo User ---
  const demoUserId = 'usr_demo_veridoc';
  const demoEmail = 'demo@veridoc.com';
  const existingUserById = db.prepare('SELECT id, email FROM users WHERE id = ?').get(demoUserId);
  const existingUserByEmail = db.prepare('SELECT id, email FROM users WHERE email = ?').get(demoEmail);

  if (!existingUserById && !existingUserByEmail) {
    const passwordHash = bcrypt.hashSync('Demo@1234', 10);
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO users (
        id, name, email, password_hash, created_at, role, specialty,
        location, institution, career_stage, preferred_specialties,
        default_mode, history_retention, theme
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      demoUserId,
      'Dr. Sarah Chen, MD',
      demoEmail,
      passwordHash,
      now,
      'doctor',
      'Cardiology',
      'Boston, MA',
      'Mass General Brigham',
      'Attending Physician',
      'Cardiology, Nephrology, Endocrinology',
      'doctor',
      'forever',
      'light'
    );
    console.log('[DB] Created demo user (usr_demo_veridoc / demo@veridoc.com)');
  } else if (!existingUserById && existingUserByEmail) {
    // If user existed with demo email under legacy id, align id with demoUserId
    db.prepare('UPDATE users SET id = ? WHERE email = ?').run(demoUserId, demoEmail);
    console.log('[DB] Aligned demo user id to usr_demo_veridoc');
  }

  // --- Step F: Seed Initial Live Updates ---
  const countUpdates = db.prepare('SELECT count(*) as count FROM live_updates').get();
  if (countUpdates.count === 0) {
    const insertUpdate = db.prepare(`
      INSERT OR IGNORE INTO live_updates (id, type, title, source, summary, url, pmid, specialty, severity, published_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    const liveUpdateSeeds = [
      {
        id: 'upd_1',
        type: 'safety_alert',
        title: 'FDA MedWatch: Compounded Semaglutide and Tirzepatide Dosing Errors & Adverse Events',
        source: 'FDA MedWatch',
        summary: 'FDA alerts healthcare providers to serious adverse events and hospitalizations associated with compounded GLP-1 receptor agonists due to incorrect syringe measurement units.',
        url: 'https://www.fda.gov/drugs/drug-safety-and-availability/fda-alerts-health-care-providers-compounders-and-patients-dosing-errors-associated-compounded-injectable',
        pmid: null,
        specialty: 'Endocrinology',
        severity: 'critical',
        published_at: '2024-07-26T12:00:00Z'
      },
      {
        id: 'upd_2',
        type: 'meta_analysis',
        title: 'SGLT2 Inhibitors and Cardiovascular Outcomes Across the Spectrum of Ejection Fraction: A Meta-Analysis',
        source: 'PubMed / The Lancet',
        summary: 'Pooled individual-patient analysis confirming 13% reduction in all-cause mortality and 26% reduction in cardiovascular death or first hospitalization for heart failure across HFrEF and HFpEF cohorts.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/38345521/',
        pmid: '38345521',
        specialty: 'Cardiology',
        severity: 'info',
        published_at: '2024-04-10T08:00:00Z'
      },
      {
        id: 'upd_3',
        type: 'guideline',
        title: '2024 KDIGO Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease',
        source: 'Kidney International / KDIGO',
        summary: 'Updated global consensus guideline elevating non-steroidal mineralocorticoid receptor antagonists (finerenone) and SGLT2 inhibitors as core standard-of-care disease-modifying therapies in type 2 diabetes with CKD.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/38472097/',
        pmid: '38472097',
        specialty: 'Nephrology',
        severity: 'info',
        published_at: '2024-03-15T10:00:00Z'
      },
      {
        id: 'upd_4',
        type: 'rct',
        title: 'Semaglutide in Patients with Obesity-Related Heart Failure with Preserved Ejection Fraction (STEP-HFpEF)',
        source: 'N Engl J Med',
        summary: 'Landmark trial demonstrating that once-weekly semaglutide 2.4 mg produced substantial improvements in KCCQ clinical summary score (mean difference +7.8 points) and significant weight loss.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/38416629/',
        pmid: '38416629',
        specialty: 'Cardiology',
        severity: 'info',
        published_at: '2024-02-28T14:00:00Z'
      },
      {
        id: 'upd_5',
        type: 'safety_alert',
        title: 'CDC Health Alert Network: Disruptions in Availability of Amphetamine and Methylphenidate Formulations',
        source: 'CDC Health Alert',
        summary: 'CDC advises clinicians regarding supply interruptions of prescription stimulants and risks of patients seeking unregulated alternatives or experiencing sudden medication discontinuation symptoms.',
        url: 'https://emergency.cdc.gov/han/2024/han00510.asp',
        pmid: null,
        specialty: 'Psychiatry',
        severity: 'warning',
        published_at: '2024-06-13T09:00:00Z'
      }
    ];

    for (const s of liveUpdateSeeds) {
      insertUpdate.run(s.id, s.type, s.title, s.source, s.summary, s.url, s.pmid, s.specialty, s.severity, s.published_at, now);
    }
    console.log('[DB] Seeded initial live updates and safety alerts');
  }

  // --- Step G: Seed Notifications (ONLY after users, demo user, and notifications table are confirmed) ---
  const countDemoNotifs = db.prepare('SELECT count(*) as count FROM notifications WHERE user_id = ?').get(demoUserId);
  if (countDemoNotifs.count === 0) {
    const insertNotif = db.prepare(`
      INSERT OR IGNORE INTO notifications (id, user_id, type, title, message, link_url, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    insertNotif.run(
      'notif_1',
      demoUserId,
      'safety_alert',
      'FDA MedWatch Alert',
      'Compounded GLP-1 dosing syringe calculation errors reported.',
      'https://www.fda.gov/drugs/drug-safety-and-availability/fda-alerts-health-care-providers-compounders-and-patients-dosing-errors-associated-compounded-injectable',
      0,
      now
    );
    insertNotif.run(
      'notif_2',
      demoUserId,
      'evidence_update',
      'New Cardiology Meta-Analysis',
      'SGLT2 inhibitors trial pooled analysis in The Lancet (PMID 38345521).',
      'https://pubmed.ncbi.nlm.nih.gov/38345521/',
      0,
      now
    );
    console.log('[DB] Seeded demo notifications for usr_demo_veridoc');
  }

  console.log('[DB] Database schema and seeds initialized successfully.');
}

// Execute initialization synchronously upon module import
initDatabase();

module.exports = db;
