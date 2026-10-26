/**
 * Targeted regression test for Gemini model fallback.
 *
 * Quotas are enforced per model, so the service must rotate to the next
 * configured model instead of failing (or silently degrading to mock) when one
 * model is exhausted. The provider is faked with a stubbed global fetch so this
 * test never calls the real API, uses no quota, and never touches saved plans.
 */

import { MOCK_EVENT_PLANS } from '../server/schemas.js';

const TEST_KEY = 'unit-test-key-not-a-real-secret';
process.env.GEMINI_API_KEY = TEST_KEY;
process.env.GEMINI_PLAN_MODELS = 'model-a,model-b';
process.env.GEMINI_ASSISTANT_MODELS = 'model-a,model-b';

let pass = 0;
let fail = 0;

function check(name, condition, extra = '') {
  if (condition) {
    pass += 1;
    console.log(`PASSED: ${name}`);
  } else {
    fail += 1;
    console.log(`FAILED: ${name}${extra ? ` :: ${extra}` : ''}`);
  }
}

function quotaResponse() {
  return new Response(JSON.stringify({
    error: {
      code: 429,
      message: 'You exceeded your current quota, please check your plan and billing details.',
      status: 'RESOURCE_EXHAUSTED'
    }
  }), {
    status: 429,
    headers: { 'Content-Type': 'application/json' }
  });
}

function successResponse(text) {
  return new Response(JSON.stringify({
    candidates: [{
      content: { role: 'model', parts: [{ text }] },
      finishReason: 'STOP'
    }],
    usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

function requestedModel(url) {
  const match = /models\/([^:?/]+)/.exec(String(url));
  return match ? match[1] : '';
}

const planText = JSON.stringify(MOCK_EVENT_PLANS.en);
const capturedWarnings = [];
const originalWarn = console.warn;
console.warn = (...args) => {
  capturedWarnings.push(args.map(String).join(' '));
};

let calls = [];
let mode = 'plan';
globalThis.fetch = async (url) => {
  const model = requestedModel(url);
  calls.push(model);
  const text = mode === 'assistant' ? 'Here is a budget-friendly decoration idea.' : planText;
  return model === 'model-b' ? successResponse(text) : quotaResponse();
};

const {
  generateEventPlan,
  answerEventPlanningQuestion,
  getPlanModels,
  getAssistantModels
} = await import('../server/gemini.js');

const eventRequest = {
  title: 'Fallback Test Wedding',
  eventType: 'wedding',
  date: '2027-02-14',
  location: 'Chennai',
  guestCount: 100,
  totalBudget: 500000,
  currency: 'INR',
  theme: 'Classic',
  notes: '',
  language: 'en',
  protectedRituals: []
};

try {
  check('plan model list honors env override', getPlanModels().join(',') === 'model-a,model-b');
  check('assistant model list honors env override', getAssistantModels().join(',') === 'model-a,model-b');

  // 1. Plan generation rotates from an exhausted model to a working model.
  calls = [];
  const planResult = await generateEventPlan(eventRequest);
  check('plan generation succeeds after model rotation', planResult.success === true);
  check('plan generation reports genuine AI output', planResult.isMock === false);
  check('plan generation reports the model that answered', planResult.aiModel === 'model-b', String(planResult.aiModel));
  check('plan generation tried the exhausted model first', calls[0] === 'model-a', calls.join(','));
  check('plan generation fell through to the second model', calls.includes('model-b'), calls.join(','));

  const allocated = planResult.plan.budgetCategories
    .reduce((sum, category) => sum + Number(category.allocatedAmount || 0), 0);
  check('rotated plan still satisfies the budget invariant',
    Math.abs(allocated - eventRequest.totalBudget) < 1,
    `${allocated} vs ${eventRequest.totalBudget}`);

  // 2. Assistant rotates on quota exhaustion.
  calls = [];
  mode = 'assistant';
  const answer = await answerEventPlanningQuestion({
    question: 'Suggest a budget-friendly decoration idea.',
    eventType: 'wedding',
    language: 'en'
  });
  check('assistant answers after model rotation', typeof answer === 'string' && answer.length > 0);
  check('assistant rotation tried both models', calls.includes('model-a') && calls.includes('model-b'), calls.join(','));

  // 3. Plan generation reports mock fallback honestly when all models are exhausted.
  globalThis.fetch = async () => quotaResponse();
  const exhaustedPlan = await generateEventPlan(eventRequest);
  check('plan generation marks mock output when every model is exhausted', exhaustedPlan.isMock === true);
  check('plan generation explains the fallback reason', exhaustedPlan.fallbackReason === 'quota_exhausted', String(exhaustedPlan.fallbackReason));
  check('mock fallback never claims an AI model', exhaustedPlan.aiModel === null);

  // 4. Assistant surfaces a classified quota error instead of a generic failure.
  let assistantError = null;
  try {
    await answerEventPlanningQuestion({
      question: 'Suggest a checklist.',
      eventType: 'wedding',
      language: 'en'
    });
  } catch (error) {
    assistantError = error;
  }
  check('assistant reports quota exhaustion explicitly', assistantError?.code === 'quota_exhausted', String(assistantError?.code));

  // 5. Diagnostics must never leak the API key.
  const logText = capturedWarnings.join('\n');
  check('diagnostics do not contain the API key', !logText.includes(TEST_KEY));
  check('diagnostics record model names', logText.includes('model-a') && logText.includes('model-b'));
} finally {
  console.warn = originalWarn;
}

console.log(`\nRESULT pass=${pass} fail=${fail}`);
if (fail > 0) {
  process.exitCode = 1;
}
