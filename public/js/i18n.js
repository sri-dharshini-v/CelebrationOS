/**
 * CelebrationOS Multilingual Engine
 * Supports: English (en), Tamil (ta), Hindi (hi)
 * Features:
 * - Device language detection
 * - Independent UI vs AI Plan language configurations
 * - Zero-reload live DOM updates
 * - LocalStorage persistence
 */

const SUPPORTED_LANGUAGES = {
  en: { code: 'en', name: 'English', nativeName: 'English' },
  ta: { code: 'ta', name: 'ta', nativeName: 'தமிழ் (Tamil)' },
  hi: { code: 'hi', name: 'hi', nativeName: 'हिन्दी (Hindi)' }
};

const STORAGE_KEYS = {
  UI_LANG: 'celebrationos_ui_lang',
  PLAN_LANG: 'celebrationos_plan_lang',
  CONFIRMED: 'celebrationos_lang_confirmed'
};

class I18nEngine {
  constructor() {
    this.currentUILang = 'en';
    this.currentPlanLang = 'en';
    this.translations = {};
    this.cache = {};
  }

  /**
   * Detects the user's browser/system language
   * @returns {{code: string, name: string}}
   */
  detectBrowserLanguage() {
    const raw = (navigator.language || (navigator.languages && navigator.languages[0]) || 'en').toLowerCase();
    
    if (raw.startsWith('ta')) {
      return { code: 'ta', name: 'தமிழ் (Tamil)' };
    }
    if (raw.startsWith('hi')) {
      return { code: 'hi', name: 'हिन्दी (Hindi)' };
    }
    return { code: 'en', name: 'English' };
  }

  /**
   * Checks if the user has already confirmed their language choices
   */
  isLanguageConfirmed() {
    return localStorage.getItem(STORAGE_KEYS.CONFIRMED) === 'true';
  }

  /**
   * Initializes the engine with stored preferences or sensible defaults
   */
  async init() {
    const detected = this.detectBrowserLanguage();
    
    // Retrieve stored preferences or fallback to detected language
    const storedUI = localStorage.getItem(STORAGE_KEYS.UI_LANG);
    const storedPlan = localStorage.getItem(STORAGE_KEYS.PLAN_LANG);

    this.currentUILang = (storedUI && SUPPORTED_LANGUAGES[storedUI]) ? storedUI : detected.code;
    this.currentPlanLang = (storedPlan && SUPPORTED_LANGUAGES[storedPlan]) ? storedPlan : this.currentUILang;

    // Load initial dictionary and apply to DOM
    await this.loadTranslations(this.currentUILang);
    this.applyTranslations();

    return {
      uiLang: this.currentUILang,
      planLang: this.currentPlanLang,
      isConfirmed: this.isLanguageConfirmed(),
      detected
    };
  }

  /**
   * Fetches the JSON translations dictionary for a given language
   */
  async loadTranslations(langCode) {
    if (this.cache[langCode]) {
      this.translations = this.cache[langCode];
      return this.translations;
    }

    try {
      const response = await fetch(`/locales/${langCode}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load translations for ${langCode}`);
      }
      const data = await response.json();
      this.cache[langCode] = data;
      this.translations = data;
      return data;
    } catch (err) {
      console.warn(`[i18n] Error loading ${langCode}, falling back to English:`, err);
      if (langCode !== 'en') {
        return this.loadTranslations('en');
      }
      return {};
    }
  }

  /**
   * Retrieves translated string for a given key
   */
  t(key, fallback = '') {
    return this.translations[key] || fallback || key;
  }

  /**
   * Updates only the UI language (triggers instant live DOM update without reloading)
   */
  async setUILanguage(langCode) {
    if (!SUPPORTED_LANGUAGES[langCode]) return;
    this.currentUILang = langCode;
    localStorage.setItem(STORAGE_KEYS.UI_LANG, langCode);
    
    await this.loadTranslations(langCode);
    this.applyTranslations();
  }

  /**
   * Updates only the AI Plan Generation language (does NOT change UI language)
   */
  setPlanLanguage(langCode) {
    if (!SUPPORTED_LANGUAGES[langCode]) return;
    this.currentPlanLang = langCode;
    localStorage.setItem(STORAGE_KEYS.PLAN_LANG, langCode);
    this.updateBadges();
  }

  /**
   * Confirms user preferences from the initial setup modal
   */
  async confirmPreferences(uiLang, planLang) {
    this.setPlanLanguage(planLang);
    await this.setUILanguage(uiLang);
    localStorage.setItem(STORAGE_KEYS.CONFIRMED, 'true');
  }

  /**
   * Renders translated text into all elements with [data-i18n] attributes
   */
  applyTranslations() {
    // Update HTML lang attribute for accessibility & typography
    document.documentElement.lang = this.currentUILang;

    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key && this.translations[key]) {
        el.textContent = this.translations[key];
      }
    });

    this.updateBadges();
  }

  /**
   * Updates the UI Language and AI Plan Language indicator badges
   */
  updateBadges() {
    const uiBadge = document.getElementById('current-ui-badge');
    const planBadge = document.getElementById('current-plan-badge');

    if (uiBadge) {
      const langName = SUPPORTED_LANGUAGES[this.currentUILang]?.nativeName || this.currentUILang;
      uiBadge.textContent = `${this.t('ui_lang_label', 'UI')}: ${langName}`;
    }

    if (planBadge) {
      const planName = SUPPORTED_LANGUAGES[this.currentPlanLang]?.nativeName || this.currentPlanLang;
      planBadge.textContent = `${this.t('plan_lang_label', 'AI Plan')}: ${planName}`;
    }
  }
}

export const i18n = new I18nEngine();
