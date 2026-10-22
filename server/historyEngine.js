/**
 * CelebrationOS Safe Undo Engine
 * 
 * CORE PRINCIPLE:
 * Restoring a previous plan must never silently cancel paid vendor bookings,
 * uncomplete finished tasks, or discard protected traditional rituals.
 * Any conflicts are explicitly detected, resolved by preserving commitments,
 * and reported to the user.
 */

import { getPlan, updatePlan } from './storage.js';
import { round2 } from './invariants.js';

/**
 * Performs a Safe Undo to a specified target revision
 * @param {string} planId - The unique ID of the event plan
 * @param {number} targetRevision - The revision number to restore
 * @returns {object} Result of the safe undo operation
 */
export function executeSafeUndo(planId, targetRevision) {
  const doc = getPlan(planId);
  if (!doc) {
    throw new Error(`Plan ${planId} not found`);
  }

  const targetSnap = (doc.history || []).find(h => h.revision === Number(targetRevision));
  if (!targetSnap) {
    throw new Error(`Revision ${targetRevision} not found in plan history`);
  }

  const currentPlan = doc.activePlan;
  // Clone the historical snapshot to be restored
  const restoredPlan = JSON.parse(JSON.stringify(targetSnap.planSnapshot));
  const conflicts = [];

  // -----------------------------------------------------------------
  // 1. Preserve Paid Bookings and Frozen Budget Items
  // -----------------------------------------------------------------
  const currentFrozenItems = new Map();
  if (Array.isArray(currentPlan.budgetCategories)) {
    currentPlan.budgetCategories.forEach(cat => {
      (cat.items || []).forEach(item => {
        if (item.status === 'paid' || item.isFrozen) {
          currentFrozenItems.set(item.id, {
            item: { ...item },
            categoryId: cat.id,
            categoryName: cat.name
          });
        }
      });
    });
  }

  currentFrozenItems.forEach((commitment, itemId) => {
    const frozenItem = commitment.item;
    let foundInRestored = false;

    // Search for item across restored categories
    restoredPlan.budgetCategories.forEach(cat => {
      const idx = (cat.items || []).findIndex(i => i.id === itemId);
      if (idx !== -1) {
        foundInRestored = true;
        const oldState = cat.items[idx];

        if (JSON.stringify(oldState) !== JSON.stringify(frozenItem)) {
          conflicts.push(
            `Preserved paid/frozen commitment: '${frozenItem.name}' remains in its current state ('${frozenItem.status}', ${frozenItem.estimatedCost} ${restoredPlan.eventDetails.currency}, frozen: ${Boolean(frozenItem.isFrozen)}) instead of reverting to previous state ('${oldState.status}', ${oldState.estimatedCost}).`
          );
          cat.items[idx] = { ...frozenItem };
        }
      }
    });

    // If item did not exist in older revision, preserve it in the corresponding category
    if (!foundInRestored) {
      let targetCat = restoredPlan.budgetCategories.find(c => c.id === commitment.categoryId);
      if (!targetCat) {
        targetCat = restoredPlan.budgetCategories[0];
      }
      targetCat.items.push({ ...frozenItem });
      conflicts.push(
        `Preserved newly paid/frozen booking: '${frozenItem.name}' (${frozenItem.estimatedCost}) was kept in category '${targetCat.name}' because it is already paid or frozen.`
      );
    }
  });

  // -----------------------------------------------------------------
  // 2. Preserve Completed Tasks and Frozen Milestones
  // -----------------------------------------------------------------
  const currentCompletedTasks = new Map();
  if (Array.isArray(currentPlan.milestones)) {
    currentPlan.milestones.forEach(m => {
      (m.tasks || []).forEach(t => {
        if (t.status === 'completed' || t.isFrozen) {
          currentCompletedTasks.set(t.id, {
            task: t,
            milestone: m
          });
        }
      });
    });
  }

  currentCompletedTasks.forEach(({ task: completedTask, milestone }, taskId) => {
    let restoredMilestone = restoredPlan.milestones.find(m => m.id === milestone.id);
    if (!restoredMilestone) {
      restoredMilestone = {
        ...milestone,
        tasks: [{ ...completedTask }]
      };
      restoredPlan.milestones.push(restoredMilestone);
      conflicts.push(
        `Preserved completed task: '${completedTask.title}' and its milestone were retained because the task is complete or frozen.`
      );
      return;
    }

    const idx = (restoredMilestone.tasks || []).findIndex(t => t.id === taskId);
    if (idx === -1) {
      restoredMilestone.tasks.push({ ...completedTask });
      conflicts.push(
        `Preserved completed task: '${completedTask.title}' was retained because it is complete or frozen.`
      );
      return;
    }

    const oldTask = restoredMilestone.tasks[idx];
    if (JSON.stringify(oldTask) !== JSON.stringify(completedTask)) {
      conflicts.push(
        `Preserved completed task: '${completedTask.title}' remains completed or frozen instead of reverting to the selected revision.`
      );
      restoredMilestone.tasks[idx] = { ...completedTask };
    }
  });

  // -----------------------------------------------------------------
  // 3. Preserve User-Protected Cultural Rituals
  // -----------------------------------------------------------------
  const currentProtectedRituals = (currentPlan.protectedRituals || []).filter(r => r.isProtected);
  currentProtectedRituals.forEach(currRitual => {
    const existingIdx = (restoredPlan.protectedRituals || []).findIndex(r => r.id === currRitual.id);
    if (existingIdx === -1) {
      restoredPlan.protectedRituals.push({ ...currRitual });
      conflicts.push(
        `Preserved protected ritual: '${currRitual.name}' retained in restored plan.`
      );
    } else {
      restoredPlan.protectedRituals[existingIdx].isProtected = true;
    }
  });

  // -----------------------------------------------------------------
  // 4. Save Restored State as a New Immutable Revision
  // -----------------------------------------------------------------
  const undoDescription = conflicts.length > 0
    ? `Safe Undo to Revision ${targetRevision} (Preserved ${conflicts.length} active commitments)`
    : `Restored to Revision ${targetRevision}`;

  const updateResult = updatePlan(planId, restoredPlan, undoDescription);

  return {
    success: true,
    planId,
    restoredRevision: Number(targetRevision),
    newRevision: updateResult.doc.currentRevision,
    conflicts,
    doc: updateResult.doc,
    warnings: updateResult.warnings
  };
}
