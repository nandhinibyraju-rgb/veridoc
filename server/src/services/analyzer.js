/**
 * Project Analysis Service for VERYNTH
 * Handles: dependency scanning, deprecated API detection, file parsing
 */
const fs = require('fs');
const path = require('path');

/**
 * Scan a project directory for Python files
 */
function scanProjectFiles(projectPath) {
  const files = [];

  function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      // Skip hidden dirs, __pycache__, venv, node_modules
      if (entry.isDirectory()) {
        if (!['__pycache__', '.git', 'venv', 'env', 'node_modules', '.venv'].includes(entry.name)) {
          walkDir(fullPath);
        }
      } else if (entry.name.endsWith('.py')) {
        files.push(fullPath);
      }
    }
  }

  walkDir(projectPath);
  return files;
}

/**
 * Parse requirements.txt for dependencies and versions
 */
function parseDependencies(projectPath) {
  const reqPath = path.join(projectPath, 'requirements.txt');
  if (!fs.existsSync(reqPath)) {
    return { found: false, dependencies: [], file: 'requirements.txt' };
  }

  const content = fs.readFileSync(reqPath, 'utf-8');
  const dependencies = [];

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Parse: package==version, package>=version, package
    const match = trimmed.match(/^([a-zA-Z0-9_-]+)\s*([><=!~]+)?\s*(.+)?$/);
    if (match) {
      dependencies.push({
        name: match[1],
        constraint: match[2] || '',
        version: match[3] ? match[3].trim() : 'any',
        raw: trimmed
      });
    }
  }

  return { found: true, dependencies, file: 'requirements.txt' };
}

/**
 * Detect deprecated Pandas API usages in a Python file
 */
function detectDeprecatedApis(fileContent, filePath) {
  const deprecations = [];
  const lines = fileContent.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // DataFrame.append() — deprecated in 1.4, removed in 2.0
    const appendMatch = line.match(/(\w+)\.append\s*\(/);
    if (appendMatch && !line.trim().startsWith('#') && !line.trim().startsWith('"""')) {
      // Check it's not a list.append or string.append
      const context = lines.slice(Math.max(0, i - 5), i + 1).join('\n');
      if (context.includes('DataFrame') || context.includes('pd.') || context.includes('pandas') || context.includes('_df') || context.includes('combined') || context.includes('quarterly') || context.includes('result')) {
        deprecations.push({
          api: 'DataFrame.append()',
          line: lineNum,
          code: line.trim(),
          severity: 'error',
          message: 'DataFrame.append() was deprecated in Pandas 1.4 and removed in Pandas 2.0. Use pd.concat() instead.',
          replacement: 'pd.concat()',
          file: filePath
        });
      }
    }

    // Series.append() — also deprecated
    if (line.match(/\.append\s*\(/) && (line.includes('Series') || line.includes('_series') || line.includes('_sr'))) {
      deprecations.push({
        api: 'Series.append()',
        line: lineNum,
        code: line.trim(),
        severity: 'error',
        message: 'Series.append() was deprecated in Pandas 1.4 and removed in Pandas 2.0. Use pd.concat() instead.',
        replacement: 'pd.concat()',
        file: filePath
      });
    }

    // DataFrame.iteritems() — deprecated
    if (line.match(/\.iteritems\s*\(/)) {
      deprecations.push({
        api: 'DataFrame.iteritems()',
        line: lineNum,
        code: line.trim(),
        severity: 'warning',
        message: 'DataFrame.iteritems() was deprecated in Pandas 1.5 and removed in Pandas 2.0. Use .items() instead.',
        replacement: '.items()',
        file: filePath
      });
    }
  }

  return deprecations;
}

/**
 * Full project analysis: scan files, parse deps, detect deprecated APIs
 */
function analyzeProject(projectPath) {
  const srcPath = path.join(projectPath, 'src');
  const analysisPath = fs.existsSync(srcPath) ? srcPath : projectPath;

  const pyFiles = scanProjectFiles(analysisPath);
  const deps = parseDependencies(projectPath);
  const allDeprecations = [];
  const fileContents = {};

  for (const filePath of pyFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(projectPath, filePath);
    fileContents[relativePath] = content;

    const deprecations = detectDeprecatedApis(content, relativePath);
    allDeprecations.push(...deprecations);
  }

  // Determine current and suggested target versions
  const pandasDep = deps.dependencies.find(d => d.name.toLowerCase() === 'pandas');
  const currentVersion = pandasDep ? pandasDep.version : 'unknown';
  const suggestedTarget = '2.2.0';

  return {
    projectPath,
    files: pyFiles.map(f => path.relative(projectPath, f)),
    fileContents,
    dependencies: deps,
    deprecatedApis: allDeprecations,
    currentVersion: `pandas ${currentVersion}`,
    suggestedTarget: `pandas ${suggestedTarget}`,
    summary: {
      totalFiles: pyFiles.length,
      totalDeprecations: allDeprecations.length,
      affectedFiles: new Set(allDeprecations.map(d => d.file)).size,
      severity: allDeprecations.some(d => d.severity === 'error') ? 'high' : 'low'
    }
  };
}

module.exports = {
  scanProjectFiles,
  parseDependencies,
  detectDeprecatedApis,
  analyzeProject
};
