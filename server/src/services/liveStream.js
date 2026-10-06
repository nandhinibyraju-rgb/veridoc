const db = require('../db');
const crypto = require('crypto');
const axios = require('axios');

// Set of active SSE client connections: { id, userId, res }
const clients = new Set();

/**
 * Register a new SSE client
 */
function addClient(userId, res) {
  const clientId = crypto.randomUUID();
  const clientObj = { id: clientId, userId, res };
  clients.add(clientObj);

  console.log(`[SSE] Client connected: ${clientId} (User: ${userId}). Total active: ${clients.size}`);

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

  // Send current unread notification count
  try {
    const unread = db.prepare('SELECT count(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(userId);
    res.write(`data: ${JSON.stringify({ type: 'unread_count', count: unread.count })}\n\n`);
  } catch (e) {
    console.error('[SSE] Failed to send initial unread count:', e.message);
  }

  // Handle client disconnection
  res.on('close', () => {
    clients.delete(clientObj);
    console.log(`[SSE] Client disconnected: ${clientId}. Total active: ${clients.size}`);
  });

  return clientId;
}

/**
 * Broadcast event to all connected clients
 */
function broadcast(eventType, payload) {
  const message = `data: ${JSON.stringify({ type: eventType, payload })}\n\n`;
  for (const client of clients) {
    try {
      client.res.write(message);
    } catch (err) {
      console.warn(`[SSE] Failed writing to client ${client.id}:`, err.message);
    }
  }
}

/**
 * Send event to a specific user
 */
function sendToUser(userId, eventType, payload) {
  const message = `data: ${JSON.stringify({ type: eventType, payload })}\n\n`;
  for (const client of clients) {
    if (client.userId === userId) {
      try {
        client.res.write(message);
      } catch (err) {
        console.warn(`[SSE] Failed writing to user ${userId}:`, err.message);
      }
    }
  }
}

// Heartbeat ping every 25 seconds to keep connection alive
setInterval(() => {
  if (clients.size > 0) {
    const pingMessage = `data: ${JSON.stringify({ type: 'ping', timestamp: Date.now() })}\n\n`;
    for (const client of clients) {
      try {
        client.res.write(pingMessage);
      } catch (err) {
        // Ignored, closed handler handles deletion
      }
    }
  }
}, 25000);

/**
 * Insert a new update, broadcast to all connected clients, and create user notification
 */
function publishUpdate({ type, title, source, summary, url, pmid = null, specialty = 'General', severity = 'info' }) {
  const id = `upd_${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT OR REPLACE INTO live_updates (id, type, title, source, summary, url, pmid, specialty, severity, published_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, type, title, source, summary, url, pmid, specialty, severity, now, now);

    const updateObj = { id, type, title, source, summary, url, pmid, specialty, severity, published_at: now, created_at: now };

    // Broadcast new item to all connected SSE clients
    broadcast('new_update', updateObj);

    // Create notifications for all active users
    const users = db.prepare('SELECT id FROM users').all();
    const insertNotif = db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, link_url, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `);

    for (const u of users) {
      const notifId = `notif_${crypto.randomUUID().slice(0, 8)}`;
      insertNotif.run(notifId, u.id, type, title, summary.slice(0, 120) + '...', url, now);
      
      const unread = db.prepare('SELECT count(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(u.id);
      sendToUser(u.id, 'unread_count', { count: unread.count });
    }

    console.log(`[LiveStream] Published update: "${title}" via SSE to ${clients.size} clients.`);
    return updateObj;
  } catch (err) {
    console.error('[LiveStream] Error publishing update:', err.message);
    throw err;
  }
}

/**
 * Poll PubMed for fresh clinical trials / meta-analyses
 */
async function pollPubMedUpdates() {
  try {
    const pubMedUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
    const params = {
      db: 'pubmed',
      term: '(clinical trial[pt] OR meta-analysis[pt]) AND ("2024"[dp] OR "2025"[dp]) AND hasabstract[text]',
      retmode: 'json',
      retmax: 3,
      sort: 'pub_date'
    };

    if (process.env.NCBI_API_KEY) {
      params.api_key = process.env.NCBI_API_KEY;
    }

    const searchRes = await axios.get(pubMedUrl, { params, timeout: 5000 });
    const idList = searchRes.data?.esearchresult?.idlist || [];
    if (idList.length === 0) return 0;

    const summaryUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';
    const sumRes = await axios.get(summaryUrl, {
      params: { db: 'pubmed', id: idList.join(','), retmode: 'json' },
      timeout: 5000
    });

    const resultObj = sumRes.data?.result || {};
    let addedCount = 0;

    for (const pmid of idList) {
      const doc = resultObj[pmid];
      if (!doc) continue;

      const title = doc.title || 'Recent Clinical Evidence Publication';
      const source = doc.source || 'PubMed';
      const pubdate = doc.pubdate || '2024';
      const url = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;

      const existing = db.prepare('SELECT id FROM live_updates WHERE url = ?').get(url);
      if (!existing) {
        publishUpdate({
          type: 'meta_analysis',
          title: title.replace(/\.$/, ''),
          source: `PubMed / ${source}`,
          summary: `Newly indexed clinical publication in ${source} (${pubdate}). Primary record verified on NCBI PubMed.`,
          url,
          pmid: String(pmid),
          specialty: 'Clinical Evidence',
          severity: 'info'
        });
        addedCount++;
      }
    }

    return addedCount;
  } catch (err) {
    console.warn('[LiveStream] PubMed poll notice (graceful fallback):', err.message);
    return 0;
  }
}

// Scheduled poll every 5 minutes
setInterval(pollPubMedUpdates, 5 * 60 * 1000);

module.exports = {
  addClient,
  broadcast,
  sendToUser,
  publishUpdate,
  pollPubMedUpdates
};
