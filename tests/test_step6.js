/**
 * CelebrationOS Step 6 Automated Test Suite
 * AI Plan Generation & Section Renderers:
 * - Budget Visualizer logic
 * - Timeline & Task Checklist interactions
 * - Cultural Rituals preservation
 * - Vendor Recommendations (Venue, Catering, Decor)
 * - Saved Plan loading and full details view
 */

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('==========================================================');
console.log('🧪 Running Step 6 AI Plan Generation & Section Renderers Tests');
console.log('==========================================================\n');

async function runTests() {
  const BASE_URL = 'http://localhost:3000';

  // -----------------------------------------------------------------
  // 1. Generate and Save a Comprehensive Event Plan
  // -----------------------------------------------------------------
  console.log('--- 1. Generating & Persisting Full Plan for Renderers ---');
  const planPayload = {
    title: "Ananya & Rahul Royal Heritage Wedding",
    eventType: "wedding",
    date: "2027-02-14",
    location: "Chennai, Tamil Nadu",
    guestCount: 250,
    totalBudget: 1500000,
    currency: "INR",
    theme: "Royal Chettinad & Jasmine Florals",
    notes: "Traditional banana leaf feast, morning nadaswaram, auspicious lagna",
    language: "en",
    protectedRituals: [
      {
        id: "r_muhurtham",
        name: "Muhurtham (Auspicious Tying of Mangalsutra)",
        significance: "Sacred core Vedic ritual",
        isProtected: true
      }
    ]
  };

  const genRes = await fetch(`${BASE_URL}/api/plan/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(planPayload)
  });
  const genData = await genRes.json();
  assert(genData.success === true, 'Plan generated successfully');

  // Persist plan
  const saveRes = await fetch(`${BASE_URL}/api/plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan: genData.plan,
      description: 'Step 6 Test Plan Initial Creation'
    })
  });
  const saveData = await saveRes.json();
  assert(saveData.success === true, 'Plan saved to storage');
  const planId = saveData.planId;
  assert(Boolean(planId), `Saved plan received ID: ${planId}`);

  // -----------------------------------------------------------------
  // 2. Test Budget Visualizer Calculation Logic
  // -----------------------------------------------------------------
  console.log('\n--- 2. Testing Budget Visualizer & Category Percentage Logic ---');
  const savedDoc = saveData.doc;
  const plan = savedDoc.activePlan;
  const totalBudget = plan.eventDetails.totalBudget;

  let totalPercentage = 0;
  let totalAllocated = 0;
  let paidFrozenItemsCount = 0;

  plan.budgetCategories.forEach(cat => {
    assert(typeof cat.allocatedAmount === 'number' && cat.allocatedAmount >= 0, `Category ${cat.name} allocatedAmount is valid`);
    assert(typeof cat.percentage === 'number', `Category ${cat.name} percentage is valid`);
    totalAllocated += cat.allocatedAmount;
    totalPercentage += cat.percentage;

    (cat.items || []).forEach(item => {
      if (item.status === 'paid' || item.isFrozen) {
        paidFrozenItemsCount++;
      }
    });
  });

  assert(Math.round(totalAllocated) === totalBudget, `Total allocated (${totalAllocated}) matches totalBudget (${totalBudget})`);
  assert(Math.round(totalPercentage) >= 99 && Math.round(totalPercentage) <= 101, `Category percentages sum to ~100% (${totalPercentage.toFixed(1)}%)`);
  assert(paidFrozenItemsCount > 0, `Found ${paidFrozenItemsCount} frozen/paid commitment items`);

  // -----------------------------------------------------------------
  // 3. Test Timeline & Task Checklist Interactions
  // -----------------------------------------------------------------
  console.log('\n--- 3. Testing Milestone Timeline & Task Checklist Interactions ---');
  assert(Array.isArray(plan.milestones) && plan.milestones.length > 0, 'Milestones array is populated');
  
  const firstMilestone = plan.milestones[0];
  assert(Array.isArray(firstMilestone.tasks) && firstMilestone.tasks.length > 0, 'First milestone contains tasks');

  // Pick an uncompleted task to toggle
  let targetTask = null;
  for (const m of plan.milestones) {
    const found = m.tasks.find(t => t.status !== 'completed');
    if (found) { targetTask = found; break; }
  }

  assert(Boolean(targetTask), `Found uncompleted task to toggle: ${targetTask?.title}`);
  const originalStatus = targetTask.status;

  // Simulate user ticking task checkbox to completed
  targetTask.status = 'completed';
  targetTask.isFrozen = true;

  // Send update to server persistence (creates Revision 2)
  const updateRes = await fetch(`${BASE_URL}/api/plans/${planId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan,
      description: `Task '${targetTask.title}' marked completed in checklist`
    })
  });
  const updateData = await updateRes.json();
  assert(updateData.success === true, 'Task completion update persisted successfully');
  assert(updateData.doc.currentRevision === 2, 'Plan revision incremented to 2 after task completion');

  // Verify task status when retrieved from storage
  const getRes = await fetch(`${BASE_URL}/api/plans/${planId}`);
  const getData = await getRes.json();
  const reloadedTask = getData.doc.activePlan.milestones.flatMap(m => m.tasks).find(t => t.id === targetTask.id);
  assert(reloadedTask.status === 'completed', 'Task is saved as COMPLETED in backend persistence');
  assert(reloadedTask.isFrozen === true, 'Completed task is frozen against accidental loss');

  // -----------------------------------------------------------------
  // 4. Test Cultural Rituals Preservation
  // -----------------------------------------------------------------
  console.log('\n--- 4. Testing Cultural Rituals Renderer Data ---');
  assert(Array.isArray(plan.protectedRituals) && plan.protectedRituals.length > 0, 'Protected rituals array is populated');
  const muhurtham = plan.protectedRituals.find(r => r.id === 'r_muhurtham');
  assert(Boolean(muhurtham), 'Muhurtham ritual is present');
  assert(muhurtham.isProtected === true, 'Muhurtham ritual has isProtected === true');
  assert(Boolean(muhurtham.significance), 'Muhurtham ritual includes cultural significance notes');

  // -----------------------------------------------------------------
  // 5. Test AI Recommendations (Venue, Catering, Decor)
  // -----------------------------------------------------------------
  console.log('\n--- 5. Testing Venue, Catering & Decor Recommendations Data ---');
  const recs = plan.recommendations;
  assert(Boolean(recs), 'Recommendations object is present');
  assert(Array.isArray(recs.venues) && recs.venues.length > 0, 'Venue recommendations present');
  assert(recs.venues[0].capacity > 0, 'Venue recommendation has guest capacity');
  assert(Array.isArray(recs.venues[0].keyQuestions) && recs.venues[0].keyQuestions.length > 0, 'Venue has key questions list');

  assert(Array.isArray(recs.catering) && recs.catering.length > 0, 'Catering recommendations present');
  assert(recs.catering[0].estimatedCostPerGuest > 0, 'Catering has estimatedCostPerGuest');
  assert(Array.isArray(recs.catering[0].signatureItems) && recs.catering[0].signatureItems.length > 0, 'Catering signature items present');

  assert(Array.isArray(recs.decor) && recs.decor.length > 0, 'Decor recommendations present');
  assert(Array.isArray(recs.decor[0].colorPalette) && recs.decor[0].colorPalette.length > 0, 'Decor color palette present');
  assert(Boolean(recs.decor[0].colorPalette[0].hex), 'Color palette includes valid HEX code');

  // -----------------------------------------------------------------
  // 6. Test Saved Plans Library & Loading
  // -----------------------------------------------------------------
  console.log('\n--- 6. Testing Saved Plans Library & Loading ---');
  const listRes = await fetch(`${BASE_URL}/api/plans`);
  const listData = await listRes.json();
  assert(listData.success === true, 'GET /api/plans returned success');
  const targetItem = listData.plans.find(p => p.id === planId);
  assert(Boolean(targetItem), 'Saved plan appears in plans list');
  assert(targetItem.currentRevision === 2, 'Plan summary reflects current revision 2');

  // -----------------------------------------------------------------
  // 7. Cleanup Test Plan
  // -----------------------------------------------------------------
  console.log('\n--- 7. Cleanup Test Plan ---');
  const delRes = await fetch(`${BASE_URL}/api/plans/${planId}`, { method: 'DELETE' });
  const delData = await delRes.json();
  assert(delData.success === true, 'Test plan deleted cleanly');

  console.log('\n🎉 ALL STEP 6 AI PLAN GENERATION & SECTION RENDERER TESTS PASSED WITH 100% SUCCESS!\n');
}

runTests().catch(err => {
  console.error('Fatal error during Step 6 tests:', err);
  process.exit(1);
});
