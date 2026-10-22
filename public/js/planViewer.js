/**
 * CelebrationOS Plan Viewer & Section Renderers
 * Includes selective historical revision deletion.
 */

import { i18n } from './i18n.js';
import { escapeHtml } from './html.js';

const CATEGORY_COLOR_TOKENS = [
  '--chart-color-1', '--chart-color-2', '--chart-color-3', '--chart-color-4',
  '--chart-color-5', '--chart-color-6', '--chart-color-7', '--chart-color-8'
];
const FALLBACK_CATEGORY_COLORS = [
  '#c99a4a', '#d87983', '#bd6686', '#92749a',
  '#668f96', '#4d8068', '#bd8d70', '#92747c'
];

function getCategoryColor(index) {
  if (typeof getComputedStyle !== 'function' || !document.documentElement) {
    return FALLBACK_CATEGORY_COLORS[index % FALLBACK_CATEGORY_COLORS.length];
  }

  return getComputedStyle(document.documentElement)
    .getPropertyValue(CATEGORY_COLOR_TOKENS[index % CATEGORY_COLOR_TOKENS.length])
    .trim() || FALLBACK_CATEGORY_COLORS[index % FALLBACK_CATEGORY_COLORS.length];
}

export class PlanViewer {
  constructor() {
    this.currentDoc = null;
    this.activeTab = 'all';
    this.taskFilter = 'all';
    this.historyDeleteBusy = false;
    this.historyTrackingBusy = false;
    this.planEditBusy = false;
    this.shockPanelOpen = false;
    this.shockBusy = false;
    this.safeUndoBusy = false;
  }

  renderPlan(doc) {
    if (!doc || !doc.activePlan) return;
    this.currentDoc = doc;

    const container = document.getElementById('plan-details-container');
    if (!container) return;

    const plan = doc.activePlan;
    const details = plan.eventDetails || {};

    container.innerHTML = `
      <div class="glass-card plan-header-card" style="margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;">
          <div>
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap;">
              <span class="badge-pill">${escapeHtml(details.eventType || 'EVENT')}</span>
              <span class="badge-pill">Revision ${escapeHtml(doc.currentRevision ?? '—')}</span>
              <span class="badge-pill">Language: ${escapeHtml(details.language || '—')}</span>
            </div>
            <h2 style="font-size:28px;color:var(--text-main);font-family:var(--font-display);">
              ${escapeHtml(details.title || 'Event Plan')}
            </h2>
            <p style="color:var(--text-muted);font-size:14px;margin-top:4px;">
              📍 ${escapeHtml(details.location || '—')} • 📅 ${escapeHtml(details.date || '—')} •
              👥 ${escapeHtml(details.guestCount ?? '—')} Guests
            </p>
            ${details.theme ? `<p style="color:var(--accent-gold);font-size:13px;margin-top:4px;">✨ Theme: ${escapeHtml(details.theme)}</p>` : ''}
          </div>
          <div style="text-align:right;">
            <button type="button" class="btn-secondary" id="edit-saved-plan"
              aria-controls="saved-plan-editor" aria-expanded="false">
              Edit Saved Plan
            </button>
            <button type="button" class="btn-secondary" id="open-shock-engine"
              aria-controls="shock-engine-panel" aria-expanded="false">
              Shock Engine
            </button>
            <div style="font-size:12px;color:var(--text-dim);">TOTAL BUDGET</div>
            <div style="font-size:32px;font-weight:800;color:var(--accent-gold);">
              ${escapeHtml(Number(details.totalBudget || 0).toLocaleString())}
              <span style="font-size:18px;">${escapeHtml(details.currency || '')}</span>
            </div>
          </div>
        </div>

        <div class="plan-nav-tabs" style="display:flex;gap:10px;margin-top:24px;border-top:1px solid var(--border-glass);padding-top:16px;overflow-x:auto;">
          <button class="nav-tab-btn ${this.activeTab === 'all' ? 'active' : ''}" data-tab="all">${i18n.t('nav_all', 'Full Plan View')}</button>
          <button class="nav-tab-btn ${this.activeTab === 'budget' ? 'active' : ''}" data-tab="budget">💰 ${i18n.t('nav_budget', 'Budget Breakdown')}</button>
          <button class="nav-tab-btn ${this.activeTab === 'timeline' ? 'active' : ''}" data-tab="timeline">📅 ${i18n.t('nav_timeline', 'Timeline & Tasks')}</button>
          <button class="nav-tab-btn ${this.activeTab === 'rituals' ? 'active' : ''}" data-tab="rituals">🛡️ ${i18n.t('nav_rituals', 'Protected Traditions')}</button>
          <button class="nav-tab-btn ${this.activeTab === 'recommendations' ? 'active' : ''}" data-tab="recommendations">💡 ${i18n.t('nav_recommendations', 'Recommendations')}</button>
        </div>
      </div>

      ${this.renderPlanEditor(doc)}
      ${this.renderShockEngine(doc)}
      ${this.renderHistoryManagement(doc)}

      <div id="section-view-budget" class="plan-section" style="display:${this.activeTab === 'all' || this.activeTab === 'budget' ? 'block' : 'none'};">
        ${this.renderBudgetVisualizer(plan.budgetCategories, details.totalBudget, details.currency)}
      </div>

      <div id="section-view-timeline" class="plan-section" style="display:${this.activeTab === 'all' || this.activeTab === 'timeline' ? 'block' : 'none'};">
        ${this.renderTimelineAndTasks(plan.milestones)}
      </div>

      <div id="section-view-rituals" class="plan-section" style="display:${this.activeTab === 'all' || this.activeTab === 'rituals' ? 'block' : 'none'};">
        ${this.renderProtectedRituals(plan.protectedRituals)}
      </div>

      <div id="section-view-recommendations" class="plan-section" style="display:${this.activeTab === 'all' || this.activeTab === 'recommendations' ? 'block' : 'none'};">
        ${this.renderRecommendations(plan.recommendations, details.currency)}
      </div>
    `;

    container.style.display = 'block';
    this.bindInteractiveHandlers(container);
  }

