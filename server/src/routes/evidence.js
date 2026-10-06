const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { z } = require('zod');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { askRateLimiter } = require('../middleware/rateLimiter');
const { queryPubMedPipeline } = require('../services/pubmed');
const {
  generatePubMedQuery,
  synthesizeWithGemini,
  verifyCitationsAndBuildReferences
} = require('../services/llm');

const patientContextSchema = z.object({
  age: z.string().optional().default(''),
  sex: z.string().optional().default(''),
  comorbidities: z.string().optional().default(''),
  medications: z.string().optional().default('')
}).optional();

const askInputSchema = z.object({
  question: z.string().min(5, 'Clinical question must be at least 5 characters').max(500),
  patientContext: patientContextSchema
});

const followupInputSchema = z.object({
  followupQuestion: z.string().min(3, 'Follow-up question must be at least 3 characters').max(500)
});

// All evidence routes require authentication
router.use(authMiddleware);

/**
 * POST /api/evidence/ask
 * Main evidence retrieval and verification pipeline
 */
router.post('/ask', askRateLimiter, async (req, res, next) => {
  try {
    const { question, patientContext } = askInputSchema.parse(req.body);
    const userId = req.user.id;

    console.log(`[Ask] User "${userId}" asked: "${question}"`);
    if (patientContext) {
      console.log(`[Ask] Patient context:`, patientContext);
    }

    // Step 3a: Convert question into PubMed search query (tailored with patient context)
    const pubMedSearchQuery = await generatePubMedQuery(question, patientContext);
    console.log(`[Ask] Generated PubMed query: "${pubMedSearchQuery}"`);

    // Step 3b & 3c & 3d: Query NCBI PubMed live, retrieve 12-15 papers, rank & filter
    const retrievedArticles = await queryPubMedPipeline(pubMedSearchQuery, 14);
    console.log(`[Ask] Retrieved & ranked ${retrievedArticles.length} PubMed articles`);

    // Step 3e & 3f: Synthesize with LLM (or fallback engine), validate with Zod
    const rawSynthesis = await synthesizeWithGemini(question, retrievedArticles, patientContext);

    // Step 3g: Citation verification: drop ungrounded PMIDs, build references strictly from real PubMed data
    const { verifiedResult, references } = verifyCitationsAndBuildReferences(rawSynthesis, retrievedArticles);

    const queryId = 'qry_' + crypto.randomBytes(8).toString('hex');
    const now = new Date().toISOString();

    // Step 3h: Save to SQLite (including patient context)
    db.prepare(`
      INSERT INTO queries (id, user_id, question, search_query, result_json, references_json, searched_at, created_at, patient_context_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      queryId,
      userId,
      question.trim(),
      pubMedSearchQuery,
      JSON.stringify(verifiedResult),
      JSON.stringify(references),
      now,
      now,
      JSON.stringify(patientContext || {})
    );

    res.status(200).json({
      id: queryId,
      question: question.trim(),
      patientContext: patientContext || {},
      searchQuery: pubMedSearchQuery,
      result: verifiedResult,
      references,
      searchedAt: now,
      articleCount: retrievedArticles.length
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/evidence/history
 * List past queries for current doctor
 */
router.get('/history', (req, res, next) => {
  try {
    const userId = req.user.id;
    const rows = db.prepare(`
      SELECT id, question, search_query, result_json, patient_context_json, searched_at, created_at
      FROM queries
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId);

    const history = rows.map(r => {
      let parsedResult = {};
      let parsedContext = {};
      try {
        parsedResult = JSON.parse(r.result_json);
      } catch (e) {}
      try {
        if (r.patient_context_json) parsedContext = JSON.parse(r.patient_context_json);
      } catch (e) {}

      return {
        id: r.id,
        question: r.question,
        searchQuery: r.search_query,
        patientContext: parsedContext,
        bottomLine: parsedResult.bottomLine || '',
        findingsCount: parsedResult.findings ? parsedResult.findings.length : 0,
        insufficientEvidence: !!parsedResult.insufficientEvidence,
        searchedAt: r.searched_at,
        createdAt: r.created_at
      };
    });

    res.json({ history });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/evidence/history/:id
 * Retrieve a specific query details and references
 */
router.get('/history/:id', (req, res, next) => {
  try {
    const userId = req.user.id;
    const queryId = req.params.id;

    const row = db.prepare(`
      SELECT id, question, search_query, result_json, references_json, patient_context_json, searched_at, created_at
      FROM queries
      WHERE id = ? AND user_id = ?
    `).get(queryId, userId);

    if (!row) {
      return res.status(404).json({ error: 'Evidence record not found' });
    }

    let patientContext = {};
    try {
      if (row.patient_context_json) patientContext = JSON.parse(row.patient_context_json);
    } catch (e) {}

    res.json({
      id: row.id,
      question: row.question,
      patientContext,
      searchQuery: row.search_query,
      result: JSON.parse(row.result_json),
      references: JSON.parse(row.references_json),
      searchedAt: row.searched_at,
      createdAt: row.created_at
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/evidence/history/:id
 * Delete a past query
 */
router.delete('/history/:id', (req, res, next) => {
  try {
    const userId = req.user.id;
    const queryId = req.params.id;

    const result = db.prepare(`
      DELETE FROM queries
      WHERE id = ? AND user_id = ?
    `).run(queryId, userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Evidence record not found or already deleted' });
    }

    res.json({ message: 'Evidence query record successfully deleted', id: queryId });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/evidence/recheck/:id (Phase 3 Stretch)
 * Re-queries PubMed for updated evidence on an existing question
 */
router.post('/recheck/:id', askRateLimiter, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const queryId = req.params.id;

    const row = db.prepare(`
      SELECT id, question, search_query, patient_context_json FROM queries WHERE id = ? AND user_id = ?
    `).get(queryId, userId);

    if (!row) {
      return res.status(404).json({ error: 'Evidence record not found' });
    }

    let patientContext = {};
    try {
      if (row.patient_context_json) patientContext = JSON.parse(row.patient_context_json);
    } catch (e) {}

    const question = row.question;
    const pubMedSearchQuery = await generatePubMedQuery(question, patientContext);
    const retrievedArticles = await queryPubMedPipeline(pubMedSearchQuery, 14);
    const rawSynthesis = await synthesizeWithGemini(question, retrievedArticles, patientContext);
    const { verifiedResult, references } = verifyCitationsAndBuildReferences(rawSynthesis, retrievedArticles);

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE queries
      SET search_query = ?, result_json = ?, references_json = ?, searched_at = ?
      WHERE id = ? AND user_id = ?
    `).run(
      pubMedSearchQuery,
      JSON.stringify(verifiedResult),
      JSON.stringify(references),
      now,
      queryId,
      userId
    );

    res.json({
      id: queryId,
      question,
      patientContext,
      searchQuery: pubMedSearchQuery,
      result: verifiedResult,
      references,
      searchedAt: now,
      articleCount: retrievedArticles.length,
      isRechecked: true
    });
  } catch (err) {
    next(err);
  }
});


/**
 * POST /api/evidence/followup/:id (Phase 3 Stretch)
 * Follow-up clinical question on existing evidence
 */
router.post('/followup/:id', askRateLimiter, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const queryId = req.params.id;
    const { followupQuestion } = followupInputSchema.parse(req.body);

    const row = db.prepare(`
      SELECT question, references_json FROM queries WHERE id = ? AND user_id = ?
    `).get(queryId, userId);

    if (!row) {
      return res.status(404).json({ error: 'Evidence record not found' });
    }

    const combinedQuestion = `${row.question} - Follow-up: ${followupQuestion}`;
    const pubMedSearchQuery = await generatePubMedQuery(combinedQuestion);
    const retrievedArticles = await queryPubMedPipeline(pubMedSearchQuery, 12);
    const rawSynthesis = await synthesizeWithGemini(combinedQuestion, retrievedArticles);
    const { verifiedResult, references } = verifyCitationsAndBuildReferences(rawSynthesis, retrievedArticles);

    res.json({
      originalQuestion: row.question,
      followupQuestion,
      searchQuery: pubMedSearchQuery,
      result: verifiedResult,
      references,
      searchedAt: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
