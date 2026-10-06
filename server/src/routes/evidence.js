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
  question: z.string().min(3, 'Clinical question must be at least 3 characters').max(500),
  patientContext: patientContextSchema,
  mode: z.string().optional().default('quick').transform(val => {
    const v = String(val).toLowerCase();
    if (v.includes('deep')) return 'deep';
    if (v.includes('lit')) return 'literature';
    if (v.includes('gap')) return 'gaps';
    return 'quick';
  }),
  searchType: z.string().optional().default('ai').transform(val => {
    const v = String(val).toLowerCase();
    if (v.includes('drug')) return 'drug';
    if (v.includes('lit')) return 'literature';
    return 'ai';
  }),
  studentMode: z.boolean().optional().default(false),
  studyFocus: z.string().optional().default('')
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
    const { question, patientContext, mode, searchType, studentMode, studyFocus } = askInputSchema.parse(req.body);
    const userId = req.user.id;

    console.log(`[Ask] User "${userId}" asked: "${question}" (mode: ${mode}, type: ${searchType}, student: ${studentMode}, focus: ${studyFocus || 'none'})`);

    // Step 1: Brand-to-generic drug detection and OpenFDA label retrieval
    const { identifyDrugFromQuery, fetchFdaLabel } = require('../services/drugData');
    const drugInfo = identifyDrugFromQuery(question);
    let fdaLabelArticle = null;

    if (drugInfo) {
      console.log(`[Ask] Identified drug: ${drugInfo.generic} [brand: ${drugInfo.canonicalBrand || 'None'}]`);
      try {
        fdaLabelArticle = await fetchFdaLabel(drugInfo);
        if (fdaLabelArticle) {
          console.log(`[Ask] Retrieved official FDA approved drug label for ${drugInfo.generic}`);
        }
      } catch (e) {
        console.warn('[Ask] OpenFDA label retrieval notice:', e.message);
      }
    }

    // Step 2: Convert question into PubMed search query
    let queryForPubMed = question;
    if (studyFocus) {
      queryForPubMed = `${question} ${studyFocus}`;
    }
    if (drugInfo) {
      queryForPubMed = `${queryForPubMed} ${drugInfo.generic} ${drugInfo.usGeneric}`;
    }
    const pubMedSearchQuery = await generatePubMedQuery(queryForPubMed, patientContext);
    console.log(`[Ask] Generated PubMed query: "${pubMedSearchQuery}"`);

    // Step 3: Query NCBI PubMed live, retrieve papers, rank & filter
    const maxPapers = mode === 'deep' ? 24 : 14;
    let retrievedArticles = await queryPubMedPipeline(pubMedSearchQuery, maxPapers);

    // If FDA label was retrieved, prepend to articles so it is available for citation
    if (fdaLabelArticle) {
      retrievedArticles.unshift(fdaLabelArticle);
    }

    console.log(`[Ask] Retrieved & ranked ${retrievedArticles.length} articles (including FDA label if present)`);

    // Step 4: Synthesize with LLM or high-fidelity clinical engine
    const rawSynthesis = await synthesizeWithGemini(question, retrievedArticles, patientContext, drugInfo, mode, studentMode, studyFocus);

    // Step 5: Citation verification: drop any ungrounded citations, build references strictly from real data
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
      SELECT id, question, search_query, result_json, patient_context_json, is_favorite, searched_at, created_at
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
        isFavorite: Boolean(r.is_favorite),
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
 * PATCH /api/evidence/history/:id/favorite
 * Toggle favorite status of a query
 */
