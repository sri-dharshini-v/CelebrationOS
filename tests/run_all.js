import { spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const testFiles = [
  'test_ai_assistant.js',
  'test_basic_auth.js',
  'test_assistant_ui.js',
  'test_history_tracking.js',
  'test_history_tracking_endpoint.js',
  'test_language_foundation.js',
  'test_safe_undo_ui.js',
  'test_saved_plan_editing.js',
  'test_shock_engine.js',
  'test_event_specific_rituals.js',
  'test_wizard_first_time.js',
  'test_step2.js',
  'test_step3.js',
  'test_step4.js',
  'test_step5.js',
  'test_step6.js',
  'test_xss_escaping.js'
];

async function ensurePortIsAvailable(port) {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  await new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  });
}

async function stopServer(server) {
  if (server.exitCode !== null) return;

  const exited = await new Promise(resolve => {
    const timeout = setTimeout(() => {
      server.removeListener('exit', onExit);
      resolve(false);
    }, 5000);
    const onExit = () => {
      clearTimeout(timeout);
      resolve(true);
    };
    server.once('exit', onExit);
    server.kill();
  });
  if (!exited && server.exitCode === null) {
    const forcedExit = once(server, 'exit');
    server.kill('SIGKILL');
    await forcedExit;
  }
}

async function startTestServer() {
  const port = 3000;
  await ensurePortIsAvailable(port);

  const server = spawn(
    process.execPath,
    [path.join(rootDir, 'server', 'server.js')],
    {
      cwd: rootDir,
      env: {
        ...process.env,
        PORT: String(port),
        GEMINI_API_KEY: '',
        DEMO_AUTH_USERNAME: '',
        DEMO_AUTH_PASSWORD: ''
      },
      stdio: 'inherit'
    }
  );

  try {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      if (server.exitCode !== null) {
        throw new Error(`Test server exited before becoming ready (code ${server.exitCode}).`);
      }
      try {
        const response = await fetch(`http://127.0.0.1:${port}/api/health`);
        const health = await response.json();
        if (response.ok && health.app === 'CelebrationOS') return server;
      } catch {
        await delay(100);
      }
    }
    throw new Error('Timed out waiting for the test server to start.');
  } catch (error) {
    await stopServer(server);
    throw error;
  }
}

async function runTest(file) {
  console.log(`\n===== Running ${file} =====`);
  const child = spawn(process.execPath, [path.join(__dirname, file)], {
    cwd: rootDir,
    stdio: 'inherit'
  });

  const [code, signal] = await Promise.race([
    once(child, 'exit'),
    once(child, 'error').then(([error]) => {
      throw error;
    })
  ]);
  if (code !== 0) {
    throw new Error(`${file} failed${signal ? ` (signal ${signal})` : ` (exit ${code})`}.`);
  }
  console.log(`===== Passed ${file} =====`);
}

async function main() {
  let server;
  let passed = 0;

  try {
    for (const file of testFiles) {
      if (file === 'test_step5.js') {
        console.log('\n===== Starting local server for Steps 5 and 6 =====');
        server = await startTestServer();
      }

      await runTest(file);
      passed += 1;

      if (file === 'test_step6.js') {
        await stopServer(server);
        server = undefined;
        console.log('===== Stopped local test server =====');
      }
    }
    console.log(`\nAll ${passed} test scripts passed.`);
  } finally {
    if (server) await stopServer(server);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
