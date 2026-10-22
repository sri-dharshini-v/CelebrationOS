import { applyPlanShock } from '../server/shockEngine.js';
import { MOCK_EVENT_PLANS } from '../server/schemas.js';
import { PlanViewer } from '../public/js/planViewer.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`FAILED: ${message}`);
  }
  console.log(`PASSED: ${message}`);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const sourcePlan = clone(MOCK_EVENT_PLANS.en);
sourcePlan.eventDetails.date = '2030-02-14';
sourcePlan.budgetCategories.forEach(category => {
  category.items.forEach(item => {
    item.status = 'pending';
    item.isFrozen = false;
  });
});
const completedTask = sourcePlan.milestones[0].tasks[0];
completedTask.status = 'completed';
completedTask.isFrozen = true;
completedTask.dueDate = '2029-12-01';
const movableTask = sourcePlan.milestones[1].tasks.find(task => task.status !== 'completed');
movableTask.dueDate = '2030-01-01';
const relativeTask = sourcePlan.milestones[2].tasks[0];
const originalRelativeDueDate = relativeTask.dueDate;

const shockResult = applyPlanShock(sourcePlan, {
  targetTotalBudget: 1400000,
  targetEventDate: '2030-02-21'
});
assert(shockResult.plan.eventDetails.totalBudget === 1400000, 'Budget shock updates the target total');
assert(shockResult.plan.eventDetails.date === '2030-02-21', 'Date shock updates the event date');
assert(movableTask.dueDate === '2030-01-01', 'Shock engine does not mutate the source plan');
assert(
  shockResult.plan.milestones[1].tasks.find(task => task.id === movableTask.id).dueDate === '2030-01-08',
  'Unfinished absolute task deadlines shift by the event-date delta'
);
assert(
  shockResult.plan.milestones[0].tasks[0].dueDate === '2029-12-01',
  'Completed task deadlines remain unchanged'
);
assert(
  shockResult.plan.milestones[2].tasks[0].dueDate === originalRelativeDueDate,
  'Relative task deadline labels remain unchanged'
);
assert(shockResult.shiftedTaskDates === 1, 'Shock summary reports shifted task deadlines');
assert(shockResult.preservedTaskDates === 1, 'Shock summary reports preserved completed deadlines');
assert(shockResult.unchangedRelativeTaskDates > 0, 'Shock summary reports unchanged relative deadlines');
assert(
  shockResult.plan.budgetCategories.reduce((sum, category) => sum + category.allocatedAmount, 0) === 1400000,
  'Budget categories reconcile to the target budget'
);
assert(
  shockResult.plan.protectedRituals.some(ritual => ritual.isProtected),
  'Protected rituals remain present after the shock'
);

let invalidDateRejected = false;
try {
  applyPlanShock(sourcePlan, { targetEventDate: '2030-02-30' });
} catch (error) {
  invalidDateRejected = error.message.includes('valid calendar date');
}
assert(invalidDateRejected, 'Invalid shock dates are rejected explicitly');

let noChangeRejected = false;
try {
  applyPlanShock(sourcePlan, { targetEventDate: sourcePlan.eventDetails.date });
} catch (error) {
  noChangeRejected = error.message.includes('do not change');
}
assert(noChangeRejected, 'Shock targets that make no changes are rejected');

const fullyFrozenPlan = clone(sourcePlan);
fullyFrozenPlan.budgetCategories.forEach((category, index) => {
  category.items = [{
    id: `paid_${index}`,
    name: `Paid commitment ${index}`,
    estimatedCost: 1,
    status: 'paid',
    isFrozen: true
  }];
});
let protectedBudgetRejected = false;
try {
  applyPlanShock(fullyFrozenPlan, {
    targetTotalBudget: fullyFrozenPlan.eventDetails.totalBudget - 1
  });
} catch (error) {
  protectedBudgetRejected = error.message.includes('frozen category');
}
assert(protectedBudgetRejected, 'Budget shocks cannot reduce frozen category allocations');

