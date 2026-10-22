/**
 * CelebrationOS Step 3 Automated Invariant & Schema Test Suite
 */

import { validateAndNormalizePlan, validateAndNormalizeBudget, validateFrozenCommitments, validateProtectedRituals } from '../server/invariants.js';
import { MOCK_EVENT_PLANS } from '../server/schemas.js';
import { generateEventPlan } from '../server/gemini.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('======================================================');
console.log('🧪 Running Step 3 Backend Invariant & Schema Tests');
console.log('======================================================\n');

// -------------------------------------------------------------------
// TEST 1: Valid Reference Plans Pass All Invariant Checks
// -------------------------------------------------------------------
console.log('--- Test 1: Valid Reference Plans (EN, TA, HI) ---');
for (const lang of ['en', 'ta', 'hi']) {
  const plan = JSON.parse(JSON.stringify(MOCK_EVENT_PLANS[lang]));
  const result = validateAndNormalizePlan(plan);
  assert(result.isValid === true, `Reference plan [${lang}] is structurally valid`);
  assert(result.errors.length === 0, `Reference plan [${lang}] has 0 structural errors`);
  assert(result.violations.length === 0, `Reference plan [${lang}] has 0 invariant violations`);

  // Verify that category allocations sum up exactly to totalBudget
  const sum = result.normalizedPlan.budgetCategories.reduce((acc, c) => acc + c.allocatedAmount, 0);
  assert(Math.round(sum) === result.normalizedPlan.eventDetails.totalBudget, `Budget categories sum (${sum}) equals totalBudget (${result.normalizedPlan.eventDetails.totalBudget}) for [${lang}]`);
}

// -------------------------------------------------------------------
// TEST 2: Budget Math Invariant & Deterministic Reconciliation
// -------------------------------------------------------------------
console.log('\n--- Test 2: Budget Math Invariant & Discrepancy Handling ---');
const budgetTestPlan = JSON.parse(JSON.stringify(MOCK_EVENT_PLANS.en));
// Intentionally tamper with a category amount so sum != totalBudget
budgetTestPlan.budgetCategories[0].allocatedAmount = 100000; // was 450000, 350000 short!

// Without autoReconcile -> Must flag error
const strictBudgetResult = validateAndNormalizeBudget(budgetTestPlan, { autoReconcile: false });
assert(strictBudgetResult.isValid === false, 'Strict budget check catches category sum mismatch');
assert(strictBudgetResult.errors.length > 0, 'Error returned when sum != totalBudget without reconciliation');

// With autoReconcile -> Must reconcile discrepancy into contingency category and sum correctly
const reconciledResult = validateAndNormalizePlan(budgetTestPlan, { autoReconcile: true });
assert(reconciledResult.isValid === true, 'Auto-reconciliation restores valid budget invariant');
const reconciledSum = reconciledResult.normalizedPlan.budgetCategories.reduce((acc, c) => acc + c.allocatedAmount, 0);
assert(Math.round(reconciledSum) === reconciledResult.normalizedPlan.eventDetails.totalBudget, `Reconciled sum (${reconciledSum}) matches totalBudget (${reconciledResult.normalizedPlan.eventDetails.totalBudget})`);
assert(reconciledResult.warnings.length > 0, 'Warning logged explaining deterministic budget adjustment');

// -------------------------------------------------------------------
// TEST 3: Commitment Freezing Invariant (Paid / Completed Items)
// -------------------------------------------------------------------
console.log('\n--- Test 3: Commitment Freezing Invariant ---');
const baselinePlan = JSON.parse(JSON.stringify(MOCK_EVENT_PLANS.en));
// Item item_p1 is marked 'paid' and isFrozen: true (cost: 100000)
// Task t_v_book is marked 'completed' and isFrozen: true

// Scenario 3A: Attempting to reduce or increase paid amount
const alteredPaidPlan = JSON.parse(JSON.stringify(MOCK_EVENT_PLANS.en));
const photoCat = alteredPaidPlan.budgetCategories.find(c => c.id === 'cat_photo');
const paidItem = photoCat.items.find(i => i.id === 'item_p1');
paidItem.estimatedCost = 50000; // Illegal reduction of paid deposit!

