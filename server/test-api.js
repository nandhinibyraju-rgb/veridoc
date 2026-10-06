const axios = require('axios');

async function runTest() {
  const baseURL = 'http://127.0.0.1:5000/api';
  console.log('[TEST] Starting backend integration tests against', baseURL);

  // 1. Health Check
  console.log('\n--- 1. Testing GET /api/health ---');
  const healthRes = await axios.get(`${baseURL}/health`);
  console.log('Health Response:', healthRes.data);
  if (!healthRes.data.ok) throw new Error('Health check failed');

  // 2. Auth Login with Demo User
  console.log('\n--- 2. Testing POST /api/auth/login (Demo User) ---');
  const loginRes = await axios.post(`${baseURL}/auth/login`, {
    email: 'demo@veridoc.com',
    password: 'Demo@1234'
  });
  console.log('Login Response:', {
    message: loginRes.data.message,
    user: loginRes.data.user,
    tokenPrefix: loginRes.data.token.slice(0, 25) + '...'
  });
  const token = loginRes.data.token;

  // 3. Ask Question (Example question from requirements)
  const question = "In type 2 diabetics with CKD, do SGLT2 inhibitors reduce cardiovascular events vs placebo?";
  console.log('\n--- 3. Testing POST /api/evidence/ask ---');
  console.log('Question:', question);
  console.log('Fetching live PubMed data and generating evidence synthesis...');

  const askRes = await axios.post(
    `${baseURL}/evidence/ask`,
    { question },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  console.log('\n[EVIDENCE RESULT RECEIVED]');
  console.log('Query ID:', askRes.data.id);
  console.log('Search Query:', askRes.data.searchQuery);
  console.log('Article Count:', askRes.data.articleCount);
  console.log('Bottom Line:', askRes.data.result.bottomLine);
  console.log('Findings count:', askRes.data.result.findings.length);
  askRes.data.result.findings.forEach((f, i) => {
    console.log(`  Finding ${i + 1} [${f.evidenceStrength}]: ${f.claim.slice(0, 80)}... (PMIDs: ${f.pmids.join(', ')})`);
  });
  console.log('References count:', askRes.data.references.length);
  if (askRes.data.references.length > 0) {
    console.log('Sample Reference 1:', {
      pmid: askRes.data.references[0].pmid,
      title: askRes.data.references[0].title.slice(0, 70) + '...',
      studyType: askRes.data.references[0].studyType,
      year: askRes.data.references[0].year,
      olderThan5Y: askRes.data.references[0].isOlderThan5Years
    });
  }

  // 4. Test History
  console.log('\n--- 4. Testing GET /api/evidence/history ---');
  const histRes = await axios.get(`${baseURL}/evidence/history`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`History items returned: ${histRes.data.history.length}`);
  const firstItem = histRes.data.history[0];
  console.log('Latest history item:', {
    id: firstItem.id,
    question: firstItem.question,
    searchedAt: firstItem.searchedAt
  });

  // 5. Test History Detail
  console.log('\n--- 5. Testing GET /api/evidence/history/:id ---');
  const detailRes = await axios.get(`${baseURL}/evidence/history/${firstItem.id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Detail returned matching question:', detailRes.data.question === question);

  console.log('\n All backend tests passed successfully!');
  process.exit(0);
}

runTest().catch(err => {
  console.error('\n❌ Test failed:', err.response?.data || err.message);
  process.exit(1);
});
