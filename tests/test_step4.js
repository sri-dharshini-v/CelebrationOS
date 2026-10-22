/**
 * CelebrationOS Step 4 Automated Test Suite
 * Persistence, Version History & Safe Undo with Conflict Detection
 */

import { listPlans, getPlan, saveNewPlan, updatePlan, deletePlan } from '../server/storage.js';
import { executeSafeUndo } from '../server/historyEngine.js';
import { MOCK_EVENT_PLANS } from '../server/schemas.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('==========================================================');
console.log('🧪 Running Step 4 Persistence, History & Safe Undo Tests');
console.log('==========================================================\n');

let planId;
process.on('exit', () => {
  if (planId) deletePlan(planId);
});

async function runTests() {
  // -----------------------------------------------------------------
  // 1. Save New Plan (Revision 1)
  // -----------------------------------------------------------------
  console.log('--- 1. Testing Plan Persistence & Revision 1 Creation ---');
  const initialPlan = JSON.parse(JSON.stringify(MOCK_EVENT_PLANS.en));
  initialPlan.eventDetails.title = "Step 4 Test Gala Celebration";
  
  // In Revision 1, let's make an item unbooked and task uncompleted
  const venueCat = initialPlan.budgetCategories.find(c => c.id === 'cat_venue');
  const generatorItem = venueCat.items.find(i => i.id === 'item_v2');
  generatorItem.status = 'pending';
  generatorItem.isFrozen = false;

  const doc1 = saveNewPlan(initialPlan, 'Created initial Gala plan');
  planId = doc1.id;

  assert(Boolean(planId), `New plan created with ID: ${planId}`);
  assert(doc1.currentRevision === 1, 'Initial plan starts at currentRevision === 1');
  assert(doc1.history.length === 1, 'Initial plan history contains exactly 1 snapshot');
  assert(doc1.history[0].revision === 1, 'Snapshot revision number is 1');
  assert(doc1.activePlan.eventDetails.title === "Step 4 Test Gala Celebration", 'Active plan title matches');

  // -----------------------------------------------------------------
  // 2. Listing and Retrieving Saved Plans
  // -----------------------------------------------------------------
  console.log('\n--- 2. Testing Plan Listing and Retrieval ---');
  const planList = listPlans();
  const listedItem = planList.find(p => p.id === planId);
  assert(Boolean(listedItem), 'Newly created plan appears in listPlans()');
  assert(listedItem.title === "Step 4 Test Gala Celebration", 'Summary title matches in list');

  const loadedDoc = getPlan(planId);
  assert(Boolean(loadedDoc), 'Plan retrieved successfully via getPlan()');
  assert(loadedDoc.id === planId, 'Loaded plan ID matches');
  assert(loadedDoc.currentRevision === 1, 'Loaded plan revision is 1');

  // -----------------------------------------------------------------
  // 3. Updating Plan (Revision 2) with New Commitments
  // -----------------------------------------------------------------
  console.log('\n--- 3. Testing Plan Update to Revision 2 ---');
  const updatedPlan = JSON.parse(JSON.stringify(loadedDoc.activePlan));
  
  // Make a commitment: mark generator power as PAID and FROZEN (Deposit ₹50,000)
  const upVenueCat = updatedPlan.budgetCategories.find(c => c.id === 'cat_venue');
  const upGenItem = upVenueCat.items.find(i => i.id === 'item_v2');
  upGenItem.status = 'paid';
  upGenItem.isFrozen = true;
  upGenItem.notes = 'Paid in full via bank transfer to PowerCorp';

  // Mark a task as completed
  const upTask = updatedPlan.milestones[1].tasks.find(t => t.id === 't_menu_tasting');
  upTask.status = 'completed';
  upTask.isFrozen = true;

  // Add a newly protected traditional ritual
  updatedPlan.protectedRituals.push({
    id: 'r_deeparadhana',
    name: 'Auspicious Deeparadhana Lamp Ceremony',
    significance: 'Traditional lamp lighting for prosperity',
    estimatedDuration: '20 minutes',
    isProtected: true,
    preservationNotes: 'Sacred oil lamp ceremony',
    alternativesIfBudgetConstrained: 'Use traditional brass vilakku without external rental'
  });

  const updateRes = updatePlan(planId, updatedPlan, 'Booked power generator & completed food tasting');
  const doc2 = updateRes.doc;

  assert(doc2.currentRevision === 2, 'Plan revision incremented to 2');
  assert(doc2.history.length === 2, 'History array now contains 2 snapshots');
  assert(doc2.activePlan.budgetCategories[0].items.find(i => i.id === 'item_v2').status === 'paid', 'Generator item is now PAID in Revision 2');

  // -----------------------------------------------------------------
  // 4. Safe Undo: Reverting to Revision 1 while Preserving Commitments
  // -----------------------------------------------------------------
  console.log('\n--- 4. Testing Safe Undo to Revision 1 with Conflict Detection ---');
  // In Revision 1: generator was 'pending' and unpaid, task was 'in_progress', deeparadhana did not exist.
  // When we restore Revision 1, CelebrationOS Safe Undo MUST:
  // 1. Restore general details of Revision 1.
  // 2. PRESERVE generator as PAID!
  // 3. PRESERVE food tasting task as COMPLETED!
  // 4. PRESERVE the Deeparadhana ritual as PROTECTED!
  // 5. Report explicit conflict explanations.

  const undoResult = executeSafeUndo(planId, 1);
  assert(undoResult.success === true, 'Safe Undo operation succeeded');
  assert(undoResult.restoredRevision === 1, 'Target restored revision recorded as 1');
  assert(undoResult.newRevision === 3, 'Safe Undo created new revision 3');
  assert(undoResult.conflicts.length >= 3, `Safe Undo surfaced ${undoResult.conflicts.length} conflict notices`);
  assert(
    undoResult.conflicts.some(conflict => conflict.includes('Generator & Backup Power')) &&
    undoResult.conflicts.some(conflict => conflict.includes('Conduct catering tasting session')) &&
    undoResult.conflicts.some(conflict => conflict.includes('Auspicious Deeparadhana Lamp Ceremony')),
    'Safe Undo reports paid, completed-task, and protected-ritual conflicts'
  );

  // Verify the preserved commitments in Revision 3
  const doc3 = undoResult.doc;
  assert(
    doc3.activePlan.eventDetails.title === initialPlan.eventDetails.title,
    'Safe Undo restores ordinary plan details from the target revision'
  );
  const resGenItem = doc3.activePlan.budgetCategories[0].items.find(i => i.id === 'item_v2');
  assert(resGenItem.status === 'paid', 'SAFE UNDO GUARANTEE: Paid generator booking was preserved as PAID');
  assert(resGenItem.isFrozen === true, 'SAFE UNDO GUARANTEE: Paid generator booking remains FROZEN');

  const resTask = doc3.activePlan.milestones[1].tasks.find(t => t.id === 't_menu_tasting');
  assert(resTask.status === 'completed', 'SAFE UNDO GUARANTEE: Completed task was preserved as COMPLETED');

  const resRitual = doc3.activePlan.protectedRituals.find(r => r.id === 'r_deeparadhana');
  assert(Boolean(resRitual), 'SAFE UNDO GUARANTEE: Protected ritual was retained');
  assert(resRitual.isProtected === true, 'SAFE UNDO GUARANTEE: Ritual retains protected status');

  // Verify budget math invariant still holds
  const sum3 = doc3.activePlan.budgetCategories.reduce((acc, c) => acc + c.allocatedAmount, 0);
  assert(Math.round(sum3) === doc3.activePlan.eventDetails.totalBudget, 'Budget math invariant strictly maintained after safe undo');

  // -----------------------------------------------------------------
  // 5. Testing RESTful HTTP Endpoints
  // -----------------------------------------------------------------
  console.log('\n--- 5. Testing REST API Endpoints over HTTP ---');
  
  // GET /api/plans
  const httpListRes = await fetch('http://localhost:3000/api/plans');
  const httpListData = await httpListRes.json();
  assert(httpListData.success === true, 'GET /api/plans returned success');
  assert(Array.isArray(httpListData.plans), 'GET /api/plans returned an array of plans');

  // GET /api/plans/:id
  const httpGetRes = await fetch(`http://localhost:3000/api/plans/${planId}`);
  const httpGetData = await httpGetRes.json();
  assert(httpGetData.success === true, 'GET /api/plans/:id returned success');
  assert(httpGetData.doc.currentRevision === 3, 'GET /api/plans/:id reflects current revision 3');
  assert(httpGetData.doc.history.length === 3, 'History array length is 3');

  // -----------------------------------------------------------------
  // 6. Cleanup Test Plan
  // -----------------------------------------------------------------
  console.log('\n--- 6. Cleanup Test Plan ---');
  const deleteResult = deletePlan(planId);
  assert(deleteResult === true, 'Test plan deleted successfully');
  assert(getPlan(planId) === null, 'Verified test plan no longer exists on disk');
  planId = undefined;

  console.log('\n🎉 ALL STEP 4 PERSISTENCE & SAFE UNDO TESTS PASSED WITH 100% SUCCESS!\n');
}

runTests().catch(err => {
  console.error('Fatal error during Step 4 tests:', err);
  process.exit(1);
});
