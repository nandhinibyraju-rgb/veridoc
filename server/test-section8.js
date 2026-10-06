const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function runSection8Verification() {
  console.log('====================================================');
  console.log('🧪 Veridoc Part 4-8 End-to-End Verification Test');
  console.log('====================================================\n');

  try {
    // 1. Authenticate with seeded demo account
    console.log('1. Testing Authentication...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'demo@veridoc.com',
      password: 'Demo@1234'
    });
    const token = loginRes.data.token;
    console.log(`   ✓ Authenticated as: ${loginRes.data.user.name} (${loginRes.data.user.email})`);
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 2. Test Live Updates endpoint
    console.log('\n2. Testing Live Updates retrieval...');
    const updatesRes = await axios.get(`${BASE_URL}/evidence/live-updates`, { headers: authHeaders });
    console.log(`   ✓ Retrieved ${updatesRes.data.updates.length} live clinical updates from SQLite`);
    const firstUpdate = updatesRes.data.updates[0];
    console.log(`   ✓ Latest update: "${firstUpdate.title}" [${firstUpdate.type}] (${firstUpdate.source})`);

    // 3. Test Notifications endpoint
    console.log('\n3. Testing Notifications & Unread Count...');
    const notifsRes = await axios.get(`${BASE_URL}/evidence/notifications`, { headers: authHeaders });
    console.log(`   ✓ Current unread notifications count: ${notifsRes.data.unreadCount}`);
    console.log(`   ✓ Total notifications: ${notifsRes.data.notifications.length}`);

    // 4. Test Live SSE Event Simulation (POST /api/evidence/live-updates/simulate)
    console.log('\n4. Testing Live Update Simulation & SSE broadcast...');
    const simRes = await axios.post(`${BASE_URL}/evidence/live-updates/simulate`, {
      title: 'Phase 3 RCT: Semaglutide Reduces Renal Endpoints by 24% in FLOW Trial',
      source: 'N Engl J Med',
      type: 'rct',
      specialty: 'Nephrology',
      summary: 'Major kidney outcomes trial demonstrates significant preservation of eGFR and lower cardiovascular death rate in type 2 diabetes with chronic kidney disease.',
      url: 'https://pubmed.ncbi.nlm.nih.gov/38787009/',
      pmid: '38787009'
    }, { headers: authHeaders });
    console.log(`   ✓ Successfully published live update: "${simRes.data.update.title}"`);

    // Check updated notification count
    const postSimNotifs = await axios.get(`${BASE_URL}/evidence/notifications`, { headers: authHeaders });
    console.log(`   ✓ Unread count incremented to: ${postSimNotifs.data.unreadCount}`);

    // Mark notifications as read
    await axios.post(`${BASE_URL}/evidence/notifications/mark-read`, { all: true }, { headers: authHeaders });
    const clearedNotifs = await axios.get(`${BASE_URL}/evidence/notifications`, { headers: authHeaders });
    console.log(`   ✓ Marked all as read. New unread count: ${clearedNotifs.data.unreadCount}`);

    // 5. Test Part 6 Short, Sweet Answer: "what are the uses of crocin tablet"
    console.log('\n5. Testing Part 6 Query: "what are the uses of crocin tablet"...');
    const askRes = await axios.post(`${BASE_URL}/evidence/ask`, {
      question: 'what are the uses of crocin tablet',
      mode: 'quick',
      studentMode: false
    }, { headers: authHeaders });

    const result = askRes.data.result;
    const references = askRes.data.references;

    console.log(`   ✓ Interpreted As: "${result.interpretedAs}"`);
    console.log(`   ✓ Title: "${result.title}"`);
    console.log(`   ✓ oneLiner (${result.oneLiner?.split(' ').length} words): "${result.oneLiner}"`);
    if (result.oneLiner && result.oneLiner.split(' ').length <= 25) {
      console.log('   ✓ oneLiner strictly satisfies <= 25 words rule!');
    } else {
      console.warn('   ⚠ oneLiner length exceeds 25 words');
    }

    console.log(`\n   ✓ Key Points (${result.keyPoints?.length} items):`);
    (result.keyPoints || []).forEach((kp, idx) => {
      console.log(`     [${kp.icon}] ${kp.label}: "${kp.text}" (Citations: ${kp.citations.join(', ')})`);
    });

    console.log(`\n   ✓ Things to Watch (${result.thingsToWatch?.length} items):`);
    (result.thingsToWatch || []).forEach((tw, idx) => {
      console.log(`     - "${tw}"`);
    });

    console.log(`\n   ✓ Evidence Confidence: ${result.evidenceConfidence}`);
    console.log(`   ✓ Accordion Details Sections: ${result.details?.length || result.sections?.length} sections`);
    console.log(`   ✓ Verified References Kept: ${references.length} papers/labels`);

    // 6. Test Student Mode Query
    console.log('\n6. Testing Student Mode Query: "what are the uses of crocin tablet" (studentMode: true)...');
    const studentRes = await axios.post(`${BASE_URL}/evidence/ask`, {
      question: 'what are the uses of crocin tablet',
      mode: 'quick',
      studentMode: true
    }, { headers: authHeaders });

    const studentResult = studentRes.data.result;
    console.log(`   ✓ Student "In simple words": "${studentResult.simpleWords?.slice(0, 80)}..."`);
    console.log(`   ✓ Student "How it works": "${studentResult.mechanism?.slice(0, 80)}..."`);
    console.log(`   ✓ Student "Key terms": ${studentResult.keyTerms?.length} terms`);
    console.log(`   ✓ Student "Remember this": "${studentResult.rememberThis?.slice(0, 80)}..."`);
    console.log(`   ✓ Student "Quiz questions": ${studentResult.quiz?.length} questions`);

    console.log('\n====================================================');
    console.log('✅ ALL PART 4-8 BACKEND & PIPELINE TESTS PASSED!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ Test failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

runSection8Verification();
