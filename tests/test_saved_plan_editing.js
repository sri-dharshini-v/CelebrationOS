import { PlanViewer } from '../public/js/planViewer.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`FAILED: ${message}`);
  }
  console.log(`PASSED: ${message}`);
}

const originalDocument = globalThis.document;
const originalFetch = globalThis.fetch;
const handlers = new Map();
const editor = { hidden: true, scrollIntoView() {} };
const editButton = { setAttribute() {}, addEventListener(name, handler) { handlers.set(`edit:${name}`, handler); } };
const cancelButton = { addEventListener(name, handler) { handlers.set(`cancel:${name}`, handler); } };
const saveButton = { disabled: false, addEventListener(name, handler) { handlers.set(`save:${name}`, handler); } };
const status = { textContent: '' };
const fields = {
  title: { value: 'Updated celebration' },
  date: { value: '2031-03-04' },
  location: { value: 'Updated location' },
  guestCount: { value: '120' },
  totalBudget: { value: '1200' },
  currency: { value: 'USD' },
  theme: { value: 'Garden' },
  notes: { value: 'Edited notes' }
};
const allocationInput = {
  dataset: { budgetCategoryIndex: '0' },
  value: '120'
};
const container = {
  innerHTML: '',
  style: {},
  querySelector(selector) {
    if (selector === '#saved-plan-editor') return editor;
    if (selector === '#edit-saved-plan') return editButton;
    if (selector === '#cancel-saved-plan-edit') return cancelButton;
    if (selector === '#save-saved-plan') return saveButton;
    if (selector === '#saved-plan-edit-status') return status;
    const fieldMatch = selector.match(/^\[data-plan-field="(.+)"\]$/);
    if (fieldMatch) return fields[fieldMatch[1]] || null;
    return null;
  },
  querySelectorAll(selector) {
    if (selector === '[data-budget-category-index]') return [allocationInput];
    return [];
  }
};

const initialDoc = {
  id: 'plan_edit_test',
  currentRevision: 1,
  history: [{ revision: 1, timestamp: '2030-01-01T00:00:00.000Z' }],
  activePlan: {
    eventDetails: {
      title: 'Original',
      eventType: 'birthday',
      date: '2030-01-01',
      location: 'Old location',
      guestCount: 100,
      totalBudget: 1000,
      currency: 'USD',
      language: 'en',
      theme: 'Classic',
      notes: ''
    },
    budgetCategories: [{
      id: 'cat_general',
      name: 'General',
      allocatedAmount: 1000,
      percentage: 100,
      items: []
    }],
    milestones: [],
    protectedRituals: [],
    recommendations: { venues: [], vendors: [] }
  }
};

let request;
const updatedDoc = {
  ...initialDoc,
  currentRevision: 2,
  activePlan: {
    ...initialDoc.activePlan,
    eventDetails: {
      ...initialDoc.activePlan.eventDetails,
      title: fields.title.value,
      date: fields.date.value,
      location: fields.location.value,
      guestCount: 120,
      totalBudget: 1200,
      currency: fields.currency.value,
      theme: fields.theme.value,
      notes: fields.notes.value
    },
    budgetCategories: [{
      ...initialDoc.activePlan.budgetCategories[0],
      allocatedAmount: 1200
    }]
  }
};

globalThis.document = {
  getElementById(id) {
    return id === 'plan-details-container' ? container : null;
  }
};
globalThis.fetch = async (url, options) => {
  request = { url, options };
  return {
    ok: true,
    async json() {
      return { success: true, doc: updatedDoc, warnings: [] };
    }
  };
};

try {
  const viewer = new PlanViewer();
  viewer.renderPlan(initialDoc);
  handlers.get('edit:click')();
  assert(editor.hidden === false, 'Edit button opens saved-plan editor');

  await handlers.get('save:click')();

  assert(request.options.method === 'PUT', 'Editor saves through the existing plan update endpoint');
  const payload = JSON.parse(request.options.body);
  assert(payload.plan.eventDetails.title === 'Updated celebration', 'Editor submits updated event details');
  assert(payload.plan.eventDetails.date === '2031-03-04', 'Editor submits the selected event date');
  assert(payload.plan.budgetCategories[0].allocatedAmount === 120, 'Editor submits updated budget allocations');
  assert(viewer.currentDoc.currentRevision === 2, 'Successful save refreshes the displayed revision');
  assert(status.textContent.includes('Saved as revision 2'), 'Successful save reports the new revision');
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
