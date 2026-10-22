import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  deletePlan,
  deleteSelectedRevisions,
  getPlan,
  listPlans,
  saveNewPlan,
  setHistoryTracking,
  updatePlan
} from '../server/storage.js';
import { executeSafeUndo } from '../server/historyEngine.js';
import { MOCK_EVENT_PLANS } from '../server/schemas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const plansDir = path.resolve(__dirname, '..', 'data', 'plans');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`FAILED: ${message}`);
  }
  console.log(`PASSED: ${message}`);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function runTests() {
  let planId;
  let legacyPlanId;
  let completedTaskUndoPlanId;

  try {
    const completedTaskUndoDoc = saveNewPlan(clone(MOCK_EVENT_PLANS.en));
    completedTaskUndoPlanId = completedTaskUndoDoc.id;
    const planWithNewCompletedTask = clone(completedTaskUndoDoc.activePlan);
    const targetMilestone = planWithNewCompletedTask.milestones.find(
      milestone => milestone.id === 'm_1m'
    );
    const frozenBooking = planWithNewCompletedTask.budgetCategories
      .find(category => category.id === 'cat_venue')
      .items.find(item => item.id === 'item_v2');
    frozenBooking.status = 'booked';
    frozenBooking.isFrozen = true;
    targetMilestone.tasks.push({
      id: 't_safe_undo_added_completed',
      title: 'Complete newly added test task',
      category: 'vendors',
      status: 'completed',
      isFrozen: true,
      dueDate: '1 week before'
    });
    updatePlan(
      completedTaskUndoPlanId,
      planWithNewCompletedTask,
      'Add and complete a task after the target revision'
    );

    const completedTaskUndo = executeSafeUndo(completedTaskUndoPlanId, 1);
    const restoredMilestone = completedTaskUndo.doc.activePlan.milestones.find(
      milestone => milestone.id === 'm_1m'
    );
    const restoredNewTask = restoredMilestone.tasks.find(
      task => task.id === 't_safe_undo_added_completed'
    );
    assert(
      restoredNewTask?.status === 'completed' && restoredNewTask.isFrozen === true,
      'Safe Undo preserves a completed frozen task added after the target revision'
    );
    const restoredFrozenBooking = completedTaskUndo.doc.activePlan.budgetCategories
      .find(category => category.id === 'cat_venue')
      .items.find(item => item.id === 'item_v2');
    assert(
      restoredFrozenBooking?.status === 'booked' && restoredFrozenBooking.isFrozen === true,
      'Safe Undo preserves a frozen booking even when it is not marked paid'
    );
    assert(
      completedTaskUndo.conflicts.some(conflict =>
        conflict.includes('Complete newly added test task')
      ) &&
      completedTaskUndo.conflicts.some(conflict =>
        conflict.includes('paid/frozen commitment') &&
        conflict.includes('Generator & Backup Power')
      ),
      'Safe Undo reports conflicts for the newly completed task and frozen booking'
    );

    const plan = clone(MOCK_EVENT_PLANS.en);
    plan.eventDetails.title = 'History Tracking Regression Plan';
    const initialDoc = saveNewPlan(plan);
    planId = initialDoc.id;

    assert(initialDoc.historyTracking === true, 'New plans default history tracking to ON');
    assert(initialDoc.history.length === 1, 'New plan starts with its initial snapshot');

    const listedPlan = listPlans().find(entry => entry.id === planId);
    assert(listedPlan.historyTracking === true, 'Saved plan listing defaults history tracking to ON');

    const legacyDoc = saveNewPlan(clone(MOCK_EVENT_PLANS.en));
    legacyPlanId = legacyDoc.id;
    delete legacyDoc.historyTracking;
    fs.writeFileSync(
      path.join(plansDir, `${legacyPlanId}.json`),
      JSON.stringify(legacyDoc, null, 2),
      'utf-8'
    );

    const legacyPlan = clone(getPlan(legacyPlanId).activePlan);
    legacyPlan.eventDetails.title = 'Legacy Plan Updated';
    const legacyUpdate = updatePlan(legacyPlanId, legacyPlan);
    assert(legacyUpdate.doc.historyTracking === true, 'Legacy plans remain ON by default');
    assert(legacyUpdate.doc.history.length === 2, 'Legacy plan updates continue recording snapshots');

    setHistoryTracking(planId, false);
    const disabledDoc = getPlan(planId);
    assert(disabledDoc.historyTracking === false, 'History tracking can be turned OFF');

    const changedPlan = clone(disabledDoc.activePlan);
    changedPlan.eventDetails.title = 'Updated While Tracking Is OFF';
    const venue = changedPlan.budgetCategories.find(category => category.id === 'cat_venue');
    const paidItem = venue.items.find(item => item.id === 'item_v2');
    paidItem.status = 'paid';
    paidItem.isFrozen = true;

    const completedTask = changedPlan.milestones[1].tasks.find(task => task.id === 't_menu_tasting');
    completedTask.status = 'completed';
    completedTask.isFrozen = true;
    changedPlan.protectedRituals.push({
      id: 'r_history_tracking_test',
      name: 'History Tracking Test Ritual',
      significance: 'Test protected ritual',
      isProtected: true
    });

    const offUpdate = updatePlan(planId, changedPlan, 'Update while history tracking is OFF');
    assert(offUpdate.doc.currentRevision === 2, 'Active plan revision advances while tracking is OFF');
    assert(offUpdate.doc.history.length === 1, 'OFF update does not append a history snapshot');
    assert(
      offUpdate.doc.activePlan.eventDetails.title === 'Updated While Tracking Is OFF',
      'OFF update persists the active plan normally'
    );
    assert(
      !offUpdate.doc.history.some(entry => entry.revision === offUpdate.doc.currentRevision),
      'OFF update leaves a safe revision gap'
    );

    const undoResult = executeSafeUndo(planId, 1);
    assert(undoResult.success === true, 'Safe Undo still succeeds while tracking is OFF');
    assert(undoResult.doc.currentRevision === 3, 'Safe Undo advances the active revision while tracking is OFF');
    assert(undoResult.doc.history.length === 1, 'Safe Undo while OFF does not create a snapshot');
    assert(undoResult.doc.historyTracking === false, 'Safe Undo keeps History Tracking OFF');
    assert(
      !undoResult.doc.history.some(entry => entry.revision === 3),
      'Safe Undo while OFF does not add a snapshot at the restored revision'
    );
    assert(
      undoResult.conflicts.some(conflict => conflict.includes('paid/frozen commitment')) &&
      undoResult.conflicts.some(conflict => conflict.includes('completed task')) &&
      undoResult.conflicts.some(conflict => conflict.includes('protected ritual')),
      'Safe Undo reports conflicts for the paid item, completed task, and protected ritual while tracking is OFF'
    );

    const restoredPlan = undoResult.doc.activePlan;
    const restoredPaidItem = restoredPlan.budgetCategories
      .find(category => category.id === 'cat_venue')
      .items.find(item => item.id === 'item_v2');
    assert(restoredPaidItem.status === 'paid', 'Safe Undo preserves paid commitment while tracking is OFF');
    assert(restoredPaidItem.isFrozen === true, 'Safe Undo keeps paid commitment frozen');

    const restoredTask = restoredPlan.milestones[1].tasks.find(task => task.id === 't_menu_tasting');
    assert(restoredTask.status === 'completed', 'Safe Undo preserves completed task while tracking is OFF');
    assert(restoredTask.isFrozen === true, 'Safe Undo keeps completed task frozen while tracking is OFF');
    assert(
      restoredPlan.protectedRituals.some(ritual => ritual.id === 'r_history_tracking_test'),
      'Safe Undo preserves protected ritual while tracking is OFF'
    );

    const enabledDoc = setHistoryTracking(planId, true);
    assert(enabledDoc.historyTracking === true, 'History tracking can be turned back ON');
    assert(
      enabledDoc.history.filter(entry => entry.revision === enabledDoc.currentRevision).length === 1,
      'Re-enabling tracking checkpoints the active revision exactly once'
    );
    assert(
      enabledDoc.history.find(entry => entry.revision === enabledDoc.currentRevision)
        .planSnapshot.eventDetails.title === restoredPlan.eventDetails.title,
      'Re-enabled checkpoint matches the current active plan'
    );
    assert(
      !enabledDoc.history.some(entry => entry.revision === 2),
      'Re-enabling tracking retains revision gaps instead of fabricating snapshots'
    );

    const nextPlan = clone(enabledDoc.activePlan);
    nextPlan.eventDetails.title = 'Updated While Tracking Is ON';
    const onUpdate = updatePlan(planId, nextPlan, 'Update while history tracking is ON');
    assert(onUpdate.doc.currentRevision === 4, 'Active revision continues monotonically after a gap');
    assert(
      onUpdate.doc.history.some(entry => entry.revision === 4),
      'ON update records a snapshot at the new active revision'
    );

    const deleteResult = deleteSelectedRevisions(planId, [1], true);
    assert(deleteResult.success === true, 'Selective historical revision deletion succeeds');
    assert(
      !deleteResult.doc.history.some(entry => entry.revision === 1),
      'Selected old revision is removed'
    );
    assert(
      deleteResult.doc.currentRevision === 4 &&
      deleteResult.doc.activePlan.eventDetails.title === 'Updated While Tracking Is ON',
      'Selective deletion preserves the active plan and its current revision'
    );

    let activeDeleteRejected = false;
    try {
      deleteSelectedRevisions(planId, [4], true);
    } catch (error) {
      activeDeleteRejected = error.message.includes('active revision');
    }
    assert(activeDeleteRejected, 'Selective deletion rejects the active revision');
    assert(getPlan(planId).activePlan.eventDetails.title === 'Updated While Tracking Is ON',
      'Rejected active revision deletion leaves active plan unchanged');

    console.log('\nAll history tracking regression tests passed.');
  } finally {
    if (completedTaskUndoPlanId) deletePlan(completedTaskUndoPlanId);
    if (planId) deletePlan(planId);
    if (legacyPlanId) deletePlan(legacyPlanId);
  }
}

runTests().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
