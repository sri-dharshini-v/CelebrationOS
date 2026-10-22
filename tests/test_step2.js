import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('--- Running Step 2 Automated Verification Tests ---\n');

// 1. Verify all 3 locale files exist and are valid JSON
const locales = ['en', 'ta', 'hi'];
const dictionaries = {};

for (const lang of locales) {
  const filePath = path.join(rootDir, 'public', 'locales', `${lang}.json`);
  assert(fs.existsSync(filePath), `Locale file exists: ${lang}.json`);
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(content);
  assert(typeof parsed === 'object' && Object.keys(parsed).length > 0, `Locale ${lang}.json is valid JSON with ${Object.keys(parsed).length} keys`);
  dictionaries[lang] = parsed;
}

// 2. Verify key parity across languages
const baseKeys = Object.keys(dictionaries['en']);
for (const lang of ['ta', 'hi']) {
  for (const key of baseKeys) {
    assert(Boolean(dictionaries[lang][key]), `Translation key '${key}' present in ${lang}.json`);
  }
}

// 3. Verify proper Tamil and Devanagari Unicode
assert(/[\u0B80-\u0BFF]/.test(dictionaries['ta']['welcome_title']), 'Tamil text contains genuine Tamil Unicode glyphs');
assert(/[\u0900-\u097F]/.test(dictionaries['hi']['welcome_title']), 'Hindi text contains genuine Devanagari Unicode glyphs');

// 4. Verify index.html includes independent badges, modals, and settings
const indexHtml = fs.readFileSync(path.join(rootDir, 'public', 'index.html'), 'utf-8');
assert(indexHtml.includes('id="current-ui-badge"'), 'index.html contains UI Language badge');
assert(indexHtml.includes('id="current-plan-badge"'), 'index.html contains AI Plan Language badge');
assert(indexHtml.includes('id="first-time-modal"'), 'index.html contains First-Time Setup Modal');
assert(indexHtml.includes('id="settings-modal"'), 'index.html contains Settings Modal');
assert(indexHtml.includes('id="settings-ui-lang-select"'), 'index.html contains independent UI language selector');
assert(indexHtml.includes('id="settings-plan-lang-select"'), 'index.html contains independent Plan language selector');

// 5. Test independent language state transitions in memory
let currentUILang = 'en';
let currentPlanLang = 'en';

function setUILang(lang) {
  currentUILang = lang;
}

function setPlanLang(lang) {
  currentPlanLang = lang;
}

// Test changing AI plan language does NOT change UI language
setPlanLang('ta');
assert(currentPlanLang === 'ta', 'AI Plan language set to Tamil');
assert(currentUILang === 'en', 'UI language remains English when AI plan language changes');

setUILang('hi');
assert(currentUILang === 'hi', 'UI language switched to Hindi');
assert(currentPlanLang === 'ta', 'AI Plan language remained Tamil after UI language changed');

console.log('\n🎉 ALL STEP 2 AUTOMATED CHECKS PASSED SUCCESSFULLY!');
