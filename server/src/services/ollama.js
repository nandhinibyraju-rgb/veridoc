/**
 * Ollama Integration Service for VERYNTH
 * Connects to local Ollama instance running Qwen2.5-Coder-7B-Instruct
 * Falls back to deterministic migration engine when Ollama is unavailable.
 */
const axios = require('axios');

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL_NAME = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b-instruct';

/**
 * Check if Ollama is running and the model is available
 */
async function checkOllamaStatus() {
  try {
    const resp = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 3000 });
    const models = resp.data?.models || [];
    const hasModel = models.some(m =>
      m.name === MODEL_NAME || m.name.startsWith(MODEL_NAME.split(':')[0])
    );
    return {
      available: true,
      modelLoaded: hasModel,
      models: models.map(m => m.name),
      url: OLLAMA_BASE_URL
    };
  } catch (err) {
    return {
      available: false,
      modelLoaded: false,
      models: [],
      url: OLLAMA_BASE_URL,
      error: err.message
    };
  }
}

/**
 * Generate code migration using Qwen2.5-Coder-7B-Instruct via Ollama
 * @param {string} originalCode - The source code to migrate
 * @param {string} sourceVersion - e.g., "pandas 1.x"
 * @param {string} targetVersion - e.g., "pandas 2.x"
 * @param {string[]} deprecatedApis - List of deprecated API calls found
 * @returns {Object} { migratedCode, explanation, changes, inferenceTimeMs, modelUsed }
 */
async function generateMigration(originalCode, sourceVersion, targetVersion, deprecatedApis) {
  const prompt = buildMigrationPrompt(originalCode, sourceVersion, targetVersion, deprecatedApis);

  // Try Ollama first
  const status = await checkOllamaStatus();
  if (status.available) {
    try {
      const startTime = Date.now();
      const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
        model: MODEL_NAME,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9,
          num_predict: 4096,
          stop: ['```\n\n', '---END---']
        }
      }, {
        timeout: 120000 // 2 minute timeout for inference
      });

      const inferenceTimeMs = Date.now() - startTime;
      const rawResponse = response.data?.response || '';

      const parsed = parseModelResponse(rawResponse, originalCode);

      return {
        migratedCode: parsed.code,
        explanation: parsed.explanation,
        changes: parsed.changes,
        inferenceTimeMs,
        modelUsed: MODEL_NAME,
        source: 'ollama'
      };
    } catch (err) {
      console.warn(`[Ollama] Inference failed, falling back to deterministic engine: ${err.message}`);
    }
  }

  // Fallback: deterministic migration engine
  console.log('[Migration] Using deterministic migration engine (Ollama unavailable)');
  return deterministicMigration(originalCode, sourceVersion, targetVersion, deprecatedApis);
}

/**
 * Build the prompt for the code migration model
 */
function buildMigrationPrompt(originalCode, sourceVersion, targetVersion, deprecatedApis) {
  return `You are an expert Python developer specializing in library migrations. Your task is to migrate code from ${sourceVersion} to ${targetVersion}.

## Deprecated APIs Found
${deprecatedApis.map(api => `- ${api}`).join('\n')}

## Migration Rules
1. Replace \`DataFrame.append(other)\` with \`pd.concat([df, other])\` — preserve the original index behavior. Do NOT add \`ignore_index=True\` unless the original code uses \`ignore_index=True\` in the append call.
2. If the original \`.append()\` uses \`ignore_index=True\`, then use \`pd.concat([df, other], ignore_index=True)\`.
3. Preserve all column structures, data types, and expected output values.
4. Do not change any logic unrelated to the deprecated APIs.
5. Keep all comments and docstrings intact, updating only the deprecation references.

## Original Code
\`\`\`python
${originalCode}
\`\`\`

## Instructions
Return ONLY the complete migrated Python code. Do not include explanations outside the code block.
After the code block, provide a brief summary of changes in this format:

CHANGES:
- [line X] description of change

\`\`\`python
`;
}

/**
 * Parse the model's response to extract migrated code and change descriptions
 */