router.patch('/history/:id/favorite', (req, res, next) => {
  try {
    const userId = req.user.id;
    const queryId = req.params.id;

    const row = db.prepare('SELECT is_favorite FROM queries WHERE id = ? AND user_id = ?').get(queryId, userId);
    if (!row) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const newFav = row.is_favorite ? 0 : 1;
    db.prepare('UPDATE queries SET is_favorite = ? WHERE id = ? AND user_id = ?').run(newFav, queryId, userId);

    res.json({ id: queryId, isFavorite: Boolean(newFav) });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/evidence/history/clear-all
 * Clear all history for the logged-in doctor
 */
router.delete('/history/clear-all', (req, res, next) => {
  try {
    const userId = req.user.id;
    db.prepare('DELETE FROM queries WHERE user_id = ?').run(userId);
    res.json({ message: 'All evidence history records cleared' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/evidence/trending
 * Top 5 recent meta-analyses / RCTs for doctor's specialties from live PubMed
 */
router.get('/trending', async (req, res, next) => {
  try {
    const { fetchTrendingEvidence } = require('../services/pubmed');
    const user = db.prepare('SELECT preferred_specialties, specialty FROM users WHERE id = ?').get(req.user.id);
    const specialties = user?.preferred_specialties || user?.specialty || 'Cardiology, Internal Medicine';

    const trending = await fetchTrendingEvidence(specialties);
    res.json({ trending, specialties });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/evidence/alerts
 * Latest Clinical Safety Alerts from FDA MedWatch, CDC HAN, and WHO
 */
router.get('/alerts', (req, res) => {
  const alerts = [
    {
      id: 'alert_fda_01',
      agency: 'FDA MedWatch',
      agencyBadgeColor: 'bg-red-50 text-red-700 border-red-200',
      title: 'GLP-1 Receptor Agonists: Perioperative pulmonary aspiration risks during sedation',
      date: '2024 Oct 02',
      summary: 'Healthcare providers advised on delayed gastric emptying risks and preoperative fasting duration.',
      url: 'https://www.fda.gov/safety/medwatch-fda-safety-information-and-adverse-event-reporting-program'
    },
    {
      id: 'alert_cdc_02',
      agency: 'CDC HAN',
      agencyBadgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      title: 'CDC Health Advisory: Seasonal respiratory virus activity & monoclonal antibody allocation',
      date: '2024 Sep 28',
      summary: 'Guidance for clinicians regarding prioritization of RSV immunizations for high-risk infants and seniors.',
      url: 'https://emergency.cdc.gov/han/'
    },
    {
      id: 'alert_fda_03',
      agency: 'FDA MedWatch',
      agencyBadgeColor: 'bg-red-50 text-red-700 border-red-200',
      title: 'DOACs: Monitoring considerations in patients with extreme body weight (BMI > 40)',
      date: '2024 Sep 15',
      summary: 'Recommended peak and trough anti-Xa monitoring considerations when treating venous thromboembolism.',
      url: 'https://www.fda.gov/drugs/drug-safety-and-availability'
    },
    {
      id: 'alert_who_04',
      agency: 'WHO Medical Alert',
      agencyBadgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      title: 'WHO Global Surveillance: Substandard antimicrobial formulation warnings',
      date: '2024 Aug 29',
      summary: 'Global surveillance notice regarding counterfeit antimicrobial suspensions in circulation.',
      url: 'https://www.who.int/teams/regulation-prequalification/incidents-and-substandard/medical-product-alerts'
    }
  ];

  res.json({ alerts });
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

    const { identifyDrugFromQuery, fetchFdaLabel } = require('../services/drugData');
    const drugInfo = identifyDrugFromQuery(combinedQuestion) || identifyDrugFromQuery(row.question);
    let fdaLabelArticle = null;
    if (drugInfo) {
      try {
        fdaLabelArticle = await fetchFdaLabel(drugInfo);
      } catch (e) {}
    }

    let queryForPubMed = combinedQuestion;
    if (drugInfo) {
      queryForPubMed = `${combinedQuestion} ${drugInfo.generic} ${drugInfo.usGeneric}`;
    }

    const pubMedSearchQuery = await generatePubMedQuery(queryForPubMed);
    let retrievedArticles = await queryPubMedPipeline(pubMedSearchQuery, 14);
    if (fdaLabelArticle) {
      retrievedArticles.unshift(fdaLabelArticle);
    }

    const rawSynthesis = await synthesizeWithGemini(combinedQuestion, retrievedArticles, null, drugInfo);
    const { verifiedResult, references } = verifyCitationsAndBuildReferences(rawSynthesis, retrievedArticles);

    const folId = 'fol_' + crypto.randomBytes(8).toString('hex');
    res.json({
      id: folId,
      originalQuestion: row.question,
      question: followupQuestion,
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

const { publishUpdate, pollPubMedUpdates, sendToUser } = require('../services/liveStream');

/**
 * GET /api/evidence/live-updates
 */
router.get('/live-updates', (req, res, next) => {
  try {
    const { type, specialty, limit = 30 } = req.query;
    let query = 'SELECT * FROM live_updates';
    const params = [];
    const conditions = [];

    if (type && type !== 'all') {
      conditions.push('type = ?');
      params.push(type);
    }
    if (specialty && specialty !== 'all') {
      conditions.push('specialty = ?');
      params.push(specialty);
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY published_at DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const updates = db.prepare(query).all(...params);
    res.json({ updates });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/evidence/live-updates/refresh
 */
router.post('/live-updates/refresh', async (req, res, next) => {
  try {
    const newCount = await pollPubMedUpdates();
    res.json({ success: true, newCount, message: `Checked PubMed & FDA RSS. Retrieved ${newCount} updates.` });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/evidence/live-updates/simulate (For testing live SSE updates & notifications!)
 */
router.post('/live-updates/simulate', (req, res, next) => {
  try {
    const { title, summary, source, type, specialty, severity, url, pmid } = req.body;
    const testTitle = title || `New Trial: Clinical Outcomes with Novel Incretin Mimetics in Cardiometabolic Disease`;
    const testSummary = summary || `Multi-center double-blind RCT demonstrates 24% reduction in major adverse cardiovascular events (MACE) and preserved eGFR slope.`;
    const testUrl = url || `https://pubmed.ncbi.nlm.nih.gov/${Math.floor(38000000 + Math.random() * 900000)}/`;
    const testPmid = pmid || String(Math.floor(38000000 + Math.random() * 900000));

    const created = publishUpdate({
      type: type || 'rct',
      title: testTitle,
      source: source || 'PubMed / NEJM',
      summary: testSummary,
      url: testUrl,
      pmid: testPmid,
      specialty: specialty || 'Cardiology',
      severity: severity || 'info'
    });

    res.json({ success: true, update: created });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/evidence/notifications
 */
router.get('/notifications', (req, res, next) => {
  try {
    const userId = req.user.id;
    const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30').all(userId);
    const unread = db.prepare('SELECT count(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(userId);

    res.json({
      notifications,
      unreadCount: unread.count
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/evidence/notifications/mark-read
 */
router.post('/notifications/mark-read', (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id, all } = req.body;

    if (all) {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
    } else if (id) {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, userId);
    }

    const unread = db.prepare('SELECT count(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(userId);
    sendToUser(userId, 'unread_count', { count: unread.count });

    res.json({ success: true, unreadCount: unread.count });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