  renderPlanEditor(doc) {
    const details = doc.activePlan.eventDetails || {};
    const categories = doc.activePlan.budgetCategories || [];

    return `
      <section class="glass-card" id="saved-plan-editor" hidden
        style="padding:20px;margin-bottom:24px;">
        <h3 style="font-size:20px;color:var(--text-main);margin-bottom:14px;">Edit Saved Plan</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
          <label>Event title
            <input class="input-styled" data-plan-field="title" type="text" required
              value="${escapeHtml(details.title || '')}">
          </label>
          <label>Event date
            <input class="input-styled" data-plan-field="date" type="date" required
              value="${escapeHtml(details.date || '')}">
          </label>
          <label>Location
            <input class="input-styled" data-plan-field="location" type="text"
              value="${escapeHtml(details.location || '')}">
          </label>
          <label>Guest count
            <input class="input-styled" data-plan-field="guestCount" type="number" min="1" step="1" required
              value="${escapeHtml(details.guestCount ?? '')}">
          </label>
          <label>Total budget
            <input class="input-styled" data-plan-field="totalBudget" type="number" min="0.01" step="0.01" required
              value="${escapeHtml(Number(details.totalBudget || 0).toFixed(2))}">
          </label>
          <label>Currency
            <input class="input-styled" data-plan-field="currency" type="text" required
              value="${escapeHtml(details.currency || '')}">
          </label>
          <label>Theme
            <input class="input-styled" data-plan-field="theme" type="text"
              value="${escapeHtml(details.theme || '')}">
          </label>
          <label style="grid-column:1/-1;">Notes
            <textarea class="textarea-styled" data-plan-field="notes">${escapeHtml(details.notes || '')}</textarea>
          </label>
        </div>

        <h4 style="font-size:16px;color:var(--text-main);margin:18px 0 8px;">Budget allocations</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
          ${categories.map((category, index) => `
            <label>${escapeHtml(category.name)}
              <input class="input-styled" data-budget-category-index="${index}"
                type="number" min="0" step="0.01" required
                value="${escapeHtml(Number(category.allocatedAmount || 0).toFixed(2))}">
            </label>
          `).join('')}
        </div>

        <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap;">
          <button type="button" class="btn-primary" id="save-saved-plan">Save Revision</button>
          <button type="button" class="btn-secondary" id="cancel-saved-plan-edit">Cancel</button>
        </div>
        <p id="saved-plan-edit-status" role="status" aria-live="polite"
          style="font-size:13px;margin-top:12px;color:var(--text-muted);"></p>
      </section>
    `;
  }

  renderShockEngine(doc) {
    const details = doc.activePlan.eventDetails || {};

    return `
      <section class="glass-card" id="shock-engine-panel"
        ${this.shockPanelOpen ? '' : 'hidden'}
        style="padding:20px;margin-bottom:24px;">
        <h3 style="font-size:20px;color:var(--text-main);margin-bottom:8px;">Shock Engine</h3>
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:14px;">
          Apply a budget change, shift the event date, or do both. Paid/frozen commitments,
          completed tasks, and protected rituals remain protected. Relative task deadlines
          stay relative; unfinished tasks with absolute dates move with the event date.
        </p>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
          <label>
            <span><input type="checkbox" id="shock-budget-enabled"> Adjust total budget</span>
            <input class="input-styled" id="shock-target-budget" type="number"
              min="0.01" step="0.01" disabled
              value="${escapeHtml(Number(details.totalBudget || 0).toFixed(2))}">
          </label>
          <label>
            <span><input type="checkbox" id="shock-date-enabled"> Shift event date</span>
            <input class="input-styled" id="shock-target-date" type="date" disabled
              value="${escapeHtml(details.date || '')}">
          </label>
        </div>

        <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap;">
          <button type="button" class="btn-primary" id="apply-plan-shock"
            ${this.shockBusy ? 'disabled' : ''}>Apply Shock</button>
          <button type="button" class="btn-secondary" id="cancel-plan-shock">Cancel</button>
        </div>
        <p id="shock-engine-status" role="status" aria-live="polite"
          style="font-size:13px;margin-top:12px;color:var(--text-muted);"></p>
      </section>
    `;
  }

