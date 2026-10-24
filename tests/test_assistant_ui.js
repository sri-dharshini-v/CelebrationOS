import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const html = await readFile(path.join(rootDir, 'public', 'index.html'), 'utf8');
const styles = await readFile(path.join(rootDir, 'public', 'css', 'style.css'), 'utf8');
const locales = await Promise.all(
  ['en', 'hi', 'ta'].map(async language =>
    JSON.parse(await readFile(path.join(rootDir, 'public', 'locales', `${language}.json`), 'utf8'))
  )
);

function assert(condition, message) {
  if (!condition) throw new Error(`FAILED: ${message}`);
  console.log(`PASSED: ${message}`);
}

function makeElement({ hidden = false, dataset = {} } = {}) {
  return {
    hidden,
    dataset,
    listeners: {},
    attributes: {},
    value: '',
    disabled: false,
    addEventListener(name, callback) {
      this.listeners[name] = callback;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    focus() {
      globalThis.document.activeElement = this;
    },
    click() {
      this.listeners.click?.({ preventDefault() {} });
    }
  };
}

assert(
  !html.includes('Step 2 Active: Multilingual Engine') &&
    !html.includes('Live Verification Controls') &&
    !html.includes('Switch UI Language:') &&
    !html.includes('Switch AI Plan Language:') &&
    !html.includes('id="test-ui-lang-select"') &&
    !html.includes('id="test-plan-lang-select"'),
  'Developer-only language status and verification controls are removed'
);
assert(
  ['header-ui-lang-select', 'header-plan-lang-select', 'header-assistant-lang-select',
    'settings-ui-lang-select', 'settings-plan-lang-select', 'settings-assistant-lang-select']
    .every(id => html.includes(`id="${id}"`)),
  'Header and Settings retain the three independent language preferences'
);
assert(
  html.includes('id="assistant-panel"') &&
    html.includes('role="dialog"') &&
    /id="assistant-panel"[^>]*\shidden>/.test(html) &&
    html.includes('id="assistant-launcher"') &&
    html.includes('aria-haspopup="dialog"') &&
    html.includes('aria-controls="assistant-panel"') &&
    html.includes('aria-expanded="false"') &&
    html.includes('id="assistant-close"'),
  'Existing assistant is initially closed with an accessible robot launcher and close control'
);
assert(
  /<span class="assistant-launcher-label" data-i18n="assistant_launcher_label">/.test(html) &&
    html.includes('<svg class="assistant-robot"') &&
    html.includes('class="robot-eye-glow"') &&
    html.includes('class="assistant-robot-sparkle"') &&
    html.includes('class="assistant-robot-status"'),
  'Launcher includes a localized label and expressive inline robot details'
);
assert(
  styles.includes('.assistant-launcher-wrap') &&
    styles.includes('.assistant-launcher-label') &&
    /\.assistant-launcher-wrap\s*\{[^}]*position:\s*fixed;[^}]*right:\s*20px;[^}]*bottom:/s.test(styles) &&
    styles.includes('animation: assistant-robot-float') &&
    styles.includes('animation: assistant-eye-pulse') &&
    styles.includes('animation: assistant-sparkle-twinkle') &&
    styles.includes('.assistant-launcher:hover') &&
    styles.includes('.assistant-launcher:focus-visible') &&
    styles.includes('@media (prefers-reduced-motion: reduce)') &&
    styles.includes('animation-duration: 0.01ms !important') &&
    styles.includes('@media (max-width: 680px)') &&
    styles.includes('max-height: calc(100dvh - 100px - env(safe-area-inset-bottom, 0px))'),
  'Robot motion respects reduced-motion settings and the assistant panel adapts to mobile viewports'
);
assert(
  locales.every(locale =>
    locale.assistant_open &&
    locale.assistant_close &&
    locale.assistant_launcher_label
  ) &&
    locales[0].assistant_launcher_label === 'AI Event Assistant',
  'Robot label and controls have localized English, Hindi, and Tamil text'
);
assert(
  locales.every(locale =>
    locale.wizard_mode_quick_desc &&
    locale.wizard_mode_guided_desc &&
    locale.budget_disclaimer &&
    !locale.budget_disclaimer.toLowerCase().includes('backend') &&
    !locale.budget_disclaimer.toLowerCase().includes('invariant')
  ),
  'Beginner-friendly planner descriptions and budget guidance are localized'
);

const launcher = makeElement();
const closeButton = makeElement();
const panel = makeElement({ hidden: true });
const questionInput = makeElement();
const promptButton = makeElement({ dataset: { assistantPrompt: 'Suggest a checklist' } });
const elements = new Map([
  ['assistant-form', makeElement()],
  ['assistant-question', questionInput],
  ['assistant-event-type', makeElement()],
  ['assistant-messages', makeElement()],
  ['assistant-status', makeElement()],
  ['assistant-send', makeElement()],
  ['assistant-panel', panel],
  ['assistant-launcher', launcher],
  ['assistant-close', closeButton]
]);
const documentListeners = {};
globalThis.document = {
  activeElement: null,
  getElementById: id => elements.get(id) || null,
  querySelectorAll: selector => selector === '[data-assistant-prompt]' ? [promptButton] : [],
  addEventListener(name, callback) {
    documentListeners[name] = callback;
  }
};

const { assistant } = await import('../public/js/assistant.js');
assistant.init();

launcher.click();
assert(!panel.hidden, 'Clicking the robot opens the existing assistant panel');
assert(launcher.attributes['aria-expanded'] === 'true', 'Opening the assistant updates expanded state');
assert(document.activeElement === questionInput, 'Opening the assistant moves focus to its question field');

promptButton.click();
assert(
  questionInput.value === 'Suggest a checklist' && document.activeElement === questionInput,
  'Existing prompt suggestions still populate and focus the question field'
);

closeButton.click();
assert(panel.hidden, 'The close button closes the assistant panel');
assert(launcher.attributes['aria-expanded'] === 'false', 'Closing the assistant updates expanded state');
assert(document.activeElement === launcher, 'Closing the assistant restores focus to the robot');

launcher.click();
let escapePrevented = false;
documentListeners.keydown({
  key: 'Escape',
  preventDefault() {
    escapePrevented = true;
  }
});
assert(panel.hidden && escapePrevented, 'Escape closes the assistant panel');
assert(document.activeElement === launcher, 'Escape restores focus to the robot');
