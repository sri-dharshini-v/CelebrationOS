/**
 * CelebrationOS language preferences and translation fallback.
 * Language entries and their coverage status are defined in locales/languages.json.
 */

const STORAGE_KEYS = {
  UI_LANG: 'celebrationos_ui_lang',
  PLAN_LANG: 'celebrationos_plan_lang',
  ASSISTANT_LANG: 'celebrationos_assistant_lang',
  CONFIRMED: 'celebrationos_lang_confirmed'
};

class I18nEngine {
  constructor() {
    this.currentUILang = 'en';
    this.currentPlanLang = 'en';
    this.currentAssistantLang = 'en';
    this.languages = [];
    this.primaryLanguages = [];
    this.languagesById = new Map();
    this.primaryLanguageIds = new Set();
    this.translations = {};
    this.localeTranslations = {};
    this.cache = {};
    this.translationStatus = 'partial';
  }

  async loadLanguageCatalog() {
    const response = await fetch('/locales/languages.json');
    if (!response.ok) {
      throw new Error(`Failed to load language catalogue (${response.status}).`);
    }

    const catalogue = await response.json();
    if (
      !Array.isArray(catalogue.languages) ||
      !catalogue.languages.some(language => language.id === catalogue.fallbackLanguage)
    ) {
      throw new Error('The language catalogue is missing its fallback language.');
    }
    if (!Array.isArray(catalogue.primaryLanguageIds) || catalogue.primaryLanguageIds.length === 0) {
      throw new Error('The language catalogue is missing its primary language list.');
    }

    this.fallbackLanguage = catalogue.fallbackLanguage;
    this.languages = catalogue.languages;
    this.languagesById = new Map(this.languages.map(language => [language.id, language]));
    this.primaryLanguageIds = new Set(catalogue.primaryLanguageIds);
    if (
      this.primaryLanguageIds.size !== catalogue.primaryLanguageIds.length ||
      !this.primaryLanguageIds.has(this.fallbackLanguage) ||
      catalogue.primaryLanguageIds.some(languageId => !this.languagesById.has(languageId))
    ) {
      throw new Error('The primary language list contains duplicate or unknown language IDs.');
    }
    this.primaryLanguages = catalogue.primaryLanguageIds.map(languageId =>
      this.languagesById.get(languageId)
    );
  }

  detectBrowserLanguage() {
    const candidates = navigator.languages?.length
      ? navigator.languages
      : [navigator.language || this.fallbackLanguage];

    for (const candidate of candidates) {
      const normalized = candidate.toLowerCase();
      const exact = this.primaryLanguages.find(language => language.id.toLowerCase() === normalized);
      if (exact) return exact;

      const baseCode = normalized.split('-')[0];
      const match = this.primaryLanguages.find(language => language.id.toLowerCase() === baseCode);
      if (match) return match;
    }

    return this.languagesById.get(this.fallbackLanguage);
  }

  isLanguageConfirmed() {
    return localStorage.getItem(STORAGE_KEYS.CONFIRMED) === 'true';
  }

  async init() {
    await this.loadLanguageCatalog();

    const detectedLanguage = this.detectBrowserLanguage();
    const storedUI = localStorage.getItem(STORAGE_KEYS.UI_LANG);
    const storedPlan = localStorage.getItem(STORAGE_KEYS.PLAN_LANG);
    const storedAssistant = localStorage.getItem(STORAGE_KEYS.ASSISTANT_LANG);
    const unavailableSavedPreference = [storedUI, storedPlan, storedAssistant]
      .some(languageId => languageId && !this.isValidLanguage(languageId));

    this.currentUILang = this.isValidLanguage(storedUI)
      ? storedUI
      : detectedLanguage.id;
    this.currentPlanLang = this.isValidLanguage(storedPlan)
      ? storedPlan
      : this.currentUILang;
    this.currentAssistantLang = this.isValidLanguage(storedAssistant)
      ? storedAssistant
      : this.currentPlanLang;

    if (storedUI && !this.isValidLanguage(storedUI)) {
      localStorage.setItem(STORAGE_KEYS.UI_LANG, this.currentUILang);
    }
    if (storedPlan && !this.isValidLanguage(storedPlan)) {
      localStorage.setItem(STORAGE_KEYS.PLAN_LANG, this.currentPlanLang);
    }
    if (storedAssistant && !this.isValidLanguage(storedAssistant)) {
      localStorage.removeItem(STORAGE_KEYS.ASSISTANT_LANG);
    }

    await this.loadTranslations(this.currentUILang);
    this.populateLanguageControls();
    const preferenceNotice = document.getElementById('language-preference-notice');
    if (preferenceNotice) preferenceNotice.hidden = !unavailableSavedPreference;
    this.applyTranslations();

    return {
      uiLang: this.currentUILang,
      planLang: this.currentPlanLang,
      assistantLang: this.currentAssistantLang,
      isConfirmed: this.isLanguageConfirmed(),
      detected: {
        code: detectedLanguage.id,
        name: detectedLanguage.nativeName
      }
    };
  }

