import { escapeHtml } from '../public/js/html.js';
import { PlanViewer } from '../public/js/planViewer.js';
import { PlansManager } from '../public/js/plansManager.js';
import { WizardController } from '../public/js/wizard.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`FAILED: ${message}`);
  }
  console.log(`PASSED: ${message}`);
}

const payload = `<img src=x onerror="alert('xss')"> &`;
const escapedPayload = '&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt; &amp;';

assert(escapeHtml(payload) === escapedPayload, 'HTML text and attribute metacharacters are escaped');

const originalDocument = globalThis.document;
const checkbox = { addEventListener() {} };
const nodes = new Map();
const planContainer = {
  innerHTML: '',
  style: {},
  querySelector() {
    return null;
  },
  querySelectorAll() {
    return [];
  }
};
globalThis.document = {
  getElementById(id) {
    return nodes.get(id) || checkbox;
  }
};

try {
  nodes.set('plan-details-container', planContainer);
  const planViewer = new PlanViewer();
  planViewer.renderPlan({
    id: 'plan_test',
    currentRevision: 1,
    history: [{ revision: 1, description: payload }],
    activePlan: {
      eventDetails: {
        title: payload,
        eventType: payload,
        language: 'en',
        location: payload,
        date: '2030-01-01',
        guestCount: 10,
        totalBudget: 100,
        currency: 'USD',
        theme: payload
      },
      budgetCategories: [{
        id: 'cat_test',
        name: payload,
        allocatedAmount: 100,
        percentage: 100,
        items: [{ id: 'item_test', name: payload, notes: payload, estimatedCost: 100 }]
      }],
      milestones: [{
        id: 'milestone_test',
        title: payload,
        timeframe: payload,
        order: 1,
        tasks: [{
          id: 'task_test',
          title: payload,
          category: payload,
          dueDate: payload,
          status: 'todo'
        }]
      }],
      protectedRituals: [{
        id: 'ritual_test',
        name: payload,
        significance: payload,
        estimatedDuration: payload,
        preservationNotes: payload,
        alternativesIfBudgetConstrained: payload,
        isProtected: true
      }],
      recommendations: {
        venues: [{ name: payload, location: payload }],
        vendors: [{ name: payload, serviceType: payload, location: payload }]
      }
    }
  });
  assert(!planContainer.innerHTML.includes(payload), 'Saved-plan renderer escapes untrusted plan fields');
  assert(planContainer.innerHTML.includes(escapedPayload), 'Saved-plan renderer preserves escaped plan text');

  const selector = { innerHTML: '', value: '', disabled: false };
  nodes.set('saved-plans-select', selector);
  nodes.set('saved-plans-count', { textContent: '' });
  nodes.set('delete-saved-plan', { disabled: false });
  const plansManager = new PlansManager();
  plansManager.savedPlans = [{
    id: payload,
    title: payload,
    totalBudget: 10,
    currency: payload,
    currentRevision: 1
  }];
  plansManager.renderPlansSelector();
  assert(!selector.innerHTML.includes(payload), 'Saved-plan selector escapes IDs, titles, and currency');

  const ritualContainer = { innerHTML: '' };
  nodes.set('rituals-checkbox-container', ritualContainer);
  const wizard = new WizardController();
  wizard.customRituals = [{
    id: 'r_custom_test',
    name: payload,
    significance: payload
  }];
  wizard.selectedRituals.add('r_custom_test');
  wizard.renderRituals();
  assert(!ritualContainer.innerHTML.includes(payload), 'Custom ritual renderer escapes user-provided text');

  const reviewBox = { innerHTML: '' };
  nodes.set('guided-review-summary', reviewBox);
  for (const id of ['g-title', 'g-type', 'g-date', 'g-location', 'g-guests', 'g-budget', 'g-currency', 'g-theme']) {
    nodes.set(id, { value: payload });
  }
  wizard.populateReviewStep();
  assert(!reviewBox.innerHTML.includes(payload), 'Guided review escapes form values');

  const banner = {
    innerHTML: '',
    classList: { add() {} },
    scrollIntoView() {}
  };
  nodes.set('wizard-plan-summary', banner);
  wizard.renderPlanSuccessBanner({
    currentRevision: 1,
    activePlan: {
      eventDetails: {
        title: payload,
        eventType: payload,
        date: payload,
        location: payload,
        totalBudget: 10,
        currency: payload,
        language: payload
      },
      budgetCategories: [],
      milestones: [],
      protectedRituals: []
    }
  });
  assert(!banner.innerHTML.includes(payload), 'Generated-plan banner escapes plan values');
} finally {
  if (originalDocument === undefined) {
    delete globalThis.document;
  } else {
    globalThis.document = originalDocument;
  }
}