const originalDocument = globalThis.document;
const originalFetch = globalThis.fetch;
const handlers = new Map();
const panel = { hidden: true, scrollIntoView() {} };
const openButton = { setAttribute() {}, addEventListener(name, handler) { handlers.set(`open:${name}`, handler); } };
const budgetToggle = { checked: false, addEventListener(name, handler) { handlers.set(`budget:${name}`, handler); } };
const targetBudget = { value: '1200', disabled: true };
const dateToggle = { checked: false, addEventListener(name, handler) { handlers.set(`date:${name}`, handler); } };
const targetDate = { value: '2031-01-02', disabled: true };
const applyButton = { disabled: false, addEventListener(name, handler) { handlers.set(`apply:${name}`, handler); } };
const cancelButton = { addEventListener(name, handler) { handlers.set(`cancel:${name}`, handler); } };
const status = { textContent: '' };
const nodes = new Map([
  ['#shock-engine-panel', panel],
  ['#open-shock-engine', openButton],
  ['#shock-budget-enabled', budgetToggle],
  ['#shock-target-budget', targetBudget],
  ['#shock-date-enabled', dateToggle],
  ['#shock-target-date', targetDate],
  ['#apply-plan-shock', applyButton],
  ['#cancel-plan-shock', cancelButton],
  ['#shock-engine-status', status]
]);
const container = {
  innerHTML: '',
  style: {},
  querySelector(selector) {
    return nodes.get(selector) || null;
  },
  querySelectorAll() {
    return [];
  }
};
const docForUi = {
  id: 'plan_shock_test',
  currentRevision: 1,
  history: [{ revision: 1 }],
  activePlan: {
    eventDetails: {
      title: 'Plan',
      eventType: 'wedding',
      date: '2030-01-01',
      location: 'City',
      guestCount: 100,
      totalBudget: 1000,
      currency: 'USD',
      language: 'en'
    },
    budgetCategories: [{ id: 'cat', name: 'General', allocatedAmount: 1000, items: [] }],
    milestones: [],
    protectedRituals: [],
    recommendations: { venues: [], vendors: [] }
  }
};
const shockedDoc = {
  ...docForUi,
  currentRevision: 2,
  activePlan: {
    ...docForUi.activePlan,
    eventDetails: {
      ...docForUi.activePlan.eventDetails,
      date: targetDate.value,
      totalBudget: 1200
    },
    budgetCategories: [{ id: 'cat', name: 'General', allocatedAmount: 1200, items: [] }]
  }
};
let shockRequest;

globalThis.document = {
  getElementById(id) {
    return id === 'plan-details-container' ? container : null;
  }
};
globalThis.fetch = async (url, options) => {
  shockRequest = { url, options };
  return {
    ok: true,
    async json() {
      return {
        success: true,
        doc: shockedDoc,
        warnings: ['Protected commitments remain unchanged.'],
        shock: { budgetChanged: true, dateChanged: true, shiftedTaskDates: 1 }
      };
    }
  };
};

try {
  const viewer = new PlanViewer();
  viewer.renderPlan(docForUi);
  handlers.get('open:click')();
  assert(panel.hidden === false, 'Shock Engine button opens the shock controls');

  budgetToggle.checked = true;
  dateToggle.checked = true;
  handlers.get('budget:change')();
  handlers.get('date:change')();
  assert(targetBudget.disabled === false && targetDate.disabled === false, 'Shock options enable their target inputs');
  await handlers.get('apply:click')();

  assert(shockRequest.options.method === 'POST', 'Shock controls call the Shock Engine endpoint');
  const submittedShock = JSON.parse(shockRequest.options.body);
  assert(submittedShock.targetTotalBudget === 1200, 'Shock request includes the selected budget target');
  assert(submittedShock.targetEventDate === '2031-01-02', 'Shock request includes the selected event date');
  assert(viewer.currentDoc.currentRevision === 2, 'Successful shock refreshes the saved plan revision');
  assert(status.textContent.includes('Shock applied as revision 2'), 'Shock result and revision are reported');
} finally {
  if (originalDocument === undefined) {
    delete globalThis.document;
  } else {
    globalThis.document = originalDocument;
  }
  if (originalFetch === undefined) {
    delete globalThis.fetch;
  } else {
    globalThis.fetch = originalFetch;
  }
}
