/**
 * CelebrationOS Main Application Controller
 * Step 2: Multilingual Support Engine
 */

import { i18n } from './i18n.js';
import { wizard } from './wizard.js';
import { plansManager } from './plansManager.js';
import { escapeHtml } from './html.js';
import { themeController } from './theme.js';

document.addEventListener('DOMContentLoaded', async () => {
  themeController.init();

  // 1. Initialize i18n
  const state = await i18n.init();
  console.log('🎉 CelebrationOS i18n initialized:', state);

  // 1.1 Initialize Event Setup Wizard
  wizard.init();

  // 1.2 Initialize Saved Plans Manager & Library
  await plansManager.init();

  // 2. DOM Elements
  const firstTimeModal = document.getElementById('first-time-modal');
  const settingsModal = document.getElementById('settings-modal');
  
  const detectedPill = document.getElementById('detected-lang-pill');
  const ftUISelect = document.getElementById('ft-ui-lang-select');
  const ftPlanSelect = document.getElementById('ft-plan-lang-select');
  const ftConfirmBtn = document.getElementById('btn-ft-confirm');

  const settingsBtn = document.getElementById('btn-settings');
  const closeSettingsBtn = document.getElementById('btn-close-settings');
  const saveSettingsBtn = document.getElementById('btn-save-settings');
  const settingsUISelect = document.getElementById('settings-ui-lang-select');
  const settingsPlanSelect = document.getElementById('settings-plan-lang-select');

  // Quick Switch test buttons in UI
  const testEnBtn = document.getElementById('test-ui-en');
  const testTaBtn = document.getElementById('test-ui-ta');
  const testHiBtn = document.getElementById('test-ui-hi');
  const testPlanTaBtn = document.getElementById('test-plan-ta');
  const testPlanHiBtn = document.getElementById('test-plan-hi');
  const testPlanEnBtn = document.getElementById('test-plan-en');

  // 3. Handle First-Time Language Confirmation Modal
  if (!state.isConfirmed) {
    if (detectedPill) {
      detectedPill.innerHTML = `<span>🌐</span> <strong>${escapeHtml(state.detected.name)}</strong>`;
    }
    if (ftUISelect) ftUISelect.value = state.uiLang;
    if (ftPlanSelect) ftPlanSelect.value = state.planLang;
    if (firstTimeModal) firstTimeModal.classList.add('active');
  }

  // Confirm First-time preferences
  if (ftConfirmBtn) {
    ftConfirmBtn.addEventListener('click', async () => {
      const selectedUI = ftUISelect.value;
      const selectedPlan = ftPlanSelect.value;
      await i18n.confirmPreferences(selectedUI, selectedPlan);
      if (firstTimeModal) firstTimeModal.classList.remove('active');
    });
  }

  // 4. Handle Settings Modal
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      if (settingsUISelect) settingsUISelect.value = i18n.currentUILang;
      if (settingsPlanSelect) settingsPlanSelect.value = i18n.currentPlanLang;
      if (settingsModal) settingsModal.classList.add('active');
    });
  }

  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
      if (settingsModal) settingsModal.classList.remove('active');
    });
  }

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', async () => {
      const newUI = settingsUISelect.value;
      const newPlan = settingsPlanSelect.value;

      i18n.setPlanLanguage(newPlan);
      await i18n.setUILanguage(newUI);

      if (settingsModal) settingsModal.classList.remove('active');
    });
  }

  // Close modals on backdrop click
  [firstTimeModal, settingsModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal && modal.id === 'settings-modal') {
          modal.classList.remove('active');
        }
      });
    }
  });

  // 5. Test Button Listeners for Quick Verification
  if (testEnBtn) testEnBtn.addEventListener('click', () => i18n.setUILanguage('en'));
  if (testTaBtn) testTaBtn.addEventListener('click', () => i18n.setUILanguage('ta'));
  if (testHiBtn) testHiBtn.addEventListener('click', () => i18n.setUILanguage('hi'));

  if (testPlanEnBtn) testPlanEnBtn.addEventListener('click', () => i18n.setPlanLanguage('en'));
  if (testPlanTaBtn) testPlanTaBtn.addEventListener('click', () => i18n.setPlanLanguage('ta'));
  if (testPlanHiBtn) testPlanHiBtn.addEventListener('click', () => i18n.setPlanLanguage('hi'));
});