  populateSelect(select, purpose, selectedCode) {
    if (!select) return;
    select.replaceChildren();

    for (const language of this.primaryLanguages) {
      const option = document.createElement('option');
      option.value = language.id;
      option.textContent = language.englishName;
      option.selected = language.id === selectedCode;
      select.append(option);
    }
  }

  populateLanguageControls() {
    this.populateSelect(
      document.getElementById('ft-ui-lang-select'),
      'ui',
      this.currentUILang
    );
    this.populateSelect(
      document.getElementById('settings-ui-lang-select'),
      'ui',
      this.currentUILang
    );
    this.populateSelect(
      document.getElementById('header-ui-lang-select'),
      'ui',
      this.currentUILang
    );
    this.populateSelect(
      document.getElementById('ft-plan-lang-select'),
      'ai',
      this.currentPlanLang
    );
    this.populateSelect(
      document.getElementById('settings-plan-lang-select'),
      'ai',
      this.currentPlanLang
    );
    this.populateSelect(
      document.getElementById('header-plan-lang-select'),
      'ai',
      this.currentPlanLang
    );
    this.populateSelect(
      document.getElementById('ft-assistant-lang-select'),
      'ai',
      this.currentAssistantLang
    );
    this.populateSelect(
      document.getElementById('header-assistant-lang-select'),
      'ai',
      this.currentAssistantLang
    );
    this.populateSelect(
      document.getElementById('settings-assistant-lang-select'),
      'ai',
      this.currentAssistantLang
    );

    this.populateSelect(
      document.getElementById('test-ui-lang-select'),
      'ui',
      this.currentUILang
    );
    this.populateSelect(
      document.getElementById('test-plan-lang-select'),
      'ai',
      this.currentPlanLang
    );
  }

