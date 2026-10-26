/**
 * CelebrationOS Event Setup Wizard Controller
 * Quick Plan (Fast) vs Guided Planner (Tradition-Aware)
 */

import { i18n } from './i18n.js';
import { escapeHtml } from './html.js';
import { getEventRituals, isRitualApplicableToEvent } from './eventRituals.js';

export class WizardController {
  constructor() {
    this.currentMode = 'quick'; // 'quick' | 'guided'
    this.currentStep = 1; // 1 | 2 | 3 | 4
    this.selectedRituals = new Set();
    this.customRituals = [];
    this.generatedPlan = null;
  }

  init() {
    this.bindModeTabs();
    this.bindGuidedStepper();
    this.bindRituals();
    this.bindFormActions();
    this.setInitialDefaults();
  }

  setInitialDefaults() {
    // Set default date to 6 months from today
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    const dateStr = d.toISOString().split('T')[0];

    const qDate = document.getElementById('q-date');
    const gDate = document.getElementById('g-date');
    if (qDate && !qDate.value) qDate.value = dateStr;
    if (gDate && !gDate.value) gDate.value = dateStr;

    this.renderRituals();
  }

  bindModeTabs() {
    const tabQuick = document.getElementById('tab-mode-quick');
    const tabGuided = document.getElementById('tab-mode-guided');
    const formQuick = document.getElementById('form-quick-card');
    const formGuided = document.getElementById('form-guided-card');

    if (tabQuick) {
      tabQuick.addEventListener('click', () => {
        this.currentMode = 'quick';
        tabQuick.classList.add('active');
        tabQuick.setAttribute('aria-pressed', 'true');
        if (tabGuided) tabGuided.classList.remove('active');
        if (tabGuided) tabGuided.setAttribute('aria-pressed', 'false');
        if (formQuick) formQuick.style.display = 'block';
        if (formGuided) formGuided.style.display = 'none';
        this.clearAlerts();
      });
    }

    if (tabGuided) {
      tabGuided.addEventListener('click', () => {
        this.currentMode = 'guided';
        tabGuided.classList.add('active');
        tabGuided.setAttribute('aria-pressed', 'true');
        if (tabQuick) tabQuick.classList.remove('active');
        if (tabQuick) tabQuick.setAttribute('aria-pressed', 'false');
        if (formGuided) formGuided.style.display = 'block';
        if (formQuick) formQuick.style.display = 'none';
        this.goToStep(1);
        this.clearAlerts();
      });
    }
  }

  bindGuidedStepper() {
    const steps = [1, 2, 3, 4];
    steps.forEach(step => {
      const stepEl = document.getElementById(`step-indicator-${step}`);
      if (stepEl) {
        stepEl.addEventListener('click', () => {
          if (this.validateStep(this.currentStep)) {
            this.goToStep(step);
          }
        });
      }
    });

    const btnNext1 = document.getElementById('btn-g-next-1');
    const btnNext2 = document.getElementById('btn-g-next-2');
    const btnNext3 = document.getElementById('btn-g-next-3');
    const btnPrev2 = document.getElementById('btn-g-prev-2');
    const btnPrev3 = document.getElementById('btn-g-prev-3');
    const btnPrev4 = document.getElementById('btn-g-prev-4');

    if (btnNext1) btnNext1.addEventListener('click', () => { if (this.validateStep(1)) this.goToStep(2); });
    if (btnNext2) btnNext2.addEventListener('click', () => { if (this.validateStep(2)) this.goToStep(3); });
    if (btnNext3) btnNext3.addEventListener('click', () => { if (this.validateStep(3)) { this.populateReviewStep(); this.goToStep(4); } });

    if (btnPrev2) btnPrev2.addEventListener('click', () => this.goToStep(1));
    if (btnPrev3) btnPrev3.addEventListener('click', () => this.goToStep(2));
    if (btnPrev4) btnPrev4.addEventListener('click', () => this.goToStep(3));
  }

  goToStep(step) {
    this.currentStep = step;
    this.clearAlerts();

    for (let s = 1; s <= 4; s++) {
      const section = document.getElementById(`guided-section-${s}`);
      const indicator = document.getElementById(`step-indicator-${s}`);
      if (section) section.style.display = s === step ? 'block' : 'none';
      if (indicator) {
        if (s === step) {
          indicator.className = 'step-item active';
        } else if (s < step) {
          indicator.className = 'step-item completed';
        } else {
          indicator.className = 'step-item';
        }
      }
    }
  }

