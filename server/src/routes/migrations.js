/**
 * VERYNTH Project & Migration API Routes
 * Handles project import, analysis, migration generation, testing, approval/rejection, and history.
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { analyzeProject } = require('../services/analyzer');
const { generateMigration, checkOllamaStatus, MODEL_NAME } = require('../services/ollama');

// Resolve the trusted demo project path
const DEMO_PROJECT_PATH = path.resolve(__dirname, '../../../demo-project');

// Allowed project paths — SECURITY: only trusted demo project allowed
const ALLOWED_PROJECT_PATHS = new Set([
  DEMO_PROJECT_PATH,
  path.resolve(DEMO_PROJECT_PATH)
]);

function isAllowedPath(inputPath) {
  const resolved = path.resolve(inputPath);
  for (const allowed of ALLOWED_PROJECT_PATHS) {
    if (resolved.startsWith(allowed)) return true;
  }
  return false;
}

// ==================== PROJECT ROUTES ====================

// GET /api/projects — list user's projects
router.get('/projects', authMiddleware, (req, res) => {
  const projects = db.prepare(`
    SELECT id, name, description, language, status, dependencies_json,
           deprecated_apis_json, created_at, updated_at
    FROM projects WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(req.user.id);

  res.json({
    projects: projects.map(p => ({
      ...p,
      dependencies: p.dependencies_json ? JSON.parse(p.dependencies_json) : null,
      deprecatedApis: p.deprecated_apis_json ? JSON.parse(p.deprecated_apis_json) : null
    }))
  });
});

// POST /api/projects/import — import the trusted demo project
router.post('/projects/import', authMiddleware, (req, res) => {
  try {
    const { name, description } = req.body;

    // SECURITY: Only the trusted demo project can be imported
    if (!fs.existsSync(DEMO_PROJECT_PATH)) {
      return res.status(404).json({ error: 'Demo project not found. Ensure demo-project/ directory exists.' });
    }

    const projectId = 'proj_' + crypto.randomBytes(8).toString('hex');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO projects (id, user_id, name, description, source_path, language, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'python', 'imported', ?, ?)
    `).run(
      projectId,
      req.user.id,
      name || 'Pandas Sample Project',
      description || 'Sample data pipeline using Pandas 1.x with deprecated DataFrame.append() calls',
      DEMO_PROJECT_PATH,
      now,
      now
    );

    // Record history
    db.prepare(`
      INSERT INTO migration_history (id, migration_id, user_id, action, details, created_at)
      VALUES (?, ?, ?, 'project_imported', ?, ?)
    `).run(
      'hist_' + crypto.randomBytes(8).toString('hex'),
      projectId,
      req.user.id,
      JSON.stringify({ projectName: name || 'Pandas Sample Project' }),
      now
    );

    res.status(201).json({
      message: 'Project imported successfully',
      project: {
        id: projectId,
        name: name || 'Pandas Sample Project',
        status: 'imported',
        sourcePath: DEMO_PROJECT_PATH
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/analyze — analyze dependencies and deprecated APIs
router.post('/projects/:id/analyze', authMiddleware, (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!isAllowedPath(project.source_path)) {
      return res.status(403).json({ error: 'Project path is not in the allowed list' });
    }

    const analysis = analyzeProject(project.source_path);
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE projects
      SET dependencies_json = ?, deprecated_apis_json = ?, status = 'analyzed', updated_at = ?
      WHERE id = ?
    `).run(
      JSON.stringify(analysis.dependencies),
      JSON.stringify(analysis.deprecatedApis),
      now,
      project.id
    );

    res.json({
      message: 'Analysis complete',
      analysis: {
        files: analysis.files,
        dependencies: analysis.dependencies,
        deprecatedApis: analysis.deprecatedApis,
        currentVersion: analysis.currentVersion,
        suggestedTarget: analysis.suggestedTarget,
        summary: analysis.summary
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== MIGRATION ROUTES ====================

// POST /api/migrations/generate — generate migration using AI
router.post('/migrations/generate', authMiddleware, async (req, res) => {
  try {
    const { projectId, targetVersion } = req.body;

    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!isAllowedPath(project.source_path)) {
      return res.status(403).json({ error: 'Project path is not allowed' });
    }

    const deprecatedApis = project.deprecated_apis_json ? JSON.parse(project.deprecated_apis_json) : [];
    const deps = project.dependencies_json ? JSON.parse(project.dependencies_json) : { dependencies: [] };
    const pandasDep = deps.dependencies ? deps.dependencies.find(d => d.name === 'pandas') : null;
    const sourceVersion = pandasDep ? `pandas ${pandasDep.version}` : 'pandas 1.x';
    const target = targetVersion || 'pandas 2.x';

    const migrationId = 'mig_' + crypto.randomBytes(8).toString('hex');
    const now = new Date().toISOString();

    // Create migration record
    db.prepare(`
      INSERT INTO migrations (id, project_id, user_id, source_version, target_version, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'processing', ?)
    `).run(migrationId, project.id, req.user.id, sourceVersion, target, now);

    // Read source files and generate migrations
    const srcDir = path.join(project.source_path, 'src');
    const analysisDir = fs.existsSync(srcDir) ? srcDir : project.source_path;
    const pyFiles = [];

    function findPyFiles(dir) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && !['__pycache__', '.git', 'venv', 'node_modules'].includes(entry.name)) {
          findPyFiles(full);
        } else if (entry.name.endsWith('.py')) {
          pyFiles.push(full);
        }
      }
    }
    findPyFiles(analysisDir);

    const migrationResults = [];
    let totalInferenceTime = 0;
    let modelUsed = '';

    for (const filePath of pyFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const relativePath = path.relative(project.source_path, filePath);

      // Check if file has deprecated APIs
      const fileDeprecations = deprecatedApis.filter(d => d.file === relativePath);
      if (fileDeprecations.length === 0) continue;

      const result = await generateMigration(
        content,
        sourceVersion,
        target,
        fileDeprecations.map(d => d.api)
      );

      totalInferenceTime += result.inferenceTimeMs;
      modelUsed = result.modelUsed;

      // Store file migration
      const fileId = 'mf_' + crypto.randomBytes(8).toString('hex');
      db.prepare(`
        INSERT INTO migration_files (id, migration_id, file_path, original_content, migrated_content, changes_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        fileId, migrationId, relativePath,
        content, result.migratedCode,
        JSON.stringify(result.changes), now
      );

      migrationResults.push({
        id: fileId,
        filePath: relativePath,
        originalCode: content,
        migratedCode: result.migratedCode,
        changes: result.changes,
        explanation: result.explanation
      });
    }

    // Update migration record
    const completedAt = new Date().toISOString();
    db.prepare(`
      UPDATE migrations
      SET status = 'completed', model_used = ?, inference_time_ms = ?,
          patch_json = ?, summary = ?, completed_at = ?
      WHERE id = ?
    `).run(
      modelUsed, totalInferenceTime,
      JSON.stringify(migrationResults.map(r => ({ file: r.filePath, changes: r.changes }))),
      `Migrated ${migrationResults.length} file(s) with ${migrationResults.reduce((sum, r) => sum + r.changes.length, 0)} change(s)`,
      completedAt, migrationId
    );

    // Record history
    db.prepare(`
      INSERT INTO migration_history (id, migration_id, user_id, action, details, created_at)
      VALUES (?, ?, ?, 'migration_generated', ?, ?)
    `).run(
      'hist_' + crypto.randomBytes(8).toString('hex'),
      migrationId, req.user.id,
      JSON.stringify({ modelUsed, inferenceTimeMs: totalInferenceTime, filesChanged: migrationResults.length }),
      completedAt
    );

    res.json({
      message: 'Migration generated successfully',
      migration: {
        id: migrationId,
        sourceVersion,
        targetVersion: target,
        modelUsed,
        inferenceTimeMs: totalInferenceTime,
        status: 'completed',
        files: migrationResults
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/migrations/:id — get migration details
router.get('/migrations/:id', authMiddleware, (req, res) => {
  const migration = db.prepare(`
    SELECT m.*, p.name as project_name
    FROM migrations m
    JOIN projects p ON m.project_id = p.id
    WHERE m.id = ? AND m.user_id = ?
  `).get(req.params.id, req.user.id);

  if (!migration) {
    return res.status(404).json({ error: 'Migration not found' });
  }

  const files = db.prepare('SELECT * FROM migration_files WHERE migration_id = ?').all(migration.id);
  const tests = db.prepare('SELECT * FROM test_results WHERE migration_id = ?').all(migration.id);

  res.json({
    migration: {
      ...migration,
      patch: migration.patch_json ? JSON.parse(migration.patch_json) : null,
      files,
      tests
    }
  });
});

// GET /api/migrations — list user's migrations
router.get('/migrations', authMiddleware, (req, res) => {
  const migrations = db.prepare(`
    SELECT m.id, m.project_id, m.source_version, m.target_version, m.status,
           m.model_used, m.inference_time_ms, m.summary, m.created_at, m.completed_at,
           m.approved_at, m.rejected_at, p.name as project_name
    FROM migrations m
    JOIN projects p ON m.project_id = p.id
    WHERE m.user_id = ?
    ORDER BY m.created_at DESC
  `).all(req.user.id);

  res.json({ migrations });
});

// ==================== TEST EXECUTION ====================

// POST /api/migrations/:id/test — run tests against migrated code
router.post('/migrations/:id/test', authMiddleware, (req, res) => {
  try {
    const migration = db.prepare(`
      SELECT m.*, p.source_path FROM migrations m
      JOIN projects p ON m.project_id = p.id
      WHERE m.id = ? AND m.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!migration) {
      return res.status(404).json({ error: 'Migration not found' });
    }

    // SECURITY: Only allow test execution on the trusted demo project
    if (!isAllowedPath(migration.source_path)) {
      return res.status(403).json({
        error: 'Test execution is restricted to the trusted demonstration project only. ' +
               'Arbitrary repository test execution is not supported for security reasons.'
      });
    }

    // Get migrated files
    const migratedFiles = db.prepare('SELECT * FROM migration_files WHERE migration_id = ?').all(migration.id);

    // Create temporary directory for test execution
    const tmpDir = path.join(migration.source_path, '.verynth_test_tmp');
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }

    // Copy project structure to temp dir
    copyDirSync(migration.source_path, tmpDir, ['.verynth_test_tmp', '__pycache__', '.git']);

    // Apply migrated code to temp copy
    for (const file of migratedFiles) {
      const targetPath = path.join(tmpDir, file.file_path);
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.writeFileSync(targetPath, file.migrated_content, 'utf-8');
    }

    // Run tests
    const testDir = path.join(tmpDir, 'tests');
    const testResults = [];

    if (fs.existsSync(testDir)) {
      const testFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.py') && f.startsWith('test_'));

      for (const testFile of testFiles) {
        const testPath = path.join(testDir, testFile);
        const testId = 'tr_' + crypto.randomBytes(8).toString('hex');
        const startTime = Date.now();

        let status = 'passed';
        let output = '';

        try {
          // SECURITY: Execute only test files from the trusted demo project
          // Timeout: 30 seconds max per test
          output = execSync(`python "${testPath}"`, {
            timeout: 30000,
            cwd: tmpDir,
            encoding: 'utf-8',
            env: { ...process.env, PYTHONPATH: path.join(tmpDir, 'src'), PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
            stdio: ['pipe', 'pipe', 'pipe']
          });
          status = 'passed';
        } catch (execErr) {
          status = 'failed';
          output = (execErr.stdout || '') + '\n' + (execErr.stderr || '');
        }

        const durationMs = Date.now() - startTime;
        const now = new Date().toISOString();

        db.prepare(`
          INSERT INTO test_results (id, migration_id, test_file, status, output, duration_ms, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(testId, migration.id, testFile, status, output, durationMs, now);

        testResults.push({
          id: testId,
          file: testFile,
          status,
          output: output.trim(),
          durationMs
        });
      }
    }

    // Cleanup temp directory
    try {
      fs.rmSync(tmpDir, { recursive: true });
    } catch (e) {
      console.warn('[Test] Failed to clean temp dir:', e.message);
    }

    // Record history
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO migration_history (id, migration_id, user_id, action, details, created_at)
      VALUES (?, ?, ?, 'tests_executed', ?, ?)
    `).run(
      'hist_' + crypto.randomBytes(8).toString('hex'),
      migration.id, req.user.id,
      JSON.stringify({
        total: testResults.length,
        passed: testResults.filter(t => t.status === 'passed').length,
        failed: testResults.filter(t => t.status === 'failed').length
      }),
      now
    );

    res.json({
      message: `Tests completed: ${testResults.filter(t => t.status === 'passed').length}/${testResults.length} passed`,
      results: testResults
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== APPROVAL / REJECTION ====================

// POST /api/migrations/:id/approve
router.post('/migrations/:id/approve', authMiddleware, (req, res) => {
  const migration = db.prepare('SELECT * FROM migrations WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!migration) {
    return res.status(404).json({ error: 'Migration not found' });
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE migrations SET status = ?, approved_at = ? WHERE id = ?').run('approved', now, migration.id);

  db.prepare(`
    INSERT INTO migration_history (id, migration_id, user_id, action, details, created_at)
    VALUES (?, ?, ?, 'migration_approved', ?, ?)
  `).run(
    'hist_' + crypto.randomBytes(8).toString('hex'),
    migration.id, req.user.id,
    JSON.stringify({ approvedAt: now }),
    now
  );

  res.json({ message: 'Migration approved', status: 'approved' });
});

// POST /api/migrations/:id/reject
router.post('/migrations/:id/reject', authMiddleware, (req, res) => {
  const migration = db.prepare('SELECT * FROM migrations WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!migration) {
    return res.status(404).json({ error: 'Migration not found' });
  }

  const now = new Date().toISOString();
  const reason = req.body.reason || 'No reason provided';
  db.prepare('UPDATE migrations SET status = ?, rejected_at = ? WHERE id = ?').run('rejected', now, migration.id);

  db.prepare(`
    INSERT INTO migration_history (id, migration_id, user_id, action, details, created_at)
    VALUES (?, ?, ?, 'migration_rejected', ?, ?)
  `).run(
    'hist_' + crypto.randomBytes(8).toString('hex'),
    migration.id, req.user.id,
    JSON.stringify({ rejectedAt: now, reason }),
    now
  );

  res.json({ message: 'Migration rejected', status: 'rejected', reason });
});

// ==================== HISTORY ====================

// GET /api/history — get user's migration history
router.get('/history', authMiddleware, (req, res) => {
  const history = db.prepare(`
    SELECT h.*, m.source_version, m.target_version, m.status as migration_status, p.name as project_name
    FROM migration_history h
    LEFT JOIN migrations m ON h.migration_id = m.id
    LEFT JOIN projects p ON m.project_id = p.id
    WHERE h.user_id = ?
    ORDER BY h.created_at DESC
    LIMIT 100
  `).all(req.user.id);

  res.json({
    history: history.map(h => ({
      ...h,
      details: h.details ? JSON.parse(h.details) : null
    }))
  });
});

// ==================== OLLAMA STATUS ====================

// GET /api/ollama/status
router.get('/ollama/status', authMiddleware, async (req, res) => {
  const status = await checkOllamaStatus();
  res.json({
    ...status,
    requiredModel: MODEL_NAME,
    fallbackAvailable: true,
    fallbackEngine: 'verynth-deterministic-engine-v1'
  });
});

// ==================== UTILITY ====================

function copyDirSync(src, dest, excludeDirs = []) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (excludeDirs.includes(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath, excludeDirs);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

module.exports = router;
