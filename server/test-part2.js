const axios = require('axios');

async function testPart2() {
  console.log('--- TESTING PART 2: DOCTOR MODE VS STUDENT MODE ---');
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

    // 2. Test Doctor Mode inquiry: "what are the uses of paracetamol tablet"
    console.log('\n[2] Testing Doctor Mode inquiry for "what are the uses of paracetamol tablet"...');
    const docRes = await axios.post(`${BASE_URL}/evidence/ask`, {
      question: 'what are the uses of paracetamol tablet',
      patientContext: {
        age: '45',
        sex: 'Female',
        comorbidities: 'Migraine, Osteoarthritis',
        medications: 'None'
      },
      mode: 'quick',
      searchType: 'ai',
      studentMode: false
    }, { headers, timeout: 60000 });

    const docData = docRes.data;
    console.log(`✅ Doctor Mode Synthesis successful! ID: ${docData.id}`);
    console.log(`   Title: "${docData.result.title}"`);
    console.log(`   Interpreted as: "${docData.result.interpretedAs}"`);
    console.log(`   Sections: ${docData.result.sections?.length || 0}`);
    console.log(`   Things to watch: ${docData.result.thingsToWatch?.length || 0}`);
    console.log(`   References count: ${docData.references?.length || 0}`);
    console.log(`   Evidence Confidence: ${docData.result.evidenceConfidence}`);

    // 3. Test Student Mode inquiry: "what are the uses of paracetamol tablet"
    console.log('\n[3] Testing Student Mode inquiry for "what are the uses of paracetamol tablet"...');
    const stuRes = await axios.post(`${BASE_URL}/evidence/ask`, {
      question: 'what are the uses of paracetamol tablet',
      mode: 'quick',
      searchType: 'ai',
      studentMode: true,
      studyFocus: 'Pharmacology'
    }, { headers, timeout: 60000 });

    const stuData = stuRes.data;
    console.log(`✅ Student Mode Synthesis successful! ID: ${stuData.id}`);
    console.log(`   Title: "${stuData.result.title}"`);
    console.log(`   In Simple Words: "${stuData.result.simpleWords?.substring(0, 80)}..."`);
    console.log(`   Mechanism: "${stuData.result.mechanism?.substring(0, 80)}..."`);
    console.log(`   Key Terms count: ${stuData.result.keyTerms?.length || 0}`);
    if (stuData.result.keyTerms?.length > 0) {
      console.log(`   Sample Term: ${stuData.result.keyTerms[0].term} -> ${stuData.result.keyTerms[0].definition}`);
    }
    console.log(`   Remember This: "${stuData.result.rememberThis?.substring(0, 80)}..."`);
    console.log(`   Practice Quiz Questions: ${stuData.result.quiz?.length || 0}`);
    if (stuData.result.quiz?.length > 0) {
      console.log(`   Sample Question: "${stuData.result.quiz[0].question}"`);
      console.log(`   Options: ${JSON.stringify(stuData.result.quiz[0].options)}`);
      console.log(`   Correct Index: ${stuData.result.quiz[0].correctIndex}`);
    }

    // Assertions
    if (!stuData.result.simpleWords) throw new Error('Missing simpleWords in Student Mode');
    if (!stuData.result.mechanism) throw new Error('Missing mechanism in Student Mode');
    if (!stuData.result.keyTerms || stuData.result.keyTerms.length < 3) throw new Error('Key terms must have >= 3 items');
    if (!stuData.result.rememberThis) throw new Error('Missing rememberThis in Student Mode');
    if (!stuData.result.quiz || stuData.result.quiz.length < 3) throw new Error('Quiz must have 3 questions');

    console.log('\n🎉 ALL PART 2 BACKEND VERIFICATIONS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.response?.data || err.message);
    process.exit(1);
  }
}

testPart2();
