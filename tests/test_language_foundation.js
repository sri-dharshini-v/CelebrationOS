import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const storage = new Map([
  ['celebrationos_ui_lang', 'bho-Deva'],
  ['celebrationos_plan_lang', 'bho-Deva'],
  ['celebrationos_assistant_lang', 'pa-Arab']
]);

Object.defineProperty(globalThis, 'navigator', {
  value: { language: 'ta-IN', languages: ['ta-IN'] },
  configurable: true
});
globalThis.localStorage = {
  getItem(key) {
    return storage.get(key) ?? null;
  },
  setItem(key, value) {
    storage.set(key, String(value));
  },
  removeItem(key) {
    storage.delete(key);
  }
};

function makeSelect() {
  return {
    options: [],
    replaceChildren() {
      this.options = [];
    },
    append(option) {
      this.options.push(option);
    }
  };
}

const elements = new Map();
for (const id of [
  'ft-ui-lang-select',
  'settings-ui-lang-select',
  'ft-plan-lang-select',
  'settings-plan-lang-select',
  'ft-assistant-lang-select',
  'settings-assistant-lang-select',
  'header-ui-lang-select',
  'header-plan-lang-select',
  'header-assistant-lang-select',
  'test-ui-lang-select',
  'test-plan-lang-select'
]) {
  elements.set(id, makeSelect());
}
for (const id of ['current-ui-badge', 'current-plan-badge']) {
  elements.set(id, { textContent: '' });
}
elements.set('language-preference-notice', { hidden: true });

globalThis.document = {
  documentElement: { lang: '', dir: '' },
  getElementById: id => elements.get(id) || null,
  createElement: () => ({
    dataset: {},
    hidden: false,
    setAttribute(name, value) {
      this[name] = value;
    }
  }),
  querySelectorAll: () => []
};

globalThis.fetch = async url => {
  const fileName = String(url).split('/').pop();
  try {
    const text = await readFile(path.join(rootDir, 'public', 'locales', fileName), 'utf8');
    return { ok: true, status: 200, json: async () => JSON.parse(text) };
  } catch {
    return { ok: false, status: 404, json: async () => ({}) };
  }
};

function assert(condition, message) {
  if (!condition) throw new Error(`FAILED: ${message}`);
  console.log(`PASSED: ${message}`);
}