  bindRituals() {
    const addCustomBtn = document.getElementById('btn-add-custom-ritual');
    const customInput = document.getElementById('input-custom-ritual');
    const eventTypeInput = document.getElementById('g-type');

    eventTypeInput?.addEventListener('change', () => this.renderRituals());

    if (addCustomBtn && customInput) {
      addCustomBtn.addEventListener('click', () => {
        const name = customInput.value.trim();
        if (name) {
          const id = `r_custom_${Date.now()}`;
          this.customRituals.push({
            id,
            name,
            significance: 'Custom Cultural Tradition',
            isProtected: true
          });
          this.selectedRituals.add(id);
          customInput.value = '';
          this.renderRituals();
        }
      });
    }
  }

  renderRituals() {
    const container = document.getElementById('rituals-checkbox-container');
    if (!container) return;

    const eventType = document.getElementById('g-type')?.value;
    const allRituals = [...getEventRituals(eventType), ...this.customRituals];

    container.innerHTML = allRituals.map(rit => {
      const isChecked = this.selectedRituals.has(rit.id);
      return `
        <label class="ritual-chip ${isChecked ? 'selected' : ''}" for="chk_${escapeHtml(rit.id)}">
          <input type="checkbox" id="chk_${escapeHtml(rit.id)}" value="${escapeHtml(rit.id)}" ${isChecked ? 'checked' : ''}>
          <div class="ritual-info">
            <span class="ritual-title">${escapeHtml(rit.name)}</span>
            <span class="ritual-desc">${escapeHtml(rit.desc || rit.significance || 'Cultural Heritage Tradition')}</span>
          </div>
        </label>
      `;
    }).join('');

    // Wire up checkbox toggles
    allRituals.forEach(rit => {
      const chk = document.getElementById(`chk_${rit.id}`);
      if (chk) {
        chk.addEventListener('change', () => {
          if (chk.checked) {
            this.selectedRituals.add(rit.id);
          } else {
            this.selectedRituals.delete(rit.id);
          }
          this.renderRituals();
        });
      }
    });
  }

  populateReviewStep() {
    const title = document.getElementById('g-title')?.value || 'Untitled';
    const type = document.getElementById('g-type')?.value || 'wedding';
    const date = document.getElementById('g-date')?.value || '';
    const loc = document.getElementById('g-location')?.value || '';
    const guests = document.getElementById('g-guests')?.value || 100;
    const budget = document.getElementById('g-budget')?.value || 500000;
    const currency = document.getElementById('g-currency')?.value || 'INR';
    const theme = document.getElementById('g-theme')?.value || 'Traditional';
    const protectedRitualCount = Array.from(this.selectedRituals)
      .filter(id => isRitualApplicableToEvent({ id }, type))
      .length;

    const reviewBox = document.getElementById('guided-review-summary');
    if (reviewBox) {
      reviewBox.innerHTML = `
        <div class="guided-review-card">
          <h4 class="guided-review-title">${escapeHtml(title)}</h4>
          <p class="guided-review-copy">
            <strong>Type:</strong> ${escapeHtml(type.toUpperCase())} | <strong>Date:</strong> ${escapeHtml(date)} | <strong>Location:</strong> ${escapeHtml(loc || 'Not specified')}<br>
            <strong>Scale:</strong> ${escapeHtml(guests)} Guests | <strong>Budget:</strong> ${escapeHtml(budget)} ${escapeHtml(currency)}<br>
            <strong>Theme:</strong> ${escapeHtml(theme)}<br>
            <strong>Protected Traditions:</strong> ${escapeHtml(protectedRitualCount)} rituals locked against budget cuts
          </p>
        </div>
      `;
    }
  }

  validateStep(step) {
    this.clearAlerts();

    if (step === 1) {
      const eventType = document.getElementById('g-type')?.value;
      const title = document.getElementById('g-title')?.value.trim();
      const date = document.getElementById('g-date')?.value.trim();
      if (!eventType || !title || !date) {
        this.showAlert(i18n.t('error_fill_required', 'Please fill in all required fields marked with *'));
        return false;
      }
    }

    if (step === 2) {
      const guests = Number(document.getElementById('g-guests')?.value);
      const budget = Number(document.getElementById('g-budget')?.value);
      if (!guests || guests <= 0) {
        this.showAlert('Guest count must be greater than zero');
        return false;
      }
      if (!budget || budget <= 0) {
        this.showAlert('Total budget must be greater than zero');
        return false;
      }
    }

    return true;
  }

