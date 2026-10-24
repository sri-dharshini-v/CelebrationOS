import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const html = await readFile(path.join(rootDir, 'public', 'index.html'), 'utf8');
const locales = await Promise.all(
  ['en', 'hi', 'ta'].map(async code => JSON.parse(
    await readFile(path.join(rootDir, 'public', 'locales', `${code}.json`), 'utf8')
  ))
);

function assert(condition, message) {
  if (!condition) throw new Error(`FAILED: ${message}`);
  console.log(`PASSED: ${message}`);
}

function fieldTag(id) {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.match(new RegExp(`<(?:input|select)\\b[^>]*\\bid="${escapedId}"[^>]*>`, 'i'))?.[0] || '';
}

function assertFieldOrder(ids, start, end, mode) {
  const section = html.slice(html.indexOf(start), html.indexOf(end, html.indexOf(start)));
  const positions = ids.map(id => section.indexOf(`for="${id}"`));
  assert(
    positions.every((position, index) => position >= 0 && (index === 0 || position > positions[index - 1])),
    `${mode} presents event type, title, date, location, guests, budget, and currency in order`
  );
}

assert(
  html.includes('id="tab-mode-quick" type="button" class="mode-tab mode-tab-primary active" aria-pressed="true"') &&
  html.includes('id="tab-mode-guided" type="button" class="mode-tab mode-tab-alternative" aria-pressed="false"'),
  'Quick Plan is the primary default and Guided Planner is an optional alternative'
);
assertFieldOrder(
  ['q-type', 'q-title', 'q-date', 'q-location', 'q-guests', 'q-budget', 'q-currency'],
  '<div id="form-quick-card"',
  '<div id="form-guided-card"',
  'Quick Plan'
);
assertFieldOrder(
  ['g-type', 'g-title', 'g-date', 'g-location', 'g-guests', 'g-budget', 'g-currency'],
  '<div id="form-guided-card"',
  '<!-- Loading State Overlay -->',
  'Guided Planner'
);

for (const id of ['q-type', 'q-title', 'q-date', 'q-guests', 'q-budget', 'g-type', 'g-title', 'g-date', 'g-guests', 'g-budget']) {
  assert(/\brequired\b/.test(fieldTag(id)), `${id} is marked required in the form`);
}
for (const id of ['q-location', 'g-location']) {
  assert(!/\brequired\b/.test(fieldTag(id)), `${id} remains optional`);
}
for (const id of ['q-type', 'g-type']) {
  assert(
    fieldTag(id).includes('required') &&
    html.includes(`<option value="" data-i18n="type_select_prompt" selected disabled>Choose an event type</option>`),
    `${id} starts without an assumed event type`
  );
}
for (const id of ['q-title', 'q-location', 'q-guests', 'q-budget', 'g-title', 'g-location', 'g-guests', 'g-budget', 'g-theme']) {
  assert(!/\bvalue=/.test(fieldTag(id)), `${id} has no prefilled event-specific value`);
}
for (const id of ['q-title', 'g-title']) {
  const input = fieldTag(id);
  const fieldName = html.match(new RegExp(`<label for="${id}">([^<]*<span data-i18n="field_title">)([^<]+)`))?.[2];
  assert(fieldName === 'Event Name', `${id} label is Event Name`);
  assert(
    input.includes('data-i18n="field_title_placeholder"') &&
      input.includes('placeholder="e.g., Anu’s Birthday"'),
    `${id} has the localized Anu’s Birthday placeholder`
  );
  assert(
    html.includes(`<p class="form-hint" data-i18n="field_title_hint">Give your event a name so you can easily find it later.</p>`),
    `${id} has event-name helper text`
  );
}
assert(
  locales.every(locale =>
    locale.field_title &&
    locale.field_title_placeholder &&
    locale.field_title_hint
  ) &&
  locales[0].field_title === 'Event Name' &&
  locales[0].field_title_placeholder === 'e.g., Anu’s Birthday' &&
  locales[0].field_title_hint === 'Give your event a name so you can easily find it later.' &&
  locales.slice(1).every(locale =>
    locale.field_title !== locales[0].field_title &&
    locale.field_title_placeholder !== locales[0].field_title_placeholder &&
    locale.field_title_hint !== locales[0].field_title_hint
  ),
  'Event name label, placeholder, and helper text have English, Hindi, and Tamil translations'
);
assert(
  html.includes('data-i18n="field_currency_default"') && html.includes('<option value="INR">INR (₹)</option>'),
  'Currency is labeled with the INR default'
);
assert(
  locales.every(locale =>
    locale.wizard_mode_quick_desc &&
    locale.wizard_mode_guided_desc &&
    locale.form_required_hint &&
    locale.field_location_optional &&
    locale.field_currency_default
  ),
  'Quick-start guidance and required/optional/currency labels are localized'
);

const values = new Map([
  ['wizard-alert-error', {
    textContent: '',
    classList: { add() {}, remove() {} }
  }],
  ['g-type', { value: '' }],
  ['g-title', { value: '' }],
  ['g-date', { value: '' }],
  ['g-guests', { value: '' }],
  ['g-budget', { value: '' }],
  ['q-type', { value: '' }],
  ['q-title', { value: 'Family celebration' }],
  ['q-date', { value: '2030-01-01' }],
  ['q-location', { value: '' }],
  ['q-guests', { value: '100' }],
  ['q-budget', { value: '500000' }],
  ['q-currency', { value: 'INR' }]
]);
globalThis.document = { getElementById: id => values.get(id) || null };

const { WizardController } = await import('../public/js/wizard.js');
const wizard = new WizardController();
assert(wizard.selectedRituals.size === 0, 'Guided Planner does not preselect a wedding-specific ritual');
assert(!wizard.validateStep(1), 'Guided Planner requires event type, title, and date');
values.get('g-type').value = 'birthday';
values.get('g-title').value = 'Family celebration';
values.get('g-date').value = '2030-01-01';
assert(wizard.validateStep(1), 'Guided Planner accepts completed basic event details');
assert(!wizard.validateStep(2), 'Guided Planner requires guest count and budget');
values.get('g-guests').value = '100';
values.get('g-budget').value = '500000';
assert(wizard.validateStep(2), 'Guided Planner accepts completed guest and budget details');

let quickPayload;
wizard.generateAndSavePlan = async payload => {
  quickPayload = payload;
};
await wizard.submitQuickPlan();
assert(!quickPayload, 'Quick Plan rejects a missing event type instead of assuming a wedding');
values.get('q-type').value = 'community';
await wizard.submitQuickPlan();
assert(quickPayload?.eventType === 'community', 'Quick Plan preserves the selected event type');
assert(quickPayload?.location === 'Not specified', 'An omitted optional location is not replaced with a fictitious city');
