import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

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

async function postQuestion(baseUrl, body) {
  const response = await fetch(`${baseUrl}/api/assistant/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { response, data: await response.json() };
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

  try {
    await waitForServer(baseUrl, server);

    const emptyQuestion = await postQuestion(baseUrl, {
      question: '  ',
      eventType: 'wedding',
      language: 'en'
    });
    assert(emptyQuestion.response.status === 400, 'Assistant rejects an empty question');

    const longQuestion = await postQuestion(baseUrl, {
      question: 'a'.repeat(1201),
      eventType: 'wedding',
      language: 'en'
    });
    assert(longQuestion.response.status === 400, 'Assistant enforces the 1200-character question limit');

    const invalidEventType = await postQuestion(baseUrl, {
      question: 'Suggest decorations',
      eventType: 'unrecognized',
      language: 'en'
    });
    assert(invalidEventType.response.status === 400, 'Assistant rejects unsupported event types');

    const invalidLanguage = await postQuestion(baseUrl, {
      question: 'Suggest decorations',
      eventType: 'wedding',
      language: 'bho-Deva'
    });
    assert(invalidLanguage.response.status === 400, 'Assistant rejects retained non-primary answer languages');

    const retiredPlanLanguage = await fetch(`${baseUrl}/api/plan/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'bho-Deva' })
    });
    const retiredPlanData = await retiredPlanLanguage.json();
    assert(retiredPlanLanguage.status === 400, 'Plan generation rejects retained non-primary output languages');
    assert(
      retiredPlanData.errors[0].includes('primary languages'),
      'Unsupported plan-language response explains the current primary-language selection'
    );

    const primaryPlanLanguage = await fetch(`${baseUrl}/api/plan/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'te' })
    });
    assert(
      primaryPlanLanguage.status === 503,
      'A primary language is accepted but reports unavailable reviewed mock content without Gemini'
    );

    const validQuestions = [
      { question: 'Suggest a budget-friendly wedding theme', eventType: 'wedding', language: 'ta' },
      { question: 'Suggest a birthday decoration idea', eventType: 'birthday', language: 'te' },
      { question: 'Suggest a community event schedule', eventType: 'community', language: 'en' },
      { question: 'Suggest an anniversary checklist', eventType: 'anniversary', language: 'ta' },
      { question: 'Suggest a corporate gathering theme', eventType: 'corporate', language: 'hi' },
      { question: 'Suggest a practical event checklist', eventType: 'wedding', language: 'en' }
    ];

    for (const [index, validQuestion] of validQuestions.entries()) {
      const unavailable = await postQuestion(baseUrl, validQuestion);
      assert(unavailable.response.status === 503, `Assistant accepts supported event/language combination ${index + 1} and reports missing configuration`);
      assert(unavailable.data.error === 'assistant_unavailable', 'Assistant unavailable response does not expose provider details');
    }

    const rateLimited = await postQuestion(baseUrl, validQuestions[0]);
    assert(rateLimited.response.status === 429, 'Assistant limits clients to ten requests per ten minutes');

    const frontend = await readFile(path.join(rootDir, 'public', 'js', 'assistant.js'), 'utf8');
    assert(frontend.includes('message.textContent = text'), 'Assistant renders all conversation messages as text');
    assert(!frontend.includes('innerHTML'), 'Assistant renderer does not use unsafe HTML');

    for (const language of ['en', 'ta', 'hi']) {
      const translations = JSON.parse(
        await readFile(path.join(rootDir, 'public', 'locales', `${language}.json`), 'utf8')
      );
      assert(
        translations.assistant_title && translations.assistant_unavailable &&
          translations.assistant_question_theme && translations.assistant_question_checklist,
        `${language} translations include assistant UI, sample questions, and fallback messages`
      );
    }
  } finally {
    server.kill();
  }
}

runTests().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
