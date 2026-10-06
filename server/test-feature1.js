const axios = require('axios');

async function testPatientContext() {
  const baseURL = 'http://127.0.0.1:5000/api';
  console.log('[TEST] Logging in demo doctor...');
  const loginRes = await axios.post(`${baseURL}/auth/login`, {
    email: 'demo@veridoc.com',
    password: 'Demo@1234'
  });
  const token = loginRes.data.token;

  console.log('[TEST] Asking question with Patient Context...');
  const askRes = await axios.post(`${baseURL}/evidence/ask`, {
    question: 'In type 2 diabetics with CKD, do SGLT2 inhibitors reduce cardiovascular events vs placebo?',
    patientContext: {
      age: '68',
      sex: 'Female',
      comorbidities: 'CKD stage 3b, hypertension',
      medications: 'Metformin, Lisinopril'
    }
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log('Query ID:', askRes.data.id);
  console.log('Search Query:', askRes.data.searchQuery);
  console.log('Patient Context returned:', askRes.data.patientContext);
  console.log('Findings count:', askRes.data.result.findings.length);
  askRes.data.result.findings.forEach((f, idx) => {
    console.log(`Finding #${idx + 1} [${f.evidenceStrength}]: ${f.claim.slice(0, 60)}...`);
    console.log('  Applicability:', f.applicability);
  });

  console.log('\n[TEST] Verifying history record retrieval...');
  const detailRes = await axios.get(`${baseURL}/evidence/history/${askRes.data.id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Detail patient context:', detailRes.data.patientContext);

  console.log('\nSUCCESS! Feature 1 backend pipeline verified.');
}

testPatientContext().catch(err => {
  console.error('Test error:', err.response?.data || err.message);
  process.exit(1);
});