function parseModelResponse(rawResponse, originalCode) {
  let code = rawResponse;
  let explanation = '';
  const changes = [];

  // Extract code from markdown code block if present
  const codeMatch = rawResponse.match(/```python\s*\n([\s\S]*?)```/);
  if (codeMatch) {
    code = codeMatch[1].trim();
  } else {
    // Try to find code before CHANGES: section
    const changesIdx = rawResponse.indexOf('CHANGES:');
    if (changesIdx > 0) {
      code = rawResponse.substring(0, changesIdx).trim();
    }
    // Clean up any remaining markdown
    code = code.replace(/^```python\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  }

  // Extract changes
  const changesMatch = rawResponse.match(/CHANGES:\s*\n([\s\S]*?)(?:---|$)/);
  if (changesMatch) {
    const changeLines = changesMatch[1].trim().split('\n');
    for (const line of changeLines) {
      const clean = line.replace(/^[-*]\s*/, '').trim();
      if (clean) {
        changes.push(clean);
        explanation += clean + '\n';
      }
    }
  }

  if (!explanation) {
    explanation = `Migrated deprecated APIs from source to target version.`;
  }

  // Validate: if code is empty or too short, return original
  if (!code || code.length < 20) {
    console.warn('[Parse] Model returned empty or too-short code, using deterministic fallback');
    return { code: originalCode, explanation: 'Model output was invalid, no changes applied.', changes: [] };
  }

  return { code, explanation: explanation.trim(), changes };
}

/**
 * Deterministic migration engine — reliable fallback when Ollama is unavailable.
 * Handles DataFrame.append() → pd.concat() transformation with correct semantics.
 */
function deterministicMigration(originalCode, sourceVersion, targetVersion, deprecatedApis) {
  const startTime = Date.now();
  const lines = originalCode.split('\n');
  const migratedLines = [];
  const changes = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const lineNum = i + 1;

    // Pattern 1: result = df.append(other, ignore_index=True)
    const appendIgnoreMatch = line.match(
      /^(\s*)(\w+)\s*=\s*(\w+)\.append\(([^,)]+),\s*ignore_index\s*=\s*True\s*\)/
    );
    if (appendIgnoreMatch) {
      const [, indent, resultVar, dfVar, otherExpr] = appendIgnoreMatch;
      line = `${indent}${resultVar} = pd.concat([${dfVar}, ${otherExpr.trim()}], ignore_index=True)`;
      changes.push(`[Line ${lineNum}] ${dfVar}.append(${otherExpr.trim()}, ignore_index=True) → pd.concat([${dfVar}, ${otherExpr.trim()}], ignore_index=True)`);
    }

    // Pattern 2: result = df.append(other) — no ignore_index
    if (!appendIgnoreMatch) {
      const appendMatch = line.match(
        /^(\s*)(\w+)\s*=\s*(\w+)\.append\(([^)]+)\)/
      );
      if (appendMatch) {
        const [, indent, resultVar, dfVar, otherExpr] = appendMatch;
        // Don't add ignore_index — preserve original index behavior
        line = `${indent}${resultVar} = pd.concat([${dfVar}, ${otherExpr.trim()}])`;
        changes.push(`[Line ${lineNum}] ${dfVar}.append(${otherExpr.trim()}) → pd.concat([${dfVar}, ${otherExpr.trim()}])`);
      }
    }

    // Update deprecation comments
    if (line.includes('DEPRECATED') && line.includes('DataFrame.append')) {
      line = line.replace(
        /DEPRECATED in Pandas 1\.4\+, removed in Pandas 2\.0\./,
        'MIGRATED: DataFrame.append() replaced with pd.concat() for Pandas 2.x compatibility.'
      );
    }
    if (line.includes('DataFrame.append()') && line.includes('deprecated')) {
      line = line.replace(
        /deprecated DataFrame\.append\(\)/gi,
        'pd.concat() (migrated from deprecated DataFrame.append())'
      );
    }

    migratedLines.push(line);
  }

  const migratedCode = migratedLines.join('\n');
  const inferenceTimeMs = Date.now() - startTime;

  const explanation = changes.length > 0
    ? `Applied ${changes.length} migration(s):\n${changes.map(c => `• ${c}`).join('\n')}`
    : 'No deprecated API usages found to migrate.';

  return {
    migratedCode,
    explanation,
    changes,
    inferenceTimeMs,
    modelUsed: 'verynth-deterministic-engine-v1',
    source: 'deterministic'
  };
}

module.exports = {
  checkOllamaStatus,
  generateMigration,
  deterministicMigration,
  MODEL_NAME,
  OLLAMA_BASE_URL
};