  /**
   * Read supported history collection shapes.
   * The backend remains responsible for validating deletion.
   */
  getHistoryEntries(doc) {
    const candidates = [
      doc?.history,
      doc?.revisions,
      doc?.revisionHistory,
      doc?.versionHistory
    ];

    const history = candidates.find(Array.isArray) || [];

    return history.map((entry) => {
      if (typeof entry === 'number') {
        return { revision: entry };
      }

      if (typeof entry === 'string') {
        return { revision: Number(entry) };
      }

      return entry || {};
    }).map((entry) => ({
      ...entry,
      revision: Number(
        entry.revision ??
        entry.revisionNumber ??
        entry.version
      )
    })).filter(entry =>
      Number.isSafeInteger(entry.revision) && entry.revision > 0
    );
  }

  /**
   * Selective revision deletion UI.
   * The active revision is never offered as a selectable item.
   */
  renderHistoryManagement(doc) {
    const entries = this.getHistoryEntries(doc);
    const currentRevision = Number(doc.currentRevision);
    const historyTracking = doc.historyTracking !== false;

    const revisions = [...new Map(
      entries.map(entry => [entry.revision, entry])
    ).values()].sort((a, b) => b.revision - a.revision);

    const historyRows = revisions.map(entry => {
      const isCurrent = entry.revision === currentRevision;
      const description =
        entry.description ||
        entry.changeDescription ||
        'Saved plan revision';

      const timestamp = entry.timestamp || entry.createdAt;
      const dateLabel = timestamp
        ? new Date(timestamp).toLocaleString()
        : '';

      return `
        <div style="display:flex;align-items:flex-start;gap:12px;padding:12px;border-bottom:1px solid var(--border-glass);${isCurrent ? 'opacity:0.7;' : ''}">
          <input
            type="checkbox"
            id="history-revision-${entry.revision}"
            class="history-revision-checkbox"
            value="${entry.revision}"
            ${isCurrent ? 'disabled' : ''}
            style="margin-top:4px;"
          >
          <label for="history-revision-${entry.revision}" style="flex:1;">
            <strong style="color:var(--text-main);">Revision ${entry.revision}</strong>
            ${isCurrent ? '<span class="badge-pill">Current revision</span>' : ''}
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">
              ${escapeHtml(description)}
            </div>
            ${dateLabel ? `<div style="font-size:11px;color:var(--text-dim);margin-top:4px;">${escapeHtml(dateLabel)}</div>` : ''}
          </label>
          ${isCurrent ? '' : `
            <button type="button" class="btn-secondary safe-undo-button"
              data-safe-undo-revision="${entry.revision}"
              ${this.safeUndoBusy ? 'disabled' : ''}>
              Safe Undo
            </button>
          `}
        </div>
      `;
    }).join('');

    return `
      <section class="glass-card" id="history-management-panel"
        style="padding:20px;margin-bottom:24px;">
        <h3 style="font-size:20px;color:var(--text-main);margin-bottom:8px;">
          🕘 Version History
        </h3>
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:14px;">
          Select only the old revisions you want to remove. Your current
          active plan will not be deleted.
        </p>

        <label style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
          <input
            type="checkbox"
            id="history-tracking-toggle"
            ${historyTracking ? 'checked' : ''}
            ${this.historyTrackingBusy ? 'disabled' : ''}
          >
          <span>History Tracking: <strong>${historyTracking ? 'ON' : 'OFF'}</strong></span>
        </label>
        <p id="history-tracking-status" role="status" aria-live="polite"
          style="font-size:13px;margin-bottom:14px;color:var(--text-muted);">
          ${historyTracking ? '' : 'Plan updates are saved without adding history snapshots.'}
        </p>

        <div style="margin-bottom:16px;">
          ${historyRows || `
            <p style="font-size:13px;color:var(--text-muted);">
              No historical revisions are available to display.
            </p>
          `}
        </div>

        <p id="safe-undo-status" role="status" aria-live="polite"
          style="font-size:13px;margin-bottom:14px;color:var(--text-muted);white-space:pre-line;">
        </p>

        <button
          type="button"
          id="delete-selected-revisions"
          ${revisions.filter(entry => entry.revision !== currentRevision).length === 0 ? 'disabled' : ''}
        >
          Delete Selected Revisions
        </button>

        <p id="history-delete-status" role="status"
          aria-live="polite"
          style="font-size:13px;margin-top:12px;color:var(--text-muted);">
        </p>
      </section>
    `;
  }

