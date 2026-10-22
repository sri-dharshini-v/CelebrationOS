import {
  isValidEventDate,
  isValidMoneyAmount,
  round2,
  validateAndNormalizePlan
} from './invariants.js';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function shiftDate(value, dayDelta) {
  const shifted = new Date(Date.parse(`${value}T00:00:00.000Z`) + dayDelta * MILLISECONDS_PER_DAY)
    .toISOString()
    .slice(0, 10);

  if (!isValidEventDate(shifted)) {
    throw new Error('The date shift would move a task outside the supported calendar range.');
  }

  return shifted;
}

export function applyPlanShock(plan, shock = {}) {
  if (!plan || typeof plan !== 'object' || !plan.eventDetails) {
    throw new Error('A valid active plan is required.');
  }
  if (!shock || typeof shock !== 'object' || Array.isArray(shock)) {
    throw new Error('Shock settings must be an object.');
  }

  const hasBudgetTarget = Object.prototype.hasOwnProperty.call(shock, 'targetTotalBudget');
  const hasDateTarget = Object.prototype.hasOwnProperty.call(shock, 'targetEventDate');
  if (!hasBudgetTarget && !hasDateTarget) {
    throw new Error('Choose a new total budget, a new event date, or both.');
  }

  const updatedPlan = JSON.parse(JSON.stringify(plan));
  const warnings = [];
  let budgetChanged = false;
  let dateChanged = false;
  let shiftedTaskDates = 0;
  let preservedTaskDates = 0;
  let unchangedRelativeTaskDates = 0;

  if (hasBudgetTarget) {
    if (
      !isValidMoneyAmount(shock.targetTotalBudget) ||
      round2(shock.targetTotalBudget) <= 0
    ) {
      throw new Error('The target total budget must be a positive finite amount.');
    }

    const normalizedTarget = round2(shock.targetTotalBudget);
    budgetChanged = round2(plan.eventDetails.totalBudget) !== normalizedTarget;
    updatedPlan.eventDetails.totalBudget = normalizedTarget;
  }

  if (hasDateTarget) {
    if (!isValidEventDate(shock.targetEventDate)) {
      throw new Error('The target event date must be a valid calendar date in YYYY-MM-DD format.');
    }
    if (!isValidEventDate(plan.eventDetails.date)) {
      throw new Error('The current event date is invalid and cannot be shifted.');
    }

    const dayDelta = (
      Date.parse(`${shock.targetEventDate}T00:00:00.000Z`) -
      Date.parse(`${plan.eventDetails.date}T00:00:00.000Z`)
    ) / MILLISECONDS_PER_DAY;
    dateChanged = dayDelta !== 0;
    updatedPlan.eventDetails.date = shock.targetEventDate;

    if (dateChanged) {
      for (const milestone of updatedPlan.milestones || []) {
        for (const task of milestone.tasks || []) {
          if (!task.dueDate) continue;
          if (!isValidEventDate(task.dueDate)) {
            unchangedRelativeTaskDates += 1;
            continue;
          }
          if (task.status === 'completed' || task.isFrozen) {
            preservedTaskDates += 1;
            continue;
          }

          task.dueDate = shiftDate(task.dueDate, dayDelta);
          shiftedTaskDates += 1;
        }
      }
    }
  }

  if (!budgetChanged && !dateChanged) {
    throw new Error('The selected shock targets do not change the current plan.');
  }

  if (preservedTaskDates > 0) {
    warnings.push(
      `${preservedTaskDates} completed or frozen task deadline(s) were preserved during the date shift.`
    );
  }
  if (unchangedRelativeTaskDates > 0) {
    warnings.push(
      `${unchangedRelativeTaskDates} relative or non-ISO task deadline(s) were left unchanged during the date shift.`
    );
  }

  const validation = validateAndNormalizePlan(updatedPlan, {
    baselinePlan: plan,
    autoReconcile: true
  });

  if (!validation.isValid) {
    throw new Error(
      [...validation.errors, ...validation.violations].join('; ')
    );
  }

  return {
    plan: validation.normalizedPlan,
    warnings: [...validation.warnings, ...warnings],
    budgetChanged,
    dateChanged,
    shiftedTaskDates,
    preservedTaskDates,
    unchangedRelativeTaskDates
  };
}
