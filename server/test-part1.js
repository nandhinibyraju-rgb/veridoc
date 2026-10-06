const axios = require('axios');

async function testPart1() {
  console.log('--- TESTING PART 1: RESULTS LAYOUT & QUESTION ---');
  const BASE_URL = 'http://localhost:5000/api';

  try {
    console.log('[1] Logging in as demo clinician...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'demo@veridoc.com',
      password: 'Demo@1234'
    });
    const token = loginRes.data.token;
    console.log('✅ Login successful.');

    const headers = { Authorization: `Bearer ${token}` };

    const question = 'what are the uses of paracetamol tablet';
    console.log(`[2] Asking: "${question}"...`);

    const askRes = await axios.post(`${BASE_URL}/evidence/ask`, {
      question,
      mode: 'Quick',
      searchType: 'AI Search',
      studentMode: false
    }, { headers, timeout: 90000 });

    const data = askRes.data;
    const result = data.result || {};
    console.log('✅ Response status 200 received!');
    console.log('   Title:', result.title || result.headline);
    console.log('   Interpreted As:', result.interpretedAs);
    console.log('   Evidence Confidence:', result.evidenceConfidence);
    console.log('   Sections Count:', result.sections ? result.sections.length : 0);
    if (result.sections) {
      result.sections.forEach((sec, i) => {
        console.log(`     Section ${i + 1}: "${sec.heading}" (citations: ${sec.citations?.join(', ')})`);
      });
    }
    console.log('   Things To Watch:', result.thingsToWatch);
    console.log('   References Count:', data.references ? data.references.length : 0);
    if (data.references && data.references.length > 0) {
      console.log('   Sample Reference 1:', {
        pmid: data.references[0].pmid,
        title: data.references[0].title?.substring(0, 60) + '...',
        authors: data.references[0].authors,
        year: data.references[0].year,
        studyType: data.references[0].studyType
      });
    }
    console.log('\n✅ PART 1 TEST COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Error testing Part 1:', err.response?.data || err.message);
    process.exit(1);
  }
}

testPart1();
