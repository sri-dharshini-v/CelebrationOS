import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { executeSafeUndo } from '../server/historyEngine.js';
import { validateAndNormalizePlan } from '../server/invariants.js';
import { buildEventPlanPrompt, generateEventPlan } from '../server/gemini.js';
import { applyPlanShock } from '../server/shockEngine.js';
import { deletePlan, saveNewPlan } from '../server/storage.js';
import { EVENT_RITUALS, filterRitualTasksForEvent } from '../public/js/eventRituals.js';
import { PlanViewer } from '../public/js/planViewer.js';
import { WizardController } from '../public/js/wizard.js';

function assert(condition, message) {
  if (!condition) throw new Error(`FAILED: ${message}`);
  console.log(`PASSED: ${message}`);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function generate(eventType, protectedRituals = [], language = 'en', notes = '') {
  const result = await generateEventPlan({
    title: `Test ${eventType}`,
    eventType,
    date: '2030-02-14',
    location: 'Test City',
    guestCount: 50,
    totalBudget: 150000,
    currency: 'INR',
    theme: 'Test',
    notes,
    language,
    protectedRituals
  }, { forceMock: true });

  assert(result.success, `${eventType} mock plan generates successfully`);
  return result.plan;
}

const eventTypes = ['wedding', 'birthday', 'community', 'anniversary', 'corporate'];
const plans = {};
for (const eventType of eventTypes) {
  plans[eventType] = await generate(
    eventType,
    [],
    'en',
    eventType === 'other' ? 'Neighborhood art workshop' : ''
  );
}

const birthday = await generate('birthday');
const community = await generate('community');
const wedding = await generate('wedding', [
  {
    id: 'r_muhurtham',
    name: 'Muhurtham, selected by the user',
    significance: 'User-selected wedding tradition',
    isProtected: true
  },
  {
    id: 'r_kasi_yathra',
    name: 'Kashi Yatra, selected by the user',
    significance: 'User-selected wedding tradition',
    isProtected: true
  }
]);
const birthdayWithCustom = await generate('birthday', [{
  id: 'r_custom_birthday',
  name: 'Family birthday custom',
  significance: 'Explicitly requested by the user',
  isProtected: true
}]);

const serialized = Object.fromEntries(
  eventTypes.map(eventType => [eventType, JSON.stringify(plans[eventType])])
);
for (let left = 0; left < eventTypes.length; left++) {
  for (let right = left + 1; right < eventTypes.length; right++) {
    assert(
      serialized[eventTypes[left]] !== serialized[eventTypes[right]],
      `${eventTypes[left]} and ${eventTypes[right]} receive distinct mock plans`
    );
  }
}

const contentFor = plan => ({
  categories: JSON.stringify({
    names: plan.budgetCategories.map(category => category.name),
    items: plan.budgetCategories.flatMap(category => category.items.map(item => item.name))
  }),
  milestones: JSON.stringify(plan.milestones.map(milestone => ({
    title: milestone.title,
    tasks: milestone.tasks.map(task => task.title)
  }))),
  recommendations: JSON.stringify(plan.recommendations)
});
const requiredAnchors = {
  wedding: {
    categories: /ceremony|reception|photography/i,
    milestones: /ceremony|reception|photograph/i,
    recommendations: /wedding meal|ceremony and reception/i
  },
  birthday: {
    categories: /cake|birthday/i,
    milestones: /cake|games|birthday party/i,
    recommendations: /birthday cake|games/i
  },
  community: {
    categories: /community|shared food/i,
    milestones: /programme|volunteer|shared/i,
    recommendations: /community programme|shared meal/i
  },
  anniversary: {
    categories: /anniversary|memories/i,
    milestones: /anniversary|memories|dinner/i,
    recommendations: /anniversary|memory/i
  },
  corporate: {
    categories: /venue, av|registration|speaker/i,
    milestones: /agenda|registration|speakers/i,
    recommendations: /professional|networking/i
  }
};
for (const eventType of eventTypes) {
  const structuredContent = contentFor(plans[eventType]);
  for (const section of ['categories', 'milestones', 'recommendations']) {
    assert(
      requiredAnchors[eventType][section].test(structuredContent[section]),
      `${eventType} ${section} are event-specific`
    );
  }
  assert(
    Math.round(plans[eventType].budgetCategories.reduce(
      (sum, category) => sum + category.allocatedAmount, 0
    )) === 150000,
    `${eventType} budget categories preserve the exact requested total`
  );
}
assert(
  /neighborhood art workshop/i.test(
    JSON.stringify(await generate('other', [], 'en', 'Neighborhood art workshop'))
  ) &&
    !/wedding|birthday cake|saptapadi|muhurtham/i.test(
      JSON.stringify(await generate('other', [], 'en', 'Neighborhood art workshop'))
    ),
  'Other-event fallback uses the event description rather than forcing wedding or birthday content'
);
assert(
  !/muhurtham|kasi yathra|kashi yatra|saptapadi/i.test(
    JSON.stringify([plans.birthday, plans.community, plans.anniversary, plans.corporate])
  ),
  'No non-wedding event plan contains wedding-specific ceremonies'
);
assert(
  plans.wedding.protectedRituals.length === 0,
  'Wedding fallback does not automatically select Muhurtam or other rituals'
);
for (const eventType of [...eventTypes, 'other']) {
  const hindiPlan = await generate(eventType, [], 'hi');
  const tamilPlan = await generate(eventType, [], 'ta');
  assert(
    hindiPlan.eventDetails.eventType === eventType &&
      tamilPlan.eventDetails.eventType === eventType &&
      hindiPlan.budgetCategories.length > 0 &&
      tamilPlan.budgetCategories.length > 0,
    `${eventType} fallback keeps its distinct structure in Hindi and Tamil`
  );
}

const promptTerms = {
  wedding: /ceremony|reception/i,
  birthday: /cake|games/i,
  community: /volunteers|shared food/i,
  anniversary: /memories|dinner/i,
  corporate: /registration|speakers|networking/i
};
const promptEventTypes = [...eventTypes, 'other'];
for (const eventType of promptEventTypes) {
  const prompt = buildEventPlanPrompt({
    title: `Test ${eventType}`,
    eventType,
    date: '2030-02-14',
    location: 'Test City',
    guestCount: 50,
    totalBudget: 150000,
    currency: 'INR',
    theme: 'Test',
    notes: eventType === 'other' ? 'Neighborhood art workshop' : '',
    language: 'en'
  });
  assert(
    (promptTerms[eventType] || /infer.*user|event description/i).test(prompt),
    `${eventType} real-Gemini prompt contains explicit event-specific planning instructions`
  );
}

for (const [eventType, plan] of [
  ['birthday', birthday],
  ['community', community],
  ['anniversary', plans.anniversary],
  ['corporate', plans.corporate]
]) {
  assert(
    plan.protectedRituals.length === 0,
    `${eventType} plan does not inherit mock wedding protected rituals`
  );
  assert(
    !/muhurtham|kasi yathra|kashi yatra|saptapadi/i.test(JSON.stringify(plan)),
    `${eventType} plan contains no wedding-specific ceremonies`
  );
}
const mixedEventTasks = {
  milestones: [{
    tasks: [
      { id: 'task_custom', title: 'Kashi Yatra ceremony' },
      { id: 'task_birthday', title: 'Birthday cake celebration' }
    ]
  }]
};
filterRitualTasksForEvent(mixedEventTasks, 'birthday');
assert(
  mixedEventTasks.milestones[0].tasks.length === 1 &&
    mixedEventTasks.milestones[0].tasks[0].id === 'task_birthday',
  'Event-specific plan cleanup removes wedding ceremony tasks from other events'
);
assert(
  wedding.protectedRituals.length === 2 &&
    wedding.protectedRituals.every(ritual => ritual.isProtected),
  'Selected wedding traditions remain protected for a wedding'
);
assert(
  (await generate('wedding')).protectedRituals.length === 0,
  'Wedding traditions are not automatically added when the user selected none'
);
assert(
  birthdayWithCustom.protectedRituals.length === 1 &&
    birthdayWithCustom.protectedRituals[0].id === 'r_custom_birthday',
  'Explicit custom rituals remain supported for birthdays'
);
assert(
  EVENT_RITUALS.birthday.every(ritual => !/muhurtham|kasi|saptapadi/i.test(ritual.name)),
  'Birthday ritual suggestions contain no wedding traditions'
);

const eventTypeListeners = {};
const eventTypeInput = {
  value: 'birthday',
  addEventListener(name, callback) {
    eventTypeListeners[name] = callback;
  }
};
const ritualContainer = { innerHTML: '' };
globalThis.document = {
  getElementById(id) {
    if (id === 'g-type') return eventTypeInput;
    if (id === 'rituals-checkbox-container') return ritualContainer;
    return null;
  }
};
const wizard = new WizardController();
wizard.bindRituals();
wizard.renderRituals();
assert(
  ritualContainer.innerHTML.includes('r_birthday_cake') &&
    !ritualContainer.innerHTML.includes('r_muhurtham'),
  'Guided ritual choices show birthday customs without wedding rituals'
);
eventTypeInput.value = 'wedding';
eventTypeListeners.change();
assert(
  ritualContainer.innerHTML.includes('r_muhurtham') &&
    ritualContainer.innerHTML.includes('Muhurtham') &&
    !ritualContainer.innerHTML.includes('r_birthday_cake'),
  'Guided ritual choices offer optional Muhurtam only after Wedding is selected'
);
for (const eventType of ['birthday', 'community', 'anniversary', 'corporate']) {
  eventTypeInput.value = eventType;
  eventTypeListeners.change();
  assert(
    !ritualContainer.innerHTML.includes('r_muhurtham'),
    `Guided ritual choices hide Muhurtam for ${eventType}`
  );
}
assert(
  PlanViewer.prototype.renderProtectedRituals.call({}, wedding.protectedRituals, 'birthday') === '',
  'Protected-traditions UI hides legacy wedding rituals on birthday plans'
);

const invalidBirthday = clone(birthday);
invalidBirthday.protectedRituals = [wedding.protectedRituals[0]];
const invalidValidation = validateAndNormalizePlan(invalidBirthday);
assert(
  !invalidValidation.isValid &&
    invalidValidation.violations.some(violation => violation.includes('EVENT-TYPE VIOLATION')),
  'Validation rejects newly added wedding rituals on a birthday plan'
);

const legacyBirthday = clone(birthdayWithCustom);
legacyBirthday.eventDetails.date = '2030-02-14';
legacyBirthday.protectedRituals.push(wedding.protectedRituals[0]);
const shockedLegacy = applyPlanShock(legacyBirthday, { targetEventDate: '2030-02-15' });
assert(
  shockedLegacy.plan.protectedRituals.length === 1 &&
    shockedLegacy.plan.protectedRituals[0].id === 'r_custom_birthday',
  'Shock Engine removes an inapplicable legacy wedding ritual but preserves the custom ritual'
);

const planDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'data',
  'plans'
);
let savedPlanId;
try {
  const undoPlan = clone(birthdayWithCustom);
  undoPlan.eventDetails.eventType = 'birthday';
  undoPlan.eventDetails.date = '2030-02-14';
  undoPlan.protectedRituals = [{
    id: 'r_custom_birthday',
    name: 'Family birthday custom',
    significance: 'Explicitly requested by the user',
    isProtected: true
  }];
  const saved = saveNewPlan(undoPlan, 'Event-specific ritual regression test');
  savedPlanId = saved.id;
  saved.activePlan.protectedRituals.push(wedding.protectedRituals[0]);
  saved.history[0].planSnapshot.protectedRituals.push(wedding.protectedRituals[0]);
  fs.writeFileSync(
    path.join(planDirectory, `${savedPlanId}.json`),
    JSON.stringify(saved, null, 2),
    'utf8'
  );

  const undo = executeSafeUndo(savedPlanId, 1);
  assert(
    undo.doc.activePlan.protectedRituals.length === 1 &&
      undo.doc.activePlan.protectedRituals[0].id === 'r_custom_birthday',
    'Safe Undo removes legacy wedding traditions from a birthday and retains the user custom ritual'
  );
  assert(
    undo.conflicts.some(conflict => conflict.includes('not applicable to the restored event type')),
    'Safe Undo reports when it removes an inapplicable legacy ritual'
  );
} finally {
  if (savedPlanId) deletePlan(savedPlanId);
}