  bindFormActions() {
    const btnGenQuick = document.getElementById('btn-submit-quick');
    const btnGenGuided = document.getElementById('btn-submit-guided');

    if (btnGenQuick) {
      btnGenQuick.addEventListener('click', (e) => {
        e.preventDefault();
        this.submitQuickPlan();
      });
    }

    if (btnGenGuided) {
      btnGenGuided.addEventListener('click', (e) => {
        e.preventDefault();
        this.submitGuidedPlan();
      });
    }
  }

  showAlert(message) {
    const alertBox = document.getElementById('wizard-alert-error');
    if (alertBox) {
      alertBox.textContent = `⚠️ ${message}`;
      alertBox.classList.add('visible');
    }
  }

  clearAlerts() {
    const alertBox = document.getElementById('wizard-alert-error');
    if (alertBox) {
      alertBox.textContent = '';
      alertBox.classList.remove('visible');
    }
  }

  setLoading(isLoading) {
    const loadingBox = document.getElementById('wizard-loading-box');
    const btnQuick = document.getElementById('btn-submit-quick');
    const btnGuided = document.getElementById('btn-submit-guided');

    if (loadingBox) {
      loadingBox.classList.toggle('visible', isLoading);
    }
    if (btnQuick) btnQuick.disabled = isLoading;
    if (btnGuided) btnGuided.disabled = isLoading;
  }

  async submitQuickPlan() {
    this.clearAlerts();

    const title = document.getElementById('q-title')?.value.trim();
    const eventType = document.getElementById('q-type')?.value;
    const date = document.getElementById('q-date')?.value;
    const location = document.getElementById('q-location')?.value.trim() || i18n.t('location_unspecified', 'Not specified');
    const guestCount = Number(document.getElementById('q-guests')?.value);
    const totalBudget = Number(document.getElementById('q-budget')?.value);
    const currency = document.getElementById('q-currency')?.value || 'INR';

    if (!eventType || !title || !date) {
      this.showAlert(i18n.t('error_fill_required', 'Please fill in all required fields marked with *'));
      return;
    }
    if (!guestCount || guestCount <= 0) {
      this.showAlert('Guest count must be a positive number');
      return;
    }
    if (!totalBudget || totalBudget <= 0) {
      this.showAlert('Total budget must be a positive number');
      return;
    }

    const payload = {
      title,
      eventType,
      date,
      location,
      guestCount,
      totalBudget,
      currency,
      theme: 'Classic Celebration',
      notes: 'Generated via Quick Plan',
      language: i18n.currentPlanLang,
      protectedRituals: []
    };

    await this.generateAndSavePlan(payload);
  }

  async submitGuidedPlan() {
    this.clearAlerts();

    const title = document.getElementById('g-title')?.value.trim();
    const eventType = document.getElementById('g-type')?.value;
    const date = document.getElementById('g-date')?.value;
    const location = document.getElementById('g-location')?.value.trim() || i18n.t('location_unspecified', 'Not specified');
    const guestCount = Number(document.getElementById('g-guests')?.value);
    const totalBudget = Number(document.getElementById('g-budget')?.value);
    const currency = document.getElementById('g-currency')?.value || 'INR';
    const theme = document.getElementById('g-theme')?.value.trim() || 'Classic Celebration';
    const notes = document.getElementById('g-notes')?.value.trim() || '';

    // Build protected rituals array from selected IDs
    const ritualsArray = Array.from(this.selectedRituals)
      .filter(id => isRitualApplicableToEvent({ id }, eventType))
      .map(id => {
        const custom = this.customRituals.find(c => c.id === id);
        const preset = getEventRituals(eventType).find(ritual => ritual.id === id);
        return {
          id,
          name: custom ? custom.name : preset?.name || id.replace('r_', '').replace(/_/g, ' ').toUpperCase(),
          significance: custom ? custom.significance : preset?.desc || 'User-Protected Tradition',
          isProtected: true
        };
      });

    const payload = {
      title,
      eventType,
      date,
      location,
      guestCount,
      totalBudget,
      currency,
      theme,
      notes,
      language: i18n.currentPlanLang,
      protectedRituals: ritualsArray
    };

    await this.generateAndSavePlan(payload);
  }

