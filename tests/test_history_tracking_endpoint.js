import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MOCK_EVENT_PLANS } from '../server/schemas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`FAILED: ${message}`);
  }
  console.log(`PASSED: ${message}`);
}

async function getAvailablePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  });
  return port;
}

async function waitForServer(baseUrl, child) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Server exited before becoming ready (code ${child.exitCode}).`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  throw new Error('Timed out waiting for the test server to start.');
}

async function request(baseUrl, endpoint, method, body) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const data = await response.json();
  return { response, data };
}

async function runTests() {
  const port = await getAvailablePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn(
    process.execPath,
    [path.join(rootDir, 'server', 'server.js')],
    {
      cwd: rootDir,
      env: { ...process.env, PORT: String(port), GEMINI_API_KEY: '' },
      stdio: 'ignore'
    }
  );
  let planId;

  try {
    await waitForServer(baseUrl, server);

    const plan = JSON.parse(JSON.stringify(MOCK_EVENT_PLANS.en));
    plan.eventDetails.title = 'History Tracking Endpoint Test Plan';
    const created = await request(baseUrl, '/api/plans', 'POST', { plan });
    assert(created.response.status === 201 && created.data.success, 'Test plan is created through the API');
    planId = created.data.doc.id;
    assert(created.data.doc.history.length === 1, 'New test plan starts with one history snapshot');

    const invalidId = await request(
      baseUrl,
      '/api/plans/invalid!id/history-tracking',
      'PATCH',
      { enabled: false }
    );
    assert(invalidId.response.status === 400, 'Toggle rejects an invalid plan ID');

    const invalidValue = await request(
      baseUrl,
      `/api/plans/${planId}/history-tracking`,
      'PATCH',
      { enabled: 'false' }
    );
    assert(invalidValue.response.status === 400, 'Toggle rejects a non-boolean enabled value');

    const disabled = await request(
      baseUrl,
      `/api/plans/${planId}/history-tracking`,
      'PATCH',
      { enabled: false }
    );
    assert(disabled.response.ok && disabled.data.doc.historyTracking === false, 'OFF setting persists for the selected plan');
    assert(disabled.data.doc.history.length === 1, 'Turning OFF retains existing history');

    const offModePlan = JSON.parse(JSON.stringify(disabled.data.doc.activePlan));
    offModePlan.eventDetails.title = 'Saved While History Tracking Is OFF';
    const offUpdate = await request(
      baseUrl,
      `/api/plans/${planId}`,
      'PUT',
      { plan: offModePlan, description: 'OFF-mode endpoint test update' }
    );
    assert(offUpdate.response.ok, 'Active plan update succeeds while tracking is OFF');
    assert(offUpdate.data.doc.currentRevision === 2, 'OFF-mode update advances the active revision');
    assert(offUpdate.data.doc.activePlan.eventDetails.title === offModePlan.eventDetails.title, 'OFF-mode active plan change persists');
    assert(offUpdate.data.doc.history.length === 1, 'OFF-mode update does not append a snapshot');

    const enabled = await request(
      baseUrl,
      `/api/plans/${planId}/history-tracking`,
      'PATCH',
      { enabled: true }
    );
    assert(enabled.response.ok && enabled.data.doc.historyTracking === true, 'ON setting persists for the selected plan');
    assert(enabled.data.doc.history.length === 2, 'Re-enabling adds a checkpoint for the active revision');
    assert(enabled.data.doc.history.some(entry => entry.revision === 1), 'Re-enabling preserves existing history');
    assert(enabled.data.doc.history.some(entry => entry.revision === 2), 'Re-enabled checkpoint represents the current active revision');
  } finally {
    if (planId) {
      await request(baseUrl, `/api/plans/${planId}`, 'DELETE');
    }
    server.kill();
  }
}

runTests().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