async function runTests() {
  const catalogue = JSON.parse(
    await readFile(path.join(rootDir, 'public', 'locales', 'languages.json'), 'utf8')
  );
  const indexHtml = await readFile(path.join(rootDir, 'public', 'index.html'), 'utf8');
  const styleCss = await readFile(path.join(rootDir, 'public', 'css', 'style.css'), 'utf8');
  const i18nSource = await readFile(path.join(rootDir, 'public', 'js', 'i18n.js'), 'utf8');
  const { getLanguage } = await import('../server/languages.js');
  const { i18n } = await import('../public/js/i18n.js');
  const state = await i18n.init();
  const primaryLanguageIds = ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'kn', 'ml', 'gu', 'pa'];
  const primaryLanguages = [
    ['en', 'English', 'English', 'Latin'],
    ['hi', 'Hindi', 'हिन्दी', 'Devanagari'],
    ['ta', 'Tamil', 'தமிழ்', 'Tamil'],
    ['te', 'Telugu', 'తెలుగు', 'Telugu'],
    ['bn', 'Bengali', 'বাংলা', 'Bengali'],
    ['mr', 'Marathi', 'मराठी', 'Devanagari'],
    ['kn', 'Kannada', 'ಕನ್ನಡ', 'Kannada'],
    ['ml', 'Malayalam', 'മലയാളം', 'Malayalam'],
    ['gu', 'Gujarati', 'ગુજરાતી', 'Gujarati'],
    ['pa', 'Punjabi', 'ਪੰਜਾਬੀ', 'Gurmukhi']
  ];

  assert(
    !indexHtml.includes('data-language-search-for') &&
      !indexHtml.includes('language-search') &&
      !indexHtml.includes('type="search"') &&
      !styleCss.includes('.language-search') &&
      !i18nSource.includes('bindLanguageSearch'),
    'Language controls use plain dropdowns without search UI or filtering logic'
  );
  for (const selectId of [
    'settings-ui-lang-select',
    'settings-plan-lang-select',
    'settings-assistant-lang-select',
    'header-ui-lang-select',
    'header-plan-lang-select',
    'header-assistant-lang-select',
    'ft-ui-lang-select',
    'ft-plan-lang-select',
    'ft-assistant-lang-select'
  ]) {
    assert(
      indexHtml.includes(`<select id="${selectId}" class="select-styled"`),
      `${selectId} remains a theme-styled native dropdown`
    );
  }

  assert(catalogue.languages.length >= 35, 'Catalogue includes broad language and variety coverage');
  assert(catalogue.languages.some(language => language.id === 'bho-Deva'), 'Catalogue includes a non-Scheduled language variety');
  assert(catalogue.languages.some(language => language.id === 'ks-Arab' && language.direction === 'rtl'), 'Catalogue represents right-to-left script variants');
  assert(
    JSON.stringify(catalogue.primaryLanguageIds) === JSON.stringify(primaryLanguageIds),
    'Catalogue lists exactly the ten primary language IDs in the requested order'
  );
  for (const [id, englishName, nativeName, script] of primaryLanguages) {
    const language = catalogue.languages.find(entry => entry.id === id);
    assert(
      language?.englishName === englishName &&
        language.nativeName === nativeName &&
        language.script === script,
      `${id} has the correct English/native names and script`
    );
    assert(getLanguage(id)?.id === id, `${id} is accepted by server-side language validation`);
  }
  for (const selectId of [
    'settings-ui-lang-select',
    'settings-plan-lang-select',
    'settings-assistant-lang-select',
    'header-ui-lang-select',
    'header-plan-lang-select',
    'header-assistant-lang-select',
    'ft-ui-lang-select',
    'ft-plan-lang-select',
    'ft-assistant-lang-select',
    'test-ui-lang-select',
    'test-plan-lang-select'
  ]) {
    assert(
      JSON.stringify(elements.get(selectId).options.map(option => option.value)) === JSON.stringify(primaryLanguageIds),
      `${selectId} contains only the ten primary languages in order`
    );
    assert(
      JSON.stringify(elements.get(selectId).options.map(option => option.textContent)) ===
        JSON.stringify(primaryLanguages.map(([, englishName]) => englishName)),
      `${selectId} displays only English language names in the requested order`
    );
  }
  assert(
    state.uiLang === 'ta' && state.planLang === 'ta' && state.assistantLang === 'ta',
    'Saved non-primary plan and Assistant preferences fall back to the selected UI language'
  );
  assert(
    storage.get('celebrationos_plan_lang') === 'ta' &&
      storage.get('celebrationos_ui_lang') === 'ta' &&
      !storage.has('celebrationos_assistant_lang'),
    'Unavailable screen/plan preferences fall back safely and stale Assistant preferences are cleared'
  );
  assert(elements.get('language-preference-notice').hidden === false, 'Unavailable saved preferences show a clear notice');
  assert(i18n.translationStatus === 'partial', 'Existing Tamil UI is marked partial pending full coverage review');
  assert(
    primaryLanguages.slice(3).every(([id]) => {
      const language = catalogue.languages.find(entry => entry.id === id);
      return language.uiStatus === 'unavailable' && language.aiStatus === 'unverified';
    }),
    'Newly selectable languages are marked untranslated and AI-unverified'
  );
  assert(
    catalogue.languages.find(language => language.id === 'en').uiStatus === 'complete' &&
      ['hi', 'ta'].every(id =>
        catalogue.languages.find(language => language.id === id).uiStatus === 'partial'
      ) &&
      primaryLanguages.every(([id]) =>
        catalogue.languages.find(language => language.id === id).aiStatus === 'unverified'
      ),
    'Existing translation coverage is preserved and no primary language is marked AI-verified'
  );
  assert(
    elements.get('header-ui-lang-select').options.every(option =>
      !option.textContent.includes(' — ') &&
      !option.textContent.includes('(') &&
      !option.textContent.includes(')') &&
      !option.textContent.includes('fallback') &&
      !option.textContent.includes('verified')
    ),
    'Dropdown option labels do not include native names or status text'
  );
  assert(
    indexHtml.includes('id="language-preference-notice"') &&
      indexHtml.includes('language_saved_preference_notice'),
    'Retired saved preferences have an accessible, localized explanation in the language controls'
  );

  assert(await i18n.setUILanguage('gu'), 'A newly added primary language can be selected for the UI');
  assert(document.documentElement.lang === 'gu' && document.documentElement.dir === 'ltr', 'Selected language and script direction reach the document');
  assert(i18n.t('welcome_title') === 'Welcome to CelebrationOS', 'Missing UI translations fall back to English');
  assert(i18n.getStatusLabel('gu', 'ui').includes('English fallback'), 'UI fallback status remains available outside dropdowns');
  assert(getLanguage('bho-Deva') === undefined, 'A retained non-primary language is rejected by server-side validation');
  assert(!i18n.isValidLanguage('bho-Deva'), 'A retained non-primary language is rejected for selection');
  assert(!i18n.isValidLanguage('fr'), 'An unknown language is rejected for selection');

  assert(i18n.setPlanLanguage('te'), 'Plan output language can be set independently to a primary language');
  assert(i18n.currentAssistantLang === 'te', 'Assistant follows the plan language while no independent choice exists');
  assert(elements.get('header-assistant-lang-select').value === 'te', 'Header Assistant selector follows the default plan-language preference');
  assert(i18n.setAssistantLanguage('bn'), 'Assistant response language can be set independently');
  assert(i18n.setPlanLanguage('pa'), 'Plan language can change after selecting an Assistant language');
  assert(i18n.currentAssistantLang === 'bn', 'Changing plan language does not override an explicit Assistant preference');
  assert(i18n.setPlanLanguage('pa-Arab') === false, 'A retired language variant cannot be selected for an event plan');
  assert(i18n.setPlanLanguage('invalid-language') === false, 'Unknown preference values are rejected');
  assert(i18n.currentPlanLang === 'pa', 'Rejected preference does not change the selected language');
  assert(i18n.setAssistantLanguage('bho-Deva') === false, 'A retired language cannot be selected for Assistant replies');
  assert(i18n.setAssistantLanguage('invalid-language') === false, 'Unknown Assistant language values are rejected');

  const reloaded = await i18n.init();
  assert(reloaded.uiLang === 'gu', 'UI preference persists');
  assert(reloaded.planLang === 'pa', 'Plan preference persists');
  assert(reloaded.assistantLang === 'bn', 'Independent Assistant preference persists');

  assert(
    await i18n.confirmPreferences('ta', 'hi', 'kn'),
    'Initial preferences accept each primary language independently'
  );
  assert(i18n.currentUILang === 'ta' && i18n.currentPlanLang === 'hi' && i18n.currentAssistantLang === 'kn', 'Initial preference confirmation stores three separate choices');
  assert(
    await i18n.confirmPreferences('ta', 'bho-Deva', 'en') === false,
    'Initial preference confirmation rejects retained non-primary languages'
  );
  assert(
    await i18n.confirmPreferences('ta', 'unsupported', 'en') === false,
    'Initial preference confirmation rejects unknown language values'
  );
}

runTests().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
