/**
 * ======================================================================================
 * SPORTSYNC AI - AUTOMATED END-TO-END IOT RFID API VERIFICATION SUITE
 * Tests the real SQLite database and Express backend for all IoT requirements,
 * including fully automatic Issue & Return workflows (mode = "auto").
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
        mode: 'auto',
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
  // Reset initial equipment status for clean auto test cycle
  // -------------------------------------------------------------------------
  try {
    await fetch(`${BASE_URL}/api/rfid/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rfidTag: '44B7F506', mode: 'return' }),
    }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2600)); // wait past debounce
  } catch {}

  // -------------------------------------------------------------------------
  // Test 4: Fully Automatic RFID Workflow (mode = "auto")
  // Cycle 1: First scan -> Automatically ISSUE
  // -------------------------------------------------------------------------
  try {
    console.log('\n--- Testing Automatic RFID Issue & Return Cycle ---');
    const res = await fetch(`${BASE_URL}/api/rfid/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rfidTag: '44B7F506',
        mode: 'auto',
        studentReg: '420723104053',
      }),
    });
    const data = await res.json();
    assert(res.status === 200, 'Test 4.1: Auto scan 1 HTTP status is 200', `Status: ${res.status}`);
    assert(data.success === true, 'Test 4.2: Auto scan 1 success is true');
    assert(data.message === 'Equipment issued successfully', 'Test 4.3: Auto scan 1 message is "Equipment issued successfully"', data.message);
    assert(data.action === 'issue', 'Test 4.4: Auto scan 1 action resolved to "issue"');
    assert(data.studentReg === '420723104053', 'Test 4.5: Student reg matches "420723104053"');
    assert(data.equipment?.status === 'borrowed', 'Test 4.6: Equipment status in DB changed to "borrowed"');
  } catch (e) {
    assert(false, 'Test 4: Auto Scan 1 (Issue)', e.message);
  }

  // -------------------------------------------------------------------------
  // Test 5: Debounce Protection - Immediate duplicate scan within cooldown window
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/rfid/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rfidTag: '44B7F506',
        mode: 'auto',
        studentReg: '420723104053',
      }),
    });
    const data = await res.json();
    assert(res.status === 429, 'Test 5.1: Debounce returns HTTP 429 Too Many Requests', `Status: ${res.status}`);
    assert(data.success === false, 'Test 5.2: Debounce success is false');
    assert(data.code === 'DUPLICATE_SCAN' || data.message.includes('Duplicate scan'), 'Test 5.3: Duplicate scan blocked with informative message', data.message);
  } catch (e) {
    assert(false, 'Test 5: Debounce Protection', e.message);
  }

  // -------------------------------------------------------------------------
  // Test 6: Cycle 2: Second scan by SAME student -> Automatically RETURN
  // Wait 2.6s for debounce cooldown to expire
  // -------------------------------------------------------------------------
  try {
    console.log('  ⏳ Waiting 2.6s for debounce cooldown before second scan...');
    await new Promise((r) => setTimeout(r, 2600));

    const res = await fetch(`${BASE_URL}/api/rfid/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rfidTag: '44B7F506',
        mode: 'auto',
        studentReg: '420723104053',
      }),
    });
    const data = await res.json();
    assert(res.status === 200, 'Test 6.1: Auto scan 2 HTTP status is 200', `Status: ${res.status}`);
    assert(data.success === true, 'Test 6.2: Auto scan 2 success is true');
    assert(data.message === 'Equipment returned successfully', 'Test 6.3: Auto scan 2 message is "Equipment returned successfully"', data.message);
    assert(data.action === 'return', 'Test 6.4: Auto scan 2 action resolved to "return"');
    assert(data.equipment?.status === 'available', 'Test 6.5: Equipment status in DB changed to "available"');
  } catch (e) {
    assert(false, 'Test 6: Auto Scan 2 (Return)', e.message);
  }

  // -------------------------------------------------------------------------
  // Test 7: Cycle 3: Third scan by SAME student -> Automatically ISSUE again
  // Wait 2.6s for debounce cooldown to expire
  // -------------------------------------------------------------------------
  try {
    console.log('  ⏳ Waiting 2.6s for debounce cooldown before third scan...');
    await new Promise((r) => setTimeout(r, 2600));

    const res = await fetch(`${BASE_URL}/api/rfid/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rfidTag: '44B7F506',
        mode: 'auto',
        studentReg: '420723104053',
      }),
    });
    const data = await res.json();
    assert(res.status === 200, 'Test 7.1: Auto scan 3 HTTP status is 200', `Status: ${res.status}`);
    assert(data.success === true, 'Test 7.2: Auto scan 3 success is true');
    assert(data.message === 'Equipment issued successfully', 'Test 7.3: Auto scan 3 message is "Equipment issued successfully"', data.message);
    assert(data.action === 'issue', 'Test 7.4: Auto scan 3 action resolved to "issue"');
    assert(data.equipment?.status === 'borrowed', 'Test 7.5: Equipment status in DB is "borrowed"');
  } catch (e) {
    assert(false, 'Test 7: Auto Scan 3 (Re-issue)', e.message);
  }

  // -------------------------------------------------------------------------
  // Test 8: Reject transaction when scanned by a DIFFERENT student
  // (Equipment is currently borrowed by 420723104053; 910423104001 attempts scan)
  // -------------------------------------------------------------------------
  try {
    console.log('  ⏳ Waiting 2.6s before testing mismatch borrower scan...');
    await new Promise((r) => setTimeout(r, 2600));

    const res = await fetch(`${BASE_URL}/api/rfid/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rfidTag: '44B7F506',
        mode: 'auto',
        studentReg: '910423104001',
      }),
    });
    const data = await res.json();
    assert(data.success === false, 'Test 8.1: Different student scan rejected');
    assert(data.message.includes('already borrowed by another student'), 'Test 8.2: Error message clearly specifies already borrowed by another student', data.message);
  } catch (e) {
    assert(false, 'Test 8: Different Student Rejection', e.message);
  }

  // -------------------------------------------------------------------------
  // Test 9: Restore equipment back to available by original borrower
  // -------------------------------------------------------------------------
  try {
    console.log('  ⏳ Waiting 2.6s before returning equipment...');
    await new Promise((r) => setTimeout(r, 2600));

    const res = await fetch(`${BASE_URL}/api/rfid/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rfidTag: '44B7F506',
        mode: 'auto',
        studentReg: '420723104053',
      }),
    });
    const data = await res.json();
    assert(data.success === true, 'Test 9.1: Original borrower returned equipment successfully');
    assert(data.action === 'return', 'Test 9.2: Action resolved to "return"');
    assert(data.equipment?.status === 'available', 'Test 9.3: Equipment returned to available');
  } catch (e) {
    assert(false, 'Test 9: Equipment Final Return', e.message);
  }

  // -------------------------------------------------------------------------
  // Test 10: Verify Database Tables (RFID Cards, Admins, Transactions)
  // -------------------------------------------------------------------------
  try {
    const cardsRes = await fetch(`${BASE_URL}/api/rfid-cards`);
    const cardsData = await cardsRes.json();
    assert(cardsData.success === true && Array.isArray(cardsData.cards), 'Test 10.1: GET /api/rfid-cards returns cards array');

    const adminRes = await fetch(`${BASE_URL}/api/admin-users`);
    const adminData = await adminRes.json();
    assert(adminData.success === true && Array.isArray(adminData.admins), 'Test 10.2: GET /api/admin-users returns admin array');

    const txRes = await fetch(`${BASE_URL}/api/transactions`);
    const txData = await txRes.json();
    assert(txData.success === true && Array.isArray(txData.transactions), 'Test 10.3: GET /api/transactions returns transactions array');
    assert(txData.transactions.length > 0, 'Test 10.4: Permanent transaction history maintained in SQLite');
  } catch (e) {
    assert(false, 'Test 10: Database Tables Verification', e.message);
  }

  console.log('\n==================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