  /**
   * Delete only explicitly selected historical revisions.
   * Backend endpoint: DELETE /api/plans/:id/history
   */
  bindHistoryDeletion(container) {
    const button = container.querySelector('#delete-selected-revisions');
    const status = container.querySelector('#history-delete-status');

    if (!button || !status) return;

    button.addEventListener('click', async () => {
      if (this.historyDeleteBusy) return;

      const selected = [
        ...container.querySelectorAll('.history-revision-checkbox:checked')
      ].map(checkbox => Number(checkbox.value));

      const currentRevision = Number(this.currentDoc?.currentRevision);

      if (!selected.length) {
        status.textContent = 'Select at least one old revision first.';
        return;
      }

      if (
        selected.some(revision =>
          !Number.isSafeInteger(revision) ||
          revision < 1 ||
          revision === currentRevision
        )
      ) {
        status.textContent =
          'The current revision cannot be deleted. Please review your selection.';
        return;
      }

      const confirmed = window.confirm(
        `Delete ${selected.length} selected historical revision(s)?\n\n` +
        'Safe Undo to these revisions will no longer be available.\n' +
        'The active plan will be kept. This action cannot be undone.'
      );

      if (!confirmed) return;

      this.historyDeleteBusy = true;
      button.disabled = true;
      status.textContent = 'Deleting selected revisions...';

      try {
        const response = await fetch(
          `/api/plans/${encodeURIComponent(this.currentDoc.id)}/history`,
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              revisions: selected,
              confirmed: true
            })
          }
        );

        let result;

        try {
          result = await response.json();
        } catch {
          throw new Error('The server returned an unreadable response.');
        }

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || 'Unable to delete the selected revisions.'
          );
        }

        if (result.doc) {
          this.renderPlan(result.doc);
          const newStatus = document.querySelector('#history-delete-status');

          if (newStatus) {
            newStatus.textContent =
              result.message || 'Selected revisions deleted successfully.';
          }
        } else {
          status.textContent =
            result.message || 'Deletion completed. Refresh to verify the history.';
        }
      } catch (error) {
        status.textContent = `Could not delete revisions: ${error.message}`;
        button.disabled = false;
      } finally {
        this.historyDeleteBusy = false;
      }
    });
  }

  bindHistoryTracking(container) {
    const toggle = container.querySelector('#history-tracking-toggle');
    const status = container.querySelector('#history-tracking-status');
    if (!toggle || !status) return;

    toggle.addEventListener('change', async () => {
      if (this.historyTrackingBusy || !this.currentDoc) return;

      const enabled = toggle.checked;
      this.historyTrackingBusy = true;
      toggle.disabled = true;
      status.textContent = 'Updating history tracking...';

      try {
        const response = await fetch(
          `/api/plans/${encodeURIComponent(this.currentDoc.id)}/history-tracking`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled })
          }
        );
        const result = await response.json();

        if (!response.ok || !result.success || !result.doc) {
          throw new Error(result.error || 'Unable to update history tracking.');
        }

        this.renderPlan(result.doc);
        const updatedStatus = document.querySelector('#history-tracking-status');
        if (updatedStatus) {
          updatedStatus.textContent = result.message;
        }
      } catch (error) {
        toggle.checked = this.currentDoc?.historyTracking !== false;
        status.textContent = `Could not update history tracking: ${error.message}`;
      } finally {
        this.historyTrackingBusy = false;
        const updatedToggle = container.querySelector('#history-tracking-toggle');
        if (updatedToggle) updatedToggle.disabled = false;
      }
    });
  }

  bindInteractiveHandlers(container) {
    if (!container) return;

    const navButtons = container.querySelectorAll('.nav-tab-btn');
    navButtons.forEach(button => {
      button.addEventListener('click', () => {
        const nextTab = button.dataset.tab;
        if (!nextTab) return;
        this.activeTab = nextTab;
        this.renderPlan(this.currentDoc);
      });
    });

    const filterButtons = container.querySelectorAll('.btn-filter');
    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        const nextFilter = button.dataset.filter;
        if (!nextFilter) return;
        this.taskFilter = nextFilter;
        this.renderPlan(this.currentDoc);
      });
    });

    const checkboxes = container.querySelectorAll('.task-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const taskId = checkbox.closest('[data-task-id]')?.dataset.taskId;
        if (!taskId) return;
        const milestoneId = checkbox.closest('[data-milestone-id]')?.dataset.milestoneId;
        if (!milestoneId || !this.currentDoc) return;

        const plan = this.currentDoc.activePlan;
        const milestone = (plan.milestones || []).find(m => m.id === milestoneId);
        const task = (milestone?.tasks || []).find(t => t.id === taskId);
        if (!task) return;

        task.status = checkbox.checked ? 'completed' : 'todo';
        task.isFrozen = checkbox.checked;
      });
    });

    this.bindHistoryDeletion(container);
    this.bindHistoryTracking(container);
    this.bindSafeUndo(container);
    this.bindPlanEditing(container);
    this.bindShockEngine(container);
  }

  bindSafeUndo(container) {
    const buttons = container.querySelectorAll('.safe-undo-button');
    const status = container.querySelector('#safe-undo-status');
    if (!buttons.length || !status) return;

    buttons.forEach(button => {
      button.addEventListener('click', async () => {
        if (this.safeUndoBusy || !this.currentDoc) return;

        const targetRevision = Number(button.dataset.safeUndoRevision);
        if (!Number.isSafeInteger(targetRevision) || targetRevision < 1) {
          status.textContent = 'The selected revision number is invalid.';
          return;
        }

        const confirmed = window.confirm(
          `Restore revision ${targetRevision} as a new revision? ` +
          'Paid/frozen commitments, completed tasks, and protected rituals will be preserved.'
        );
        if (!confirmed) return;

        const planId = this.currentDoc.id;
        this.safeUndoBusy = true;
        buttons.forEach(undoButton => {
          undoButton.disabled = true;
        });
        status.textContent = `Safely restoring revision ${targetRevision}...`;

        try {
          const response = await fetch(`/api/plans/${encodeURIComponent(planId)}/undo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetRevision })
          });

          let result;
          try {
            result = await response.json();
          } catch {
            throw new Error('The server returned an unreadable response.');
          }

          if (!response.ok || !result.success || !result.doc) {
            throw new Error(result.error || 'Unable to safely restore this revision.');
          }
          if (this.currentDoc?.id !== planId) return;

          this.renderPlan(result.doc);
          const updatedStatus = container.querySelector('#safe-undo-status');
          if (updatedStatus) {
            const messages = [
              `Restored revision ${result.restoredRevision} as new revision ${result.newRevision}.`
            ];
            if (Array.isArray(result.conflicts) && result.conflicts.length > 0) {
              messages.push(`Preserved commitments and traditions:\n${result.conflicts.join('\n')}`);
            }
            if (Array.isArray(result.warnings) && result.warnings.length > 0) {
              messages.push(`Warnings:\n${result.warnings.join('\n')}`);
            }
            updatedStatus.textContent = messages.join('\n');
          }
        } catch (error) {
          status.textContent = `Could not safely restore revision: ${error.message}`;
        } finally {
          this.safeUndoBusy = false;
          container.querySelectorAll('.safe-undo-button').forEach(undoButton => {
            undoButton.disabled = false;
          });
        }
      });
    });
  }

  bindPlanEditing(container) {
    const editor = container.querySelector('#saved-plan-editor');
    const editButton = container.querySelector('#edit-saved-plan');
    const cancelButton = container.querySelector('#cancel-saved-plan-edit');
    const saveButton = container.querySelector('#save-saved-plan');
    const status = container.querySelector('#saved-plan-edit-status');

    if (!editor || !editButton || !cancelButton || !saveButton || !status) return;

    editButton.addEventListener('click', () => {
      editor.hidden = false;
      editButton.setAttribute('aria-expanded', 'true');
      editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    cancelButton.addEventListener('click', () => {
      this.renderPlan(this.currentDoc);
    });

    saveButton.addEventListener('click', async () => {
      if (this.planEditBusy || !this.currentDoc) return;

      const readField = name =>
        container.querySelector(`[data-plan-field="${name}"]`);
      const title = readField('title')?.value.trim();
      const date = readField('date')?.value;
      const location = readField('location')?.value.trim() || '';
      const guestCountValue = Number(readField('guestCount')?.value);
      const totalBudgetValue = Number(readField('totalBudget')?.value);
      const currency = readField('currency')?.value.trim();
      const theme = readField('theme')?.value.trim() || '';
      const notes = readField('notes')?.value.trim() || '';

      if (!title || !date || !currency) {
        status.textContent = 'Title, event date, and currency are required.';
        return;
      }

      if (!Number.isSafeInteger(guestCountValue) || guestCountValue <= 0) {
        status.textContent = 'Guest count must be a positive whole number.';
        return;
      }
      if (
        !Number.isFinite(totalBudgetValue) ||
        totalBudgetValue <= 0 ||
        !Number.isSafeInteger(Math.round(totalBudgetValue * 100))
      ) {
        status.textContent = 'Total budget must be a positive amount within the supported range.';
        return;
      }

      const updatedPlan = JSON.parse(JSON.stringify(this.currentDoc.activePlan));
      updatedPlan.eventDetails = {
        ...updatedPlan.eventDetails,
        title,
        date,
        location,
        guestCount: guestCountValue,
        totalBudget: totalBudgetValue,
        currency,
        theme,
        notes
      };

      const allocationInputs = container.querySelectorAll('[data-budget-category-index]');
      for (const input of allocationInputs) {
        const index = Number(input.dataset.budgetCategoryIndex);
        const amount = Number(input.value);
        if (
          !Number.isInteger(index) ||
          index < 0 ||
          index >= updatedPlan.budgetCategories.length ||
          !Number.isFinite(amount) ||
          amount < 0 ||
          !Number.isSafeInteger(Math.round(amount * 100))
        ) {
          status.textContent = 'Each budget allocation must be a non-negative amount within the supported range.';
          return;
        }
        updatedPlan.budgetCategories[index].allocatedAmount = amount;
      }

      const planId = this.currentDoc.id;
      this.planEditBusy = true;
      saveButton.disabled = true;
      status.textContent = 'Saving plan revision...';

      try {
        const response = await fetch(`/api/plans/${encodeURIComponent(planId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan: updatedPlan,
            description: 'Saved plan edited'
          })
        });

        let result;
        try {
          result = await response.json();
        } catch {
          throw new Error('The server returned an unreadable response.');
        }

        if (!response.ok || !result.success || !result.doc) {
          throw new Error(result.error || 'Unable to save the plan.');
        }
        if (this.currentDoc?.id !== planId) return;

        this.renderPlan(result.doc);
        const updatedEditor = container.querySelector('#saved-plan-editor');
        if (updatedEditor) updatedEditor.hidden = false;
        const updatedEditButton = container.querySelector('#edit-saved-plan');
        if (updatedEditButton) updatedEditButton.setAttribute('aria-expanded', 'true');
        const updatedStatus = container.querySelector('#saved-plan-edit-status');
        if (updatedStatus) {
          const warnings = Array.isArray(result.warnings) ? result.warnings.join(' ') : '';
          updatedStatus.textContent =
            `Saved as revision ${result.doc.currentRevision}.${warnings ? ` ${warnings}` : ''}`;
        }
      } catch (error) {
        status.textContent = `Could not save the plan: ${error.message}`;
      } finally {
        this.planEditBusy = false;
        const currentSaveButton = container.querySelector('#save-saved-plan');
        if (currentSaveButton) currentSaveButton.disabled = false;
      }
    });
  }

  bindShockEngine(container) {
    const panel = container.querySelector('#shock-engine-panel');
    const openButton = container.querySelector('#open-shock-engine');
    const budgetToggle = container.querySelector('#shock-budget-enabled');
    const targetBudget = container.querySelector('#shock-target-budget');
    const dateToggle = container.querySelector('#shock-date-enabled');
    const targetDate = container.querySelector('#shock-target-date');
    const applyButton = container.querySelector('#apply-plan-shock');
    const cancelButton = container.querySelector('#cancel-plan-shock');
    const status = container.querySelector('#shock-engine-status');

    if (
      !panel || !openButton || !budgetToggle || !targetBudget ||
      !dateToggle || !targetDate || !applyButton || !cancelButton || !status
    ) {
      return;
    }

    openButton.addEventListener('click', () => {
      this.shockPanelOpen = true;
      panel.hidden = false;
      openButton.setAttribute('aria-expanded', 'true');
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    budgetToggle.addEventListener('change', () => {
      targetBudget.disabled = !budgetToggle.checked;
    });
    dateToggle.addEventListener('change', () => {
      targetDate.disabled = !dateToggle.checked;
    });

    cancelButton.addEventListener('click', () => {
      this.shockPanelOpen = false;
      this.renderPlan(this.currentDoc);
    });

    applyButton.addEventListener('click', async () => {
      if (this.shockBusy || !this.currentDoc) return;

      const shock = {};
      if (budgetToggle.checked) {
        const budget = Number(targetBudget.value);
        if (
          !Number.isFinite(budget) ||
          budget <= 0 ||
          !Number.isSafeInteger(Math.round(budget * 100))
        ) {
          status.textContent = 'Enter a positive total budget within the supported range.';
          return;
        }
        shock.targetTotalBudget = budget;
      }
      if (dateToggle.checked) {
        if (!targetDate.value) {
          status.textContent = 'Choose a valid target event date.';
          return;
        }
        shock.targetEventDate = targetDate.value;
      }
      if (!Object.keys(shock).length) {
        status.textContent = 'Select at least one shock to apply.';
        return;
      }

      const planId = this.currentDoc.id;
      this.shockBusy = true;
      applyButton.disabled = true;
      status.textContent = 'Applying shock and validating protected commitments...';

      try {
        const response = await fetch(`/api/plans/${encodeURIComponent(planId)}/shock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(shock)
        });

        const responseBody = await response.text();
        let result;
        try {
          result = JSON.parse(responseBody);
        } catch {
          throw new Error(
            `Shock Engine request failed (HTTP ${response.status}): response was not valid JSON.`
          );
        }

        const responseData =
          result && typeof result === 'object' && !Array.isArray(result) ? result : {};
        if (!response.ok || !responseData.success || !responseData.doc) {
          const errorMessage =
            typeof responseData.error === 'string'
              ? responseData.error
              : 'Unable to apply the shock.';
          const safeError = errorMessage
            .replace(
              /\b(authorization|cookie|password|secret|token|api[_-]?key)\b\s*[:=]\s*["']?[^,\s;"']+/gi,
              '$1=[REDACTED]'
            )
            .replace(/\bBearer\s+\S+/gi, 'Bearer [REDACTED]')
            .slice(0, 200);

          throw new Error(
            `Shock Engine request failed (HTTP ${response.status}): ${safeError}`
          );
        }
        if (this.currentDoc?.id !== planId) return;

        this.shockPanelOpen = true;
        this.renderPlan(result.doc);
        const updatedOpenButton = container.querySelector('#open-shock-engine');
        if (updatedOpenButton) updatedOpenButton.setAttribute('aria-expanded', 'true');
        const updatedStatus = container.querySelector('#shock-engine-status');
        if (updatedStatus) {
          const warnings = Array.isArray(result.warnings) ? result.warnings.join(' ') : '';
          const shiftedCount = Number(result.shock?.shiftedTaskDates) || 0;
          const shiftSummary = result.shock?.dateChanged
            ? ` Shifted ${shiftedCount} unfinished absolute task deadline(s).`
            : '';
          updatedStatus.textContent =
            `Shock applied as revision ${result.doc.currentRevision}.${shiftSummary}${warnings ? ` ${warnings}` : ''}`;
        }
      } catch (error) {
        status.textContent = `Could not apply shock: ${error.message}`;
      } finally {
        this.shockBusy = false;
        const currentApplyButton = container.querySelector('#apply-plan-shock');
        if (currentApplyButton) currentApplyButton.disabled = false;
      }
    });
  }

  renderBudgetVisualizer(categories, totalBudget, currency) {
    if (!categories?.length) return '';

    const safeTotal = Number(totalBudget) || 0;

    const meterSegments = categories.map((cat, idx) => {
      const color = getCategoryColor(idx);
      const pct = Number(
        cat.percentage ??
        (safeTotal ? (Number(cat.allocatedAmount || 0) / safeTotal) * 100 : 0)
      );

      return `
        <div class="meter-segment"
          style="width:${Math.max(0, Math.min(100, pct))}%;background:${color};"
          title="${escapeHtml(cat.name)}: ${Number(cat.allocatedAmount || 0).toLocaleString()} ${escapeHtml(currency || '')} (${pct.toFixed(1)}%)">
        </div>`;
    }).join('');

    const categoryCards = categories.map((cat, idx) => {
      const color = getCategoryColor(idx);

      const itemsHtml = (cat.items || []).map(item => {
        const isPaid = item.status === 'paid' || item.isFrozen;

        const statusBadge = isPaid
          ? `<span class="badge-pill">🔒 ${i18n.t('status_paid_frozen', 'Paid & Frozen')}</span>`
          : item.status === 'booked'
          ? `<span class="badge-pill">${i18n.t('status_booked', 'Booked')}</span>`
          : `<span class="badge-pill">${i18n.t('status_pending', 'Pending')}</span>`;

        return `
          <div class="budget-item-row" style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-glass);">
            <div style="flex:1;">
              <div style="font-size:14px;font-weight:600;color:var(--text-main);">${escapeHtml(item.name || '')}</div>
              ${item.notes ? `<div style="font-size:12px;color:var(--text-muted);margin-top:2px;">${escapeHtml(item.notes)}</div>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
              <span style="font-size:14px;font-weight:700;color:var(--text-main);">
                ${Number(item.estimatedCost || 0).toLocaleString()} ${escapeHtml(currency || '')}
              </span>
              ${statusBadge}
            </div>
          </div>`;
      }).join('');

      const pct = Number(
        cat.percentage ??
        (safeTotal ? (Number(cat.allocatedAmount || 0) / safeTotal) * 100 : 0)
      );

      return `
        <div class="glass-card budget-category-card" style="border-top:3px solid ${color};padding:20px;margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="width:10px;height:10px;border-radius:50%;background:${color};"></span>
              <h4 style="font-size:16px;color:var(--text-main);">${escapeHtml(cat.name || '')}</h4>
            </div>
            <div style="text-align:right;">
              <span style="font-size:16px;font-weight:700;color:var(--accent-gold);">
                ${Number(cat.allocatedAmount || 0).toLocaleString()} ${escapeHtml(currency || '')}
              </span>
              <span style="font-size:12px;color:var(--text-dim);margin-left:6px;">
                (${pct.toFixed(1)}%)
              </span>
            </div>
          </div>
          <div>${itemsHtml}</div>
        </div>`;
    }).join('');

    return `
      <div style="margin-bottom:32px;">
        <h3 style="font-size:20px;color:var(--text-main);margin-bottom:14px;">
          💰 ${i18n.t('budget_title', 'Structured Budget Allocation')}
        </h3>

        <div class="glass-card" style="padding:20px;margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:8px;">
            <span>Category Distribution</span>
            <span>${safeTotal.toLocaleString()} ${escapeHtml(currency || '')}</span>
          </div>
          <div class="budget-meter-track" style="height:14px;display:flex;border-radius:var(--radius-full);overflow:hidden;background:var(--surface-soft);gap:2px;">
            ${meterSegments}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;">
          ${categoryCards}
        </div>
      </div>`;
  }

  renderTimelineAndTasks(milestones) {
    if (!milestones?.length) return '';

    const milestoneCards = milestones.map(m => {
      const tasksHtml = (m.tasks || []).map(t => {
        const isDone = t.status === 'completed';
        const isHidden =
          (this.taskFilter === 'todo' && isDone) ||
          (this.taskFilter === 'completed' && !isDone);

        return `
          <div class="task-checklist-item ${isDone ? 'completed' : ''}"
            style="display:${isHidden ? 'none' : 'flex'};"
            data-task-id="${escapeHtml(t.id)}" data-milestone-id="${escapeHtml(m.id)}">
            <input type="checkbox" class="task-checkbox"
              id="task_${escapeHtml(t.id)}" ${isDone ? 'checked' : ''}>
            <div style="flex:1;">
              <label for="task_${escapeHtml(t.id)}" class="task-label ${isDone ? 'task-done' : ''}">${escapeHtml(t.title || '')}</label>
              <div style="display:flex;gap:8px;align-items:center;margin-top:4px;font-size:11px;">
                <span class="badge-pill">${escapeHtml(t.category || '')}</span>
                ${t.dueDate ? `<span style="color:var(--text-dim);">Due: ${escapeHtml(t.dueDate)}</span>` : ''}
                ${isDone ? '<span style="color:var(--accent-success);font-weight:600;">✓ Completed</span>' : ''}
              </div>
            </div>
          </div>`;
      }).join('');

      return `
        <div class="glass-card milestone-card" style="margin-bottom:16px;padding:20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="step-circle">${escapeHtml(m.order || 1)}</span>
              <h4 style="font-size:16px;color:var(--text-main);">${escapeHtml(m.title || '')}</h4>
            </div>
            <span class="badge-pill">${escapeHtml(m.timeframe || '')}</span>
          </div>
          <div class="tasks-container">${tasksHtml}</div>
        </div>`;
    }).join('');

    return `
      <div style="margin-bottom:32px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <h3 style="font-size:20px;color:var(--text-main);">
            📅 ${i18n.t('timeline_title', 'Personalized Milestone Timeline & Tasks')}
          </h3>
          <div style="display:flex;gap:6px;">
            <button class="btn-filter ${this.taskFilter === 'all' ? 'active' : ''}" data-filter="all">${i18n.t('filter_all', 'All Tasks')}</button>
            <button class="btn-filter ${this.taskFilter === 'todo' ? 'active' : ''}" data-filter="todo">${i18n.t('filter_todo', 'To Do')}</button>
            <button class="btn-filter ${this.taskFilter === 'completed' ? 'active' : ''}" data-filter="completed">${i18n.t('filter_completed', 'Completed')}</button>
          </div>
        </div>
        <div>${milestoneCards}</div>
      </div>`;
  }

  renderProtectedRituals(rituals) {
    if (!rituals?.length) return '';

    const ritualCards = rituals.map(r => `
      <div class="glass-card ritual-guard-card" style="border:1px solid color-mix(in srgb, var(--accent-gold) 45%, transparent);background:color-mix(in srgb, var(--accent-gold) 5%, var(--bg-card));padding:20px;margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:20px;">🛡️</span>
            <h4 style="font-size:16px;color:var(--accent-gold);">${escapeHtml(r.name || '')}</h4>
          </div>
          <span class="badge-pill">${i18n.t('ritual_protected_badge', 'Protected Traditional Ritual')}</span>
        </div>
        <p style="color:var(--text-main);font-size:13px;line-height:1.5;margin-bottom:8px;">
          ${escapeHtml(r.significance || '')}
        </p>
        ${r.estimatedDuration ? `<div style="font-size:12px;color:var(--text-dim);margin-bottom:6px;">⏱️ Duration: ${escapeHtml(r.estimatedDuration)}</div>` : ''}
        ${r.preservationNotes ? `<div style="font-size:12px;color:var(--accent-cyan);margin-bottom:6px;">📜 ${escapeHtml(r.preservationNotes)}</div>` : ''}
        ${r.alternativesIfBudgetConstrained ? `<div style="font-size:12px;color:var(--accent-gold);padding:8px 12px;margin-top:8px;">💡 Budget Adaptation: ${escapeHtml(r.alternativesIfBudgetConstrained)}</div>` : ''}
      </div>`).join('');

    return `
      <div style="margin-bottom:32px;">
        <h3 style="font-size:20px;color:var(--text-main);margin-bottom:14px;">
          🛡️ ${i18n.t('nav_rituals', 'Protected Traditions')}
        </h3>
        <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px;">
          These rituals are protected by CelebrationOS and will never be removed by budget shocks or date shifts.
        </p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;">
          ${ritualCards}
        </div>
      </div>`;
  }

  renderRecommendations(recs, currency) {
    if (!recs) return '';

   const venuesHtml = (recs.venues || []).map(v => `
  <div class="glass-card recommendation-card" style="padding:16px;margin-bottom:12px;">
    <h4 style="font-size:15px;color:var(--text-main);margin-bottom:6px;">${escapeHtml(v.name || '')}</h4>
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px;">
      ${escapeHtml(v.location || '')}
    </div>
    <div style="font-size:13px;color:var(--accent-gold);">
      ${v.estimatedCost ? `${Number(v.estimatedCost).toLocaleString()} ${escapeHtml(currency || '')}` : 'Cost not provided'}
    </div>
  </div>`).join('');

    const vendorsHtml = (recs.vendors || []).map(v => `
      <div class="glass-card recommendation-card" style="padding:16px;margin-bottom:12px;">
        <h4 style="font-size:15px;color:var(--text-main);margin-bottom:6px;">${escapeHtml(v.name || '')}</h4>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px;">
          ${escapeHtml(v.serviceType || '')} • ${escapeHtml(v.location || '')}
        </div>
        <div style="font-size:13px;color:var(--accent-gold);">
          ${v.estimatedCost ? `${Number(v.estimatedCost).toLocaleString()} ${escapeHtml(currency || '')}` : 'Cost not provided'}
        </div>
      </div>`).join('');

    return `
      <div style="margin-bottom:32px;">
        <h3 style="font-size:20px;color:var(--text-main);margin-bottom:14px;">
          💡 ${i18n.t('nav_recommendations', 'Recommendations')}
        </h3>

        ${venuesHtml ? `
          <h4 style="font-size:16px;color:var(--text-main);margin-bottom:8px;">${i18n.t('recommendation_venues', 'Recommended Venues')}</h4>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;margin-bottom:20px;">
            ${venuesHtml}
          </div>
        ` : ''}

        ${vendorsHtml ? `
          <h4 style="font-size:16px;color:var(--text-main);margin-bottom:8px;">${i18n.t('recommendation_vendors', 'Recommended Vendors')}</h4>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;">
            ${vendorsHtml}
          </div>
        ` : ''}
      </div>`;
  }
}

export const planViewer = new PlanViewer();