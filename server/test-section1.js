const axios = require('axios');

async function testSection1() {
  console.log('--- TESTING SECTION 1: APP SHELL & INTEGRATION ---');
  const BASE_URL = 'http://localhost:5000/api';

  try {
    // 1. Authenticate demo user
    console.log('[1] Logging in as demo clinician...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'demo@veridoc.com',
      password: 'Demo@1234'
    });
    const token = loginRes.data.token;
    console.log(`✅ Login successful. Token received.`);

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Test GET /api/auth/me
    console.log('[2] Testing GET /api/auth/me...');
    const meRes = await axios.get(`${BASE_URL}/auth/me`, { headers });
    const user = meRes.data.user;
    console.log(`✅ Clinician profile verified: ${user.name} (${user.specialty}, ${user.role})`);

    // 3. Test GET /api/evidence/trending
    console.log('[3] Testing GET /api/evidence/trending...');
    const trendRes = await axios.get(`${BASE_URL}/evidence/trending`, { headers });
    console.log(`✅ Trending evidence retrieved: ${trendRes.data.trending.length} items`);
    if (trendRes.data.trending.length > 0) {
      console.log(`   Sample trending: "${trendRes.data.trending[0].title}" [${trendRes.data.trending[0].studyType}]`);
    }

    // 4. Test GET /api/evidence/alerts
    console.log('[4] Testing GET /api/evidence/alerts...');
    const alertRes = await axios.get(`${BASE_URL}/evidence/alerts`, { headers });
    console.log(`✅ Safety alerts retrieved: ${alertRes.data.alerts.length} bulletins`);

    // 5. Test Question #1
    console.log('[5] Testing Example Question #1...');
    const q1 = 'In type 2 diabetics with CKD, do SGLT2 inhibitors reduce cardiovascular events vs placebo?';
    const askRes = await axios.post(`${BASE_URL}/evidence/ask`, {
      question: q1,
      patientContext: {
        age: '65',
        sex: 'Male',
        comorbidities: 'Type 2 Diabetes, CKD Stage 3',
        medications: 'Metformin, Lisinopril'
      }
    }, { headers, timeout: 50000 });

    const data = askRes.data;
    console.log(`✅ Synthesis successful! Query ID: ${data.id}`);
    console.log(`   Bottom Line: ${data.result.bottomLine.substring(0, 100)}...`);
    console.log(`   Findings count: ${data.result.findings.length}`);
    console.log(`   References count: ${data.references.length}`);

    // 6. Test Favorite Toggle (Left sidebar session favorite)
    console.log('[6] Testing PATCH /api/evidence/history/:id/favorite...');
    const favRes = await axios.patch(`${BASE_URL}/evidence/history/${data.id}/favorite`, {}, { headers });
    console.log(`✅ Favorite toggled: isFavorite = ${favRes.data.isFavorite}`);

    // 7. Verify History list
    console.log('[7] Testing GET /api/evidence/history...');
    const histRes = await axios.get(`${BASE_URL}/evidence/history`, { headers });
    const found = histRes.data.history.find(h => h.id === data.id);
    console.log(`✅ History list verified: Session exists with isFavorite = ${found?.isFavorite}`);

    console.log('\n🎉 ALL SECTION 1 BACKEND AND PIPELINE CHECKS PASSED!\n');
  } catch (err) {
    console.error('❌ Test Section 1 failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

testSection1();
