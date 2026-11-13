/**
 * ======================================================================================
 * SPORTSYNC AI - AUTOMATED END-TO-END IOT RFID API VERIFICATION SUITE
 * Tests the real SQLite database and Express backend for all IoT requirements.
 * ======================================================================================
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function runTests() {
  console.log('==================================================================');
  console.log(`🚀 STARTING SPORTSYNC AI IOT RFID BACKEND VERIFICATION (${BASE_URL})`);
  console.log('==================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // Test 1: GET /api/rfid/scan must return JSON, NEVER HTML
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/rfid/scan`);
    const contentType = res.headers.get('content-type') || '';
    const data = await res.json();
    assert(contentType.includes('application/json'), 'Test 1.1: Content-Type is application/json', contentType);
    assert(data.success === true && data.status === 'online', 'Test 1.2: Diagnostic info returned successfully');
  } catch (e) {
    assert(false, 'Test 1: GET /api/rfid/scan', e.message);
  }

  // -------------------------------------------------------------------------
  // Test 2: Unknown /api/* route must return JSON 404, NEVER HTML
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/non_existent_endpoint_12345`);
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();
    assert(contentType.includes('application/json'), 'Test 2.1: Non-existent route returns application/json', contentType);
    assert(!text.includes('<!DOCTYPE') && !text.includes('<html'), 'Test 2.2: Non-existent route does NOT return HTML index page');
    const json = JSON.parse(text);
    assert(json.success === false && json.message.includes('not found'), 'Test 2.3: Returns JSON 404 error');
  } catch (e) {
    assert(false, 'Test 2: Unknown API catch-all', e.message);
  }

  // -------------------------------------------------------------------------
  // Test 3: Unauthorized RFID Card must return "Equipment not registered"
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/rfid/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rfidTag: 'UNKNOWN_9999',
        mode: 'issue',
        studentReg: '420723104053',
      }),
    });
    const data = await res.json();
    assert(res.status === 404, 'Test 3.1: HTTP status is 404 for unknown tag');
    assert(data.success === false, 'Test 3.2: success is false');
    assert(data.message === 'Equipment not registered', 'Test 3.3: Exact error message "Equipment not registered"', data.message);
  } catch (e) {
    assert(false, 'Test 3: Unauthorized RFID Card', e.message);
  }

  // -------------------------------------------------------------------------
  // Test 4: Issue Equipment with ESP32 Hardware Card (44B7F506 + 420723104053)
  // -------------------------------------------------------------------------
  try {
    // First make sure 44B7F506 is available by running return if needed
    await fetch(`${BASE_URL}/api/rfid/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rfidTag: '44B7F506', mode: 'return' }),
    }).catch(() => {});

    // Now test ISSUE
    const res = await fetch(`${BASE_URL}/api/rfid/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rfidTag: '44B7F506',
        mode: 'issue',
        studentReg: '420723104053',
      }),
    });
    const data = await res.json();
    assert(res.status === 200, 'Test 4.1: HTTP status 200 for valid issue', `Status: ${res.status}`);
    assert(data.success === true, 'Test 4.2: data.success is true');
    assert(data.message === 'Equipment issued successfully', 'Test 4.3: message is "Equipment issued successfully"', data.message);
    assert(data.rfidTag === '44B7F506', 'Test 4.4: rfidTag echo matches "44B7F506"');
    assert(data.studentReg === '420723104053', 'Test 4.5: studentReg echo matches "420723104053"');
    assert(data.mode === 'issue', 'Test 4.6: mode is "issue"');
  } catch (e) {
    assert(false, 'Test 4: Issue Equipment via RFID', e.message);
  }

  // -------------------------------------------------------------------------
  // Test 5: Prevent Duplicate Issue (Equipment already borrowed)
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/rfid/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rfidTag: '44B7F506',
        mode: 'issue',
        studentReg: '420723104053',
      }),
    });
    const data = await res.json();
    assert(data.success === false, 'Test 5.1: Duplicate issue blocked');
    assert(data.message.includes('already borrowed') || data.message.includes('Duplicate scan'), 'Test 5.2: Error mentions already borrowed or duplicate scan blocked', data.message);
  } catch (e) {
    assert(false, 'Test 5: Duplicate Issue Prevention', e.message);
  }

  // -------------------------------------------------------------------------
  // Test 6: Return Equipment with ESP32 Hardware Card (44B7F506)
  // -------------------------------------------------------------------------
  try {
    // Wait 200ms to avoid debounce
    await new Promise((r) => setTimeout(r, 300));
    const res = await fetch(`${BASE_URL}/api/rfid/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rfidTag: '44B7F506',
        mode: 'return',
        studentReg: '420723104053',
      }),
    });
    const data = await res.json();
    assert(res.status === 200, 'Test 6.1: HTTP status 200 for valid return');
    assert(data.success === true, 'Test 6.2: data.success is true');
    assert(data.message === 'Equipment returned successfully', 'Test 6.3: message is "Equipment returned successfully"', data.message);
    assert(data.mode === 'return', 'Test 6.4: mode is "return"');
    assert(data.rfidTag === '44B7F506', 'Test 6.5: rfidTag is "44B7F506"');
  } catch (e) {
    assert(false, 'Test 6: Return Equipment via RFID', e.message);
  }

  // -------------------------------------------------------------------------
  // Test 7: Prevent Duplicate Return (Already returned and available)
  // -------------------------------------------------------------------------
  try {
    await new Promise((r) => setTimeout(r, 300));
    const res = await fetch(`${BASE_URL}/api/rfid/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rfidTag: '44B7F506',
        mode: 'return',
      }),
    });
    const data = await res.json();
    assert(data.success === false, 'Test 7.1: Duplicate return blocked');
    assert(data.message.includes('already returned') || data.message.includes('Duplicate scan'), 'Test 7.2: Error mentions already returned', data.message);
  } catch (e) {
    assert(false, 'Test 7: Duplicate Return Prevention', e.message);
  }

  // -------------------------------------------------------------------------
  // Test 8: Verify Persistent Tables (RFID Cards & Admin Users)
  // -------------------------------------------------------------------------
  try {
    const cardsRes = await fetch(`${BASE_URL}/api/rfid-cards`);
    const cardsData = await cardsRes.json();
    assert(cardsData.success === true && Array.isArray(cardsData.cards), 'Test 8.1: GET /api/rfid-cards returns cards array');

    const adminRes = await fetch(`${BASE_URL}/api/admin-users`);
    const adminData = await adminRes.json();
    assert(adminData.success === true && Array.isArray(adminData.admins), 'Test 8.2: GET /api/admin-users returns admin array');
  } catch (e) {
    assert(false, 'Test 8: Database tables verification', e.message);
  }

  console.log('\n==================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