const paidViolationResult = validateFrozenCommitments(alteredPaidPlan, baselinePlan);
assert(paidViolationResult.isValid === false, 'Modifying cost of paid commitment detected as violation');
assert(paidViolationResult.violations.some(v => v.includes('Paid/frozen booking')), 'Violation message mentions paid booking cannot be changed');

// Scenario 3B: Attempting to delete a paid commitment
const deletedPaidPlan = JSON.parse(JSON.stringify(MOCK_EVENT_PLANS.en));
const photoCat2 = deletedPaidPlan.budgetCategories.find(c => c.id === 'cat_photo');
photoCat2.items = photoCat2.items.filter(i => i.id !== 'item_p1');

const deleteViolationResult = validateFrozenCommitments(deletedPaidPlan, baselinePlan);
assert(deleteViolationResult.isValid === false, 'Removing a paid commitment detected as critical violation');
assert(deleteViolationResult.violations.some(v => v.includes('silently removed')), 'Violation message notes item was silently removed');

// Scenario 3C: Attempting to un-complete a completed task
const alteredTaskPlan = JSON.parse(JSON.stringify(MOCK_EVENT_PLANS.en));
const task = alteredTaskPlan.milestones[0].tasks.find(t => t.id === 't_v_book');
task.status = 'todo'; // Illegal revert of completed task

const taskViolationResult = validateFrozenCommitments(alteredTaskPlan, baselinePlan);
assert(taskViolationResult.isValid === false, 'Reverting completed task detected as commitment violation');

// -------------------------------------------------------------------
// TEST 4: Protected Ritual Preservation Invariant
// -------------------------------------------------------------------
console.log('\n--- Test 4: Protected Ritual Preservation Invariant ---');
const droppedRitualPlan = JSON.parse(JSON.stringify(MOCK_EVENT_PLANS.en));
// Dropping Muhurtham
droppedRitualPlan.protectedRituals = droppedRitualPlan.protectedRituals.filter(r => r.id !== 'r_muhurtham');

const ritualViolationResult = validateProtectedRituals(droppedRitualPlan, baselinePlan);
assert(ritualViolationResult.isValid === false, 'Dropping a protected ritual caught as violation');
assert(ritualViolationResult.violations.some(v => v.includes('Protected traditional ritual')), 'Violation message explains ritual protection rule');

// -------------------------------------------------------------------
// TEST 5: Malformed AI Output Handling
// -------------------------------------------------------------------
console.log('\n--- Test 5: Malformed AI Output Handling ---');
const malformedPlan1 = { eventDetails: null };
const malformedResult1 = validateAndNormalizePlan(malformedPlan1);
assert(malformedResult1.isValid === false, 'Plan with null eventDetails rejected');
assert(malformedResult1.errors.length > 0, 'Detailed validation errors returned');

const malformedPlan2 = {
  eventDetails: { title: "Test", eventType: "wedding", guestCount: -5, totalBudget: "invalid", currency: "INR", language: "en" },
  budgetCategories: "not an array"
};
const malformedResult2 = validateAndNormalizePlan(malformedPlan2);
assert(malformedResult2.isValid === false, 'Plan with negative guests and string budget rejected');
assert(malformedResult2.errors.some(e => e.includes('positive finite number')), 'Negative number caught');

const invalidDatePlan = JSON.parse(JSON.stringify(MOCK_EVENT_PLANS.en));
invalidDatePlan.eventDetails.date = '2027-02-30';
const invalidDateResult = validateAndNormalizePlan(invalidDatePlan);
assert(invalidDateResult.isValid === false, 'Impossible calendar date is rejected');
assert(invalidDateResult.errors.some(error => error.includes('eventDetails.date')), 'Date validation returns a field-specific error');

const invalidDateFormatPlan = JSON.parse(JSON.stringify(MOCK_EVENT_PLANS.en));
invalidDateFormatPlan.eventDetails.date = '02/14/2027';
assert(
  validateAndNormalizePlan(invalidDateFormatPlan).isValid === false,
  'Non-ISO event date format is rejected'
);

const infiniteBudgetPlan = JSON.parse(JSON.stringify(MOCK_EVENT_PLANS.en));
infiniteBudgetPlan.eventDetails.totalBudget = Infinity;
assert(
  validateAndNormalizePlan(infiniteBudgetPlan).isValid === false,
  'Infinite total budget is rejected'
);

