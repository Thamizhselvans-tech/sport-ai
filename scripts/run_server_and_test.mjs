import { spawn } from 'child_process';
import http from 'http';

function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, (res) => {
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error('Timed out waiting for server to start'));
        } else {
          setTimeout(check, 500);
        }
      });
    };
    check();
  });
}

async function main() {
  console.log('[Runner] Starting Sportsync server with tsx server.ts...');
  const server = spawn('npm.cmd', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, PORT: '3000' }
  });

  try {
    await waitForServer('http://127.0.0.1:3000/api/rfid/scan');
    console.log('[Runner] Server is ready on http://127.0.0.1:3000! Running test suite...\n');

    await new Promise((resolve, reject) => {
      const test = spawn('node', ['scripts/test_rfid_api.mjs'], {
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, TEST_URL: 'http://127.0.0.1:3000' }
      });
      test.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Test exited with code ${code}`));
      });
    });

    console.log('\n[Runner] All tests passed successfully!');
  } finally {
    console.log('[Runner] Shutting down server...');
    server.kill();
    // On Windows, kill tree
    spawn('taskkill', ['/pid', server.pid.toString(), '/f', '/t']);
  }
}

main().catch((err) => {
  console.error('[Runner] Error:', err);
  process.exit(1);
});