  async loadLocaleFile(localeFile) {
    if (this.cache[localeFile]) return this.cache[localeFile];
    const response = await fetch(`/locales/${localeFile}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load translations for ${localeFile} (${response.status}).`);
    }
    const data = await response.json();
    this.cache[localeFile] = data;
    return data;
  }

  async loadTranslations(languageId) {
    const language = this.languagesById.get(languageId);
    if (!language) return false;

    const fallback = await this.loadLocaleFile(this.fallbackLanguage);
    let localized = {};
    let localeLoadFailed = false;

    if (language.localeFile) {
      try {
        localized = await this.loadLocaleFile(language.localeFile);
      } catch (error) {
        localeLoadFailed = true;
        console.warn(`[i18n] ${error.message} English fallback will be used.`);
      }
    }

    this.localeTranslations = localized;
    this.translations = { ...fallback, ...localized };
    const missingKeys = Object.keys(fallback).some(key => !localized[key]);
    this.translationStatus = language.uiStatus === 'complete' && !missingKeys && !localeLoadFailed
      ? 'complete'
      : language.uiStatus === 'unavailable' || localeLoadFailed || missingKeys
        ? 'partial'
        : language.uiStatus;
    return true;
  }

  t(key, fallback = '') {
    return this.translations[key] || fallback || key;
  }

  isValidLanguage(languageId) {
    return typeof languageId === 'string' && this.primaryLanguageIds.has(languageId);
  }

  async setUILanguage(languageId) {
    if (!this.isValidLanguage(languageId)) return false;
    this.currentUILang = languageId;
    localStorage.setItem(STORAGE_KEYS.UI_LANG, languageId);
    this.syncLanguageSelects(
      ['header-ui-lang-select', 'ft-ui-lang-select', 'settings-ui-lang-select', 'test-ui-lang-select'],
      languageId
    );
    const quickSwitch = document.getElementById('test-ui-lang-select');
    if (quickSwitch) quickSwitch.value = languageId;
    await this.loadTranslations(languageId);
    this.applyTranslations();
    return true;
  }

  setPlanLanguage(languageId) {
    if (!this.isValidLanguage(languageId)) return false;
    this.currentPlanLang = languageId;
    localStorage.setItem(STORAGE_KEYS.PLAN_LANG, languageId);
    this.syncLanguageSelects(
      ['header-plan-lang-select', 'ft-plan-lang-select', 'settings-plan-lang-select', 'test-plan-lang-select'],
      languageId
    );
    const quickSwitch = document.getElementById('test-plan-lang-select');
    if (quickSwitch) quickSwitch.value = languageId;

    if (!this.isValidLanguage(localStorage.getItem(STORAGE_KEYS.ASSISTANT_LANG))) {
      this.currentAssistantLang = languageId;
    }
    this.populateAssistantSelects();
    this.updateBadges();
    return true;
  }

  setAssistantLanguage(languageId) {
    if (!this.isValidLanguage(languageId)) return false;
    this.currentAssistantLang = languageId;
    localStorage.setItem(STORAGE_KEYS.ASSISTANT_LANG, languageId);
    this.syncLanguageSelects(
      ['header-assistant-lang-select', 'ft-assistant-lang-select', 'settings-assistant-lang-select'],
      languageId
    );
    this.updateBadges();
    return true;
  }

  populateAssistantSelects() {
    this.syncLanguageSelects(
      ['header-assistant-lang-select', 'ft-assistant-lang-select', 'settings-assistant-lang-select'],
      this.currentAssistantLang
    );
  }

  syncLanguageSelects(ids, languageId) {
    ids.forEach(id => {
      const select = document.getElementById(id);
      if (select) select.value = languageId;
    });
  }

  async confirmPreferences(uiLanguage, planLanguage, assistantLanguage = planLanguage) {
    if (
      !this.isValidLanguage(uiLanguage) ||
      !this.isValidLanguage(planLanguage) ||
      !this.isValidLanguage(assistantLanguage)
    ) {
      return false;
    }
    this.setPlanLanguage(planLanguage);
    this.setAssistantLanguage(assistantLanguage);
    await this.setUILanguage(uiLanguage);
    localStorage.setItem(STORAGE_KEYS.CONFIRMED, 'true');
    return true;
  }

  applyTranslations() {
    const uiLanguage = this.languagesById.get(this.currentUILang);
    document.documentElement.lang = this.currentUILang;
    document.documentElement.dir = uiLanguage?.direction || 'ltr';

    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      if (!key || !this.translations[key]) return;

      const isFallback = !Object.hasOwn(this.localeTranslations, key);
      if (isFallback) {
        element.lang = this.fallbackLanguage;
      } else {
        element.removeAttribute('lang');
      }

      const attribute = element.getAttribute('data-i18n-attribute');
      if (attribute) {
        element.setAttribute(attribute, this.translations[key]);
      } else {
        element.textContent = this.translations[key];
      }
    });

    document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
      const key = element.getAttribute('data-i18n-aria-label');
      if (key && this.translations[key]) {
        element.setAttribute('aria-label', this.translations[key]);
      }
    });

    this.updateBadges();
  }

  getStatusLabel(languageId, purpose) {
    const language = this.languagesById.get(languageId);
    if (!language) return languageId;
    if (purpose === 'ui' && this.translationStatus !== 'complete') {
      return `${language.nativeName} — partial UI; English fallback`;
    }
    if (purpose !== 'ui' && language.aiStatus !== 'verified') {
      return `${language.nativeName} — AI not verified`;
    }
    return language.nativeName;
  }

  updateBadges() {
    const uiBadge = document.getElementById('current-ui-badge');
    const planBadge = document.getElementById('current-plan-badge');

    if (uiBadge) {
      uiBadge.textContent = `${this.t('ui_lang_label', 'UI')}: ${this.getStatusLabel(this.currentUILang, 'ui')}`;
    }
    if (planBadge) {
      planBadge.textContent = `${this.t('plan_lang_label', 'AI Plan')}: ${this.getStatusLabel(this.currentPlanLang, 'ai')}`;
    }
  }
}

export const i18n = new I18nEngine();