const infiniteCategoryPlan = JSON.parse(JSON.stringify(MOCK_EVENT_PLANS.en));
infiniteCategoryPlan.budgetCategories[0].allocatedAmount = Infinity;
assert(
  validateAndNormalizePlan(infiniteCategoryPlan).isValid === false,
  'Infinite category allocation is rejected'
);

const negativeItemCostPlan = JSON.parse(JSON.stringify(MOCK_EVENT_PLANS.en));
negativeItemCostPlan.budgetCategories[0].items[0].estimatedCost = -1;
assert(
  validateAndNormalizePlan(negativeItemCostPlan).isValid === false,
  'Negative budget item cost is rejected'
);

const overAllocatedPlan = JSON.parse(JSON.stringify(MOCK_EVENT_PLANS.en));
overAllocatedPlan.eventDetails.totalBudget = 5;
overAllocatedPlan.budgetCategories = [
  { id: 'cat_contingency', name: 'Contingency', allocatedAmount: 2, items: [] },
  { id: 'cat_other', name: 'Other', allocatedAmount: 8, items: [] }
];
const overAllocationResult = validateAndNormalizePlan(overAllocatedPlan);
assert(overAllocationResult.isValid === true, 'Over-allocation reconciles without invalid amounts');
assert(
  overAllocationResult.normalizedPlan.budgetCategories.every(category => category.allocatedAmount >= 0),
  'Over-allocation reconciliation never creates a negative category'
);

const frozenAllocationResult = validateAndNormalizeBudget({
  eventDetails: { totalBudget: 5 },
  budgetCategories: [{
    id: 'cat_contingency',
    name: 'Contingency',
    allocatedAmount: 10,
    items: [{ id: 'paid_item', status: 'paid' }]
  }]
});
assert(
  frozenAllocationResult.isValid === false,
  'Reconciliation rejects mismatches that would change a frozen category'
);

// -------------------------------------------------------------------
// TEST 6: Multilingual Mock Generator & End-to-End Pipeline
// -------------------------------------------------------------------
console.log('\n--- Test 6: Multilingual Generation Pipeline (Mock Mode) ---');
async function testGeneration() {
  // English generation test
  const enGen = await generateEventPlan({
    title: "Chennai Beach Wedding",
    eventType: "wedding",
    guestCount: 300,
    totalBudget: 2000000,
    currency: "INR",
    language: "en"
  }, { forceMock: true });

  assert(enGen.success === true, 'English event plan generation succeeded');
  assert(enGen.plan.eventDetails.totalBudget === 2000000, 'Budget scaled correctly to 2,000,000 INR');
  assert(enGen.plan.eventDetails.guestCount === 300, 'Guest count updated to 300');

  // Tamil generation test
  const taGen = await generateEventPlan({
    title: "மதுரை மீனாட்சி திருமண விழா",
    eventType: "wedding",
    guestCount: 200,
    totalBudget: 1200000,
    currency: "INR",
    language: "ta"
  }, { forceMock: true });

  assert(taGen.success === true, 'Tamil event plan generation succeeded');
  assert(taGen.plan.eventDetails.language === 'ta', 'Tamil language preserved in plan');
  assert(/[\u0B80-\u0BFF]/.test(taGen.plan.eventDetails.title), 'Tamil Unicode title preserved');

  // Hindi generation test
  const hiGen = await generateEventPlan({
    title: "उदयपुर पैलेस विवाह",
    eventType: "wedding",
    guestCount: 150,
    totalBudget: 1800000,
    currency: "INR",
    language: "hi"
  }, { forceMock: true });

  assert(hiGen.success === true, 'Hindi event plan generation succeeded');
  assert(hiGen.plan.eventDetails.language === 'hi', 'Hindi language preserved in plan');
  assert(/[\u0900-\u097F]/.test(hiGen.plan.eventDetails.title), 'Devanagari Unicode title preserved');

  console.log('\n🎉 ALL STEP 3 INVARIANT & SCHEMA CHECKS PASSED WITH 100% ACCURACY!\n');
}

testGeneration();