  async generateAndSavePlan(payload) {
    this.setLoading(true);

    try {
      // 1. Call Gemini Plan Generator Endpoint
      const genResponse = await fetch('/api/plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const genData = await genResponse.json();
      if (!genData.success || !genData.plan) {
        throw new Error(genData.errors?.join(', ') || 'Failed to generate plan');
      }

      // 2. Persist the generated plan to storage (Revision 1)
      const saveResponse = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: genData.plan,
          description: `Initial Plan created via ${this.currentMode === 'quick' ? 'Quick Plan' : 'Guided Planner'}`
        })
      });

      const saveData = await saveResponse.json();
      if (!saveData.success || !saveData.doc) {
        throw new Error(saveData.error || 'Failed to save generated plan');
      }

      this.generatedPlan = saveData.doc;
      this.renderPlanSuccessBanner(saveData.doc, {
        isMock: genData.isMock === true,
        fallbackReason: genData.fallbackReason || null
      });

      // Dispatch event for other modules
      window.dispatchEvent(new CustomEvent('celebrationos:plan_generated', {
        detail: saveData.doc
      }));

    } catch (err) {
      console.error('[Wizard] Generation failed:', err);
      this.showAlert(`Generation error: ${err.message}`);
    } finally {
      this.setLoading(false);
    }
  }

  renderPlanSuccessBanner(doc, options = {}) {
    const banner = document.getElementById('wizard-plan-summary');
    if (!banner) return;

    const plan = doc.activePlan;
    const catCount = plan.budgetCategories?.length || 0;
    const taskCount = (plan.milestones || []).reduce((acc, m) => acc + (m.tasks?.length || 0), 0);
    const ritualCount = plan.protectedRituals?.length || 0;
    const mockNotice = options.isMock === true
      ? `<p class="plan-success-notice" style="margin: 10px 0 0; padding: 8px 12px; border-radius: 8px; font-size: 12px; color: var(--text-main); background: rgba(212, 175, 55, 0.12); border: 1px solid var(--accent-gold);">
            ${escapeHtml(i18n.t('plan_mock_notice', 'AI service is temporarily unavailable, so this is a built-in sample plan. Your budget and plan structure are still valid and saved.'))}
          </p>`
      : '';

    banner.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 14px;">
        <div>
          <span class="badge-pill plan-success-badge">
            ✓ ${i18n.t('plan_ready_badge', 'Plan Generated Successfully!')} (Revision ${escapeHtml(doc.currentRevision)})
          </span>
          <h3 class="plan-success-title">${escapeHtml(plan.eventDetails.title)}</h3>
          <p style="color: var(--text-muted); font-size: 13px;">
            ${escapeHtml(plan.eventDetails.eventType.toUpperCase())} • ${escapeHtml(plan.eventDetails.date)} • ${escapeHtml(plan.eventDetails.location)}
          </p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 20px; font-weight: 700; color: var(--accent-gold);">
            ${escapeHtml(plan.eventDetails.totalBudget.toLocaleString())} ${escapeHtml(plan.eventDetails.currency)}
          </div>
          <span style="font-size: 12px; color: var(--text-dim);">Language: ${escapeHtml(plan.eventDetails.language.toUpperCase())}</span>
        </div>
      </div>
      ${mockNotice}

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-top: 16px;">
        <div class="plan-success-stat plan-success-budget">
          <div style="font-size: 11px; color: var(--text-dim);">BUDGET CATEGORIES</div>
          <div class="plan-success-stat-value">${catCount} Allocated</div>
        </div>
        <div class="plan-success-stat plan-success-tasks">
          <div style="font-size: 11px; color: var(--text-dim);">TASKS & MILESTONES</div>
          <div class="plan-success-stat-value">${taskCount} Scheduled</div>
        </div>
        <div class="plan-success-stat plan-success-rituals">
          <div style="font-size: 11px; color: var(--text-dim);">PROTECTED TRADITIONS</div>
          <div class="plan-success-stat-value">${ritualCount} Safeguarded</div>
        </div>
      </div>

      <p style="font-size: 12px; color: var(--text-dim); margin-top: 14px; font-style: italic;">
        ${i18n.t('budget_disclaimer', 'All calculations are validated deterministically by CelebrationOS backend invariants.')}
      </p>
    `;

    banner.classList.add('visible');
    banner.scrollIntoView({ behavior: 'smooth' });
  }
}

export const wizard = new WizardController();
