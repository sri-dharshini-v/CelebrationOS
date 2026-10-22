/**
 * CelebrationOS Saved Plans Library Manager
 * Handles loading, switching, and reopening saved event plans
 */

import { planViewer } from './planViewer.js';
import { i18n } from './i18n.js';
import { escapeHtml } from './html.js';

export class PlansManager {
  constructor() {
    this.savedPlans = [];
    this.currentPlanId = null;
    this.planDeleteBusy = false;
    this.planLoadRequestId = 0;
  }

  async init() {
    this.bindEvents();
    await this.refreshPlansList();

    // If there is an existing saved plan, open the most recent one automatically
    if (this.savedPlans.length > 0) {
      await this.openPlan(this.savedPlans[0].id);
    }
  }

  bindEvents() {
    // Listen for newly generated plans from the wizard
    window.addEventListener('celebrationos:plan_generated', async (e) => {
      const doc = e.detail;
      if (doc && doc.id) {
        this.planLoadRequestId += 1;
        this.currentPlanId = doc.id;
        await this.refreshPlansList();
        planViewer.renderPlan(doc);
      }
    });

    const selector = document.getElementById('saved-plans-select');
    const deleteButton = document.getElementById('delete-saved-plan');
    const status = document.getElementById('saved-plan-status');
    if (selector) {
      selector.addEventListener('change', async (e) => {
        const id = e.target.value;
        if (!id) this.planLoadRequestId += 1;
        if (deleteButton) deleteButton.disabled = !id || this.planDeleteBusy;
        if (status) status.textContent = '';
        if (id) {
          await this.openPlan(id);
        }
      });
    }

    if (deleteButton && selector) {
      deleteButton.addEventListener('click', async () => {
        const planId = selector.value;
        if (!planId || this.planDeleteBusy) return;

        const confirmed = window.confirm(
          i18n.t(
            'confirm_delete_plan',
            'Delete this saved plan and its entire revision history? This cannot be undone.'
          )
        );
        if (!confirmed) return;

        this.planDeleteBusy = true;
        selector.disabled = true;
        deleteButton.disabled = true;
        if (status) status.textContent = '';

        try {
          const res = await fetch(`/api/plans/${encodeURIComponent(planId)}`, {
            method: 'DELETE'
          });
          const data = await res.json();

          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Unable to delete the saved plan.');
          }

          this.currentPlanId = null;
          await this.refreshPlansList();

          if (this.savedPlans.length > 0) {
            await this.openPlan(this.savedPlans[0].id);
          } else {
            const planContainer = document.getElementById('plan-details-container');
            if (planContainer) {
              planContainer.innerHTML = '';
              planContainer.style.display = 'none';
            }
          }

          if (status) {
            status.textContent = i18n.t('plan_deleted', 'Saved plan deleted.');
          }
        } catch (err) {
          console.error('[PlansManager] Could not delete saved plan:', err);
          if (status) {
            status.textContent = `${i18n.t('delete_plan_failed', 'Could not delete plan')}: ${err.message}`;
          }
        } finally {
          this.planDeleteBusy = false;
          selector.disabled = this.savedPlans.length === 0;
          deleteButton.disabled = !selector.value;
        }
      });
    }
  }

  async refreshPlansList() {
    try {
      const res = await fetch('/api/plans');
      const data = await res.json();
      if (data.success && Array.isArray(data.plans)) {
        this.savedPlans = data.plans;
        this.renderPlansSelector();
      }
    } catch (err) {
      console.warn('[PlansManager] Could not fetch saved plans list:', err);
    }
  }

  renderPlansSelector() {
    const selector = document.getElementById('saved-plans-select');
    const countBadge = document.getElementById('saved-plans-count');
    if (!selector) return;

    if (countBadge) {
      countBadge.textContent = this.savedPlans.length;
    }

    if (this.savedPlans.length === 0) {
      selector.innerHTML = `<option value="">${i18n.t('no_saved_plans', 'No saved plans yet')}</option>`;
      selector.disabled = true;
      const deleteButton = document.getElementById('delete-saved-plan');
      if (deleteButton) deleteButton.disabled = true;
      return;
    }

    selector.disabled = false;
    selector.innerHTML = `
      <option value="">-- ${i18n.t('select_plan_prompt', 'Select a saved plan to view')} --</option>
      ${this.savedPlans.map(p => `
        <option value="${escapeHtml(p.id)}" ${p.id === this.currentPlanId ? 'selected' : ''}>
          ${escapeHtml(p.title)} (${Number(p.totalBudget).toLocaleString()} ${escapeHtml(p.currency)} • Rev ${escapeHtml(p.currentRevision)})
        </option>
      `).join('')}
    `;
    const deleteButton = document.getElementById('delete-saved-plan');
    if (deleteButton) deleteButton.disabled = !selector.value || this.planDeleteBusy;
  }

  async openPlan(planId) {
    const requestId = ++this.planLoadRequestId;
    const status = document.getElementById('saved-plan-status');

    try {
      const res = await fetch(`/api/plans/${encodeURIComponent(planId)}`);
      let data;

      try {
        data = await res.json();
      } catch {
        throw new Error('The server returned an unreadable response.');
      }

      if (!res.ok) {
        const error = new Error(data.error || `Request failed with status ${res.status}.`);
        error.status = res.status;
        throw error;
      }

      const doc = data?.doc;
      if (
        data?.success !== true ||
        !doc ||
        doc.id !== planId ||
        !doc.activePlan ||
        typeof doc.activePlan !== 'object' ||
        !doc.activePlan.eventDetails ||
        typeof doc.activePlan.eventDetails !== 'object'
      ) {
        throw new Error(data?.error || 'The server returned an invalid plan document.');
      }

      if (requestId !== this.planLoadRequestId) return;

      this.currentPlanId = planId;
      planViewer.renderPlan(doc);

      const selector = document.getElementById('saved-plans-select');
      if (selector) {
        selector.value = planId;
        const deleteButton = document.getElementById('delete-saved-plan');
        if (deleteButton) deleteButton.disabled = this.planDeleteBusy;
      }

      if (status) status.textContent = '';
    } catch (err) {
      if (requestId !== this.planLoadRequestId) return;

      console.error('[PlansManager] Error loading plan:', err);
      this.currentPlanId = null;

      const planContainer = document.getElementById('plan-details-container');
      if (planContainer) {
        planContainer.innerHTML = '';
        planContainer.style.display = 'none';
      }

      const deleteButton = document.getElementById('delete-saved-plan');
      if (deleteButton) deleteButton.disabled = true;

      if (err.status === 404) {
        if (status) status.textContent = 'This saved plan could not be found. Refreshing the Saved Plans list...';
        await this.refreshPlansList();
        if (requestId !== this.planLoadRequestId) return;
        if (status) status.textContent = 'This saved plan could not be found. The Saved Plans list has been refreshed.';
      } else if (status) {
        status.textContent = `Could not load the selected plan: ${err.message}`;
      }
    }
  }
}

export const plansManager = new PlansManager();
