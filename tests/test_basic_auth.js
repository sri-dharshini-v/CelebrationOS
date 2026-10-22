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

function startServer(port) {
  return spawn(
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
      stdio: 'ignore'
    }
  );
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

async function runTests() {
  const port = await getAvailablePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = startServer(port);
  let planId;

  try {
    await waitForServer(baseUrl, server);

    const healthResponse = await fetch(`${baseUrl}/api/health`);
    assert(healthResponse.status === 200, 'Health endpoint remains public');

    const frontendResponse = await fetch(`${baseUrl}/`);
    assert(frontendResponse.status === 200, 'Frontend is public without credentials');

    const plansResponse = await fetch(`${baseUrl}/api/plans`);
    const plansData = await plansResponse.json();
    assert(
      plansResponse.status === 200 && plansData.success === true,
      'Saved plan list is publicly accessible without credentials'
    );

    const validationResponse = await fetch(`${baseUrl}/api/plan/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{'
    });
    assert(
      validationResponse.status !== 401,
      'Validation API is reachable without credentials'
    );

    const plan = JSON.parse(JSON.stringify(MOCK_EVENT_PLANS.en));
    plan.eventDetails.title = 'Public Demo Access Test Plan';
    const createResponse = await fetch(`${baseUrl}/api/plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan })
    });
    const createData = await createResponse.json();
    assert(
      createResponse.status === 201 && createData.success,
      'Plan creation is publicly accessible without credentials'
    );
    planId = createData.doc.id;

    const getPlanResponse = await fetch(`${baseUrl}/api/plans/${planId}`);
    const getPlanData = await getPlanResponse.json();
    assert(
      getPlanResponse.status === 200 && getPlanData.success,
      'Saved plan and revision history are publicly readable'
    );

    const trackingResponse = await fetch(
      `${baseUrl}/api/plans/${planId}/history-tracking`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false })
      }
    );
    assert(
      trackingResponse.status === 200,
      'History-tracking mutation is publicly accessible without credentials'
    );

    const unauthenticatedMutationRoutes = [
      ['PUT', `/api/plans/${planId}`, { plan: getPlanData.doc.activePlan }],
      ['POST', `/api/plans/${planId}/shock`, { targetTotalBudget: 1600000 }],
      ['POST', `/api/plans/${planId}/undo`, { targetRevision: 1 }],
      ['DELETE', `/api/plans/${planId}/history`, { revisions: [1], confirmed: true }]
    ];
    for (const [method, endpoint, body] of unauthenticatedMutationRoutes) {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await response.json();
      assert(
        response.ok && result.success === true,
        `${method} ${endpoint} mutation succeeds without credentials`
      );
    }

    const deletePlanResponse = await fetch(`${baseUrl}/api/plans/${planId}`, {
      method: 'DELETE'
    });
    assert(
      deletePlanResponse.status === 200,
      'Whole-plan deletion is publicly accessible without credentials'
    );
    planId = undefined;
  } finally {
    if (planId) {
      await fetch(`${baseUrl}/api/plans/${planId}`, { method: 'DELETE' });
    }
    server.kill();
  }
}

runTests().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
