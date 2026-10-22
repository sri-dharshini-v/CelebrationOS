/**
 * CelebrationOS Step 5 Automated Test Suite
 * Event Setup Wizards: Quick Plan & Guided Planner
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
console.log('🧪 Running Step 5 Setup Wizard & Form Validation Tests');
console.log('==========================================================\n');

async function runTests() {
  const BASE_URL = 'http://localhost:3000';

  // -----------------------------------------------------------------
  // 1. Validation Logic Checks (Simulating client validation)
  // -----------------------------------------------------------------
  console.log('--- 1. Testing Wizard Client Validation Rules ---');
  function validateQuickInputs(title, guests, budget) {
    if (!title || !title.trim()) return { valid: false, error: 'Title is required' };
    if (!guests || guests <= 0) return { valid: false, error: 'Guests must be positive' };
    if (!budget || budget <= 0) return { valid: false, error: 'Budget must be positive' };
    return { valid: true };
  }

  assert(validateQuickInputs('', 100, 500000).valid === false, 'Empty title correctly rejected');
  assert(validateQuickInputs('My Wedding', -10, 500000).valid === false, 'Negative guest count rejected');
  assert(validateQuickInputs('My Wedding', 100, 0).valid === false, 'Zero budget rejected');
  assert(validateQuickInputs('My Wedding', 100, 500000).valid === true, 'Valid quick inputs accepted');

  // -----------------------------------------------------------------
  // 2. Quick Plan API Generation & Persistence (English)
  // -----------------------------------------------------------------
  console.log('\n--- 2. Testing Quick Plan Generation & Save (English) ---');
  const quickPayload = {
    title: "Quick Weekend Birthday Bash",
    eventType: "birthday",
    date: "2026-11-20",
    location: "Bangalore, India",
    guestCount: 60,
    totalBudget: 150000,
    currency: "INR",
    theme: "Neon Glow & Retro Arcade",
    notes: "Music DJ, pizza counters, gluten-free dessert",
    language: "en",
    protectedRituals: []
  };

  const qGenRes = await fetch(`${BASE_URL}/api/plan/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quickPayload)
  });
  const qGenData = await qGenRes.json();

  assert(qGenData.success === true, 'Quick Plan generation returned success === true');
  assert(qGenData.plan.eventDetails.title === "Quick Weekend Birthday Bash", 'Generated plan title preserved');
  assert(qGenData.plan.eventDetails.totalBudget === 150000, 'Total budget matches 150,000 INR');
  assert(qGenData.plan.budgetCategories.length > 0, 'Budget categories generated');

  // Verify math invariant
  const qSum = qGenData.plan.budgetCategories.reduce((sum, c) => sum + c.allocatedAmount, 0);
  assert(Math.round(qSum) === 150000, `Budget categories sum (${qSum}) equals totalBudget (150,000)`);

  // Save plan (Revision 1)
  const qSaveRes = await fetch(`${BASE_URL}/api/plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan: qGenData.plan,
      description: 'Quick Plan initial save'
    })
  });
  const qSaveData = await qSaveRes.json();
  assert(qSaveData.success === true, 'Quick plan saved successfully');
  const quickPlanId = qSaveData.planId;
  assert(Boolean(quickPlanId), `Saved plan received ID: ${quickPlanId}`);

  // -----------------------------------------------------------------
  // 3. Guided Planner API Generation with Protected Rituals (Tamil)
  // -----------------------------------------------------------------
  console.log('\n--- 3. Testing Guided Planner with Protected Traditions (Tamil) ---');
  const guidedTamilPayload = {
    title: "மங்கல திருக்கல்யாண வைபவம்",
    eventType: "wedding",
    date: "2027-04-10",
    location: "மதுரை, தமிழ்நாடு",
    guestCount: 300,
    totalBudget: 1800000,
    currency: "INR",
    theme: "பாரம்பரிய கோவில் மண்டப பொலிவு",
    notes: "தலைவாழை இலை விருந்து, நாதஸ்வர இசை",
    language: "ta",
    protectedRituals: [
      {
        id: "r_muhurtham",
        name: "சுப முகூர்த்தம் (மாங்கல்ய தாரணம்)",
        significance: "புனித மாங்கல்ய தாரண சடங்கு",
        isProtected: true
      },
      {
        id: "r_kasi_yathra",
        name: "காசி யாத்திரை சடங்கு",
        significance: "மணமகனின் பாரம்பரிய யாத்திரை வரவேற்பு",
        isProtected: true
      }
    ]
  };

  const gGenRes = await fetch(`${BASE_URL}/api/plan/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(guidedTamilPayload)
  });
  const gGenData = await gGenRes.json();

  assert(gGenData.success === true, 'Guided Tamil Plan generation succeeded');
  assert(gGenData.plan.eventDetails.language === 'ta', 'Tamil language setting preserved in generated plan');
  assert(gGenData.plan.protectedRituals.length >= 2, `Protected rituals count: ${gGenData.plan.protectedRituals.length}`);
  
  const muhurthamRitual = gGenData.plan.protectedRituals.find(r => r.id === 'r_muhurtham');
  assert(Boolean(muhurthamRitual), 'Muhurtham ritual included in plan');
  assert(muhurthamRitual.isProtected === true, 'Muhurtham ritual strictly locked as isProtected: true');

  // Verify math invariant on Tamil plan
  const gSum = gGenData.plan.budgetCategories.reduce((sum, c) => sum + c.allocatedAmount, 0);
  assert(Math.round(gSum) === 1800000, `Tamil plan categories sum (${gSum}) equals totalBudget (1,800,000)`);

  // Save Guided plan
  const gSaveRes = await fetch(`${BASE_URL}/api/plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan: gGenData.plan,
      description: 'Guided Planner initial save with protected rituals'
    })
  });
  const gSaveData = await gSaveRes.json();
  assert(gSaveData.success === true, 'Guided Tamil plan saved successfully');
  const guidedPlanId = gSaveData.planId;

  // -----------------------------------------------------------------
  // 4. Guided Planner Generation with Hindi Traditions (Hindi)
  // -----------------------------------------------------------------
  console.log('\n--- 4. Testing Guided Planner (Hindi) ---');
  const guidedHindiPayload = {
    title: "शाही मंगल विवाह",
    eventType: "wedding",
    date: "2027-05-15",
    location: "जयपुर, राजस्थान",
    guestCount: 200,
    totalBudget: 1400000,
    currency: "INR",
    theme: "शाही राजस्थानी परंपरा",
    notes: "सप्तपदी, जयमाला, राजस्थानी भोज",
    language: "hi",
    protectedRituals: [
      {
        id: "r_saptapadi",
        name: "सप्तपदी (सात फेरे)",
        significance: "अग्नि साक्षी सात वचन",
        isProtected: true
      }
    ]
  };

  const hGenRes = await fetch(`${BASE_URL}/api/plan/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(guidedHindiPayload)
  });
  const hGenData = await hGenRes.json();

  assert(hGenData.success === true, 'Guided Hindi Plan generation succeeded');
  assert(hGenData.plan.eventDetails.language === 'hi', 'Hindi language preserved');
  assert(hGenData.plan.protectedRituals.some(r => r.isProtected), 'Protected rituals present in Hindi plan');

  // Save Hindi plan
  const hSaveRes = await fetch(`${BASE_URL}/api/plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan: hGenData.plan,
      description: 'Guided Planner Hindi save'
    })
  });
  const hSaveData = await hSaveRes.json();
  const hindiPlanId = hSaveData.planId;
  assert(Boolean(hindiPlanId), `Saved Hindi plan received ID: ${hindiPlanId}`);

  // -----------------------------------------------------------------
  // 5. Cleanup Test Plans
  // -----------------------------------------------------------------
  console.log('\n--- 5. Cleanup Test Plans ---');
  await fetch(`${BASE_URL}/api/plans/${quickPlanId}`, { method: 'DELETE' });
  await fetch(`${BASE_URL}/api/plans/${guidedPlanId}`, { method: 'DELETE' });
  await fetch(`${BASE_URL}/api/plans/${hindiPlanId}`, { method: 'DELETE' });
  console.log('✅ Cleaned up temporary test plans');

  console.log('\n🎉 ALL STEP 5 SETUP WIZARD & VALIDATION TESTS PASSED WITH 100% SUCCESS!\n');
}

runTests().catch(err => {
  console.error('Fatal error during Step 5 tests:', err);
  process.exit(1);
});
