import { PlanViewer } from '../public/js/planViewer.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`FAILED: ${message}`);
  }
  console.log(`PASSED: ${message}`);
}

const originalDocument = globalThis.document;
const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
const handlers = new Map();
const safeUndoButton = {
  dataset: { safeUndoRevision: '1' },
  disabled: false,
  addEventListener(name, handler) {
    handlers.set(name, handler);
  }
};
const status = { textContent: '' };
const container = {
  innerHTML: '',
  style: {},
  querySelector(selector) {
    return selector === '#safe-undo-status' ? status : null;
  },
  querySelectorAll(selector) {
    return selector === '.safe-undo-button' ? [safeUndoButton] : [];
  }
};
const activePlan = {
  eventDetails: {
    title: 'Safe Undo UI Test',
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
};
const initialDoc = {
  id: 'plan_undo_test',
  currentRevision: 2,
  history: [
    { revision: 1, description: 'Original revision' },
    { revision: 2, description: 'Current revision' }
  ],
  activePlan
};
const restoredDoc = {
  ...initialDoc,
  currentRevision: 3,
  activePlan: {
    ...activePlan,
    eventDetails: { ...activePlan.eventDetails, title: 'Restored plan' }
  }
};
let request;
let confirmationMessage = '';

globalThis.document = {
  getElementById(id) {
    return id === 'plan-details-container' ? container : null;
  }
};
globalThis.window = {
  confirm(message) {
    confirmationMessage = message;
    return true;
  }
};
globalThis.fetch = async (url, options) => {
  request = { url, options };
  return {
    ok: true,
    async json() {
      return {
        success: true,
        restoredRevision: 1,
        newRevision: 3,
        conflicts: ['Preserved vendor <script>text remains inert</script>.'],
        warnings: ['Budget reconciliation completed.'],
        doc: restoredDoc
      };
    }
  };
};

try {
  const viewer = new PlanViewer();
  viewer.renderPlan(initialDoc);
  assert(container.innerHTML.includes('safe-undo-button'), 'Older revisions display Safe Undo controls');
  assert(container.innerHTML.includes('data-safe-undo-revision="1"'), 'Safe Undo control targets its historical revision');
  assert(!container.innerHTML.includes('data-safe-undo-revision="2"'), 'Active revision is not offered for Safe Undo');

  await handlers.get('click')();

  assert(confirmationMessage.includes('Paid/frozen commitments'), 'Safe Undo confirms preservation behavior');
  assert(request.options.method === 'POST', 'Safe Undo uses the existing POST endpoint');
  assert(request.url.endsWith('/api/plans/plan_undo_test/undo'), 'Safe Undo targets the selected saved plan');
  assert(JSON.parse(request.options.body).targetRevision === 1, 'Safe Undo submits the selected historical revision');
  assert(viewer.currentDoc.currentRevision === 3, 'Successful Safe Undo refreshes the current plan');
  assert(status.textContent.includes('Restored revision 1 as new revision 3'), 'Safe Undo reports the new revision');
  assert(status.textContent.includes('<script>text remains inert</script>'), 'Safe Undo conflict details are displayed as text');
  assert(status.textContent.includes('Budget reconciliation completed.'), 'Safe Undo warnings are displayed');
} finally {
  if (originalDocument === undefined) {
    delete globalThis.document;
  } else {
    globalThis.document = originalDocument;
  }
  if (originalWindow === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = originalWindow;
  }
  if (originalFetch === undefined) {
    delete globalThis.fetch;
  } else {
    globalThis.fetch = originalFetch;
  }
}
