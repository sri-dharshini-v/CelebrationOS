/**
 * CelebrationOS Backend Invariant & Validation Engine
 * 
 * CORE PRINCIPLE:
 * The code, NOT the LLM, must enforce mathematical consistency,
 * frozen paid commitments, and protected traditional rituals.
 */

/**
 * Rounds a number to two decimal places
 */
export function round2(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

export function isValidMoneyAmount(value) {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    Number.isSafeInteger(Math.round(value * 100));
}

export function isValidEventDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === value;
}

/**
 * Validates the basic schema structure of an event plan
 */
export function validatePlanStructure(plan) {
  const errors = [];

  if (!plan || typeof plan !== 'object') {
    return { isValid: false, errors: ['Plan must be a valid non-empty object'] };
  }

  // 1. Check eventDetails
  if (!plan.eventDetails || typeof plan.eventDetails !== 'object') {
    errors.push('Missing or invalid eventDetails object');
  } else {
    const {
      title,
      eventType,
      date,
      guestCount,
      totalBudget,
      currency,
      language
    } = plan.eventDetails;
    if (!title || typeof title !== 'string') errors.push('eventDetails.title is required');
    if (!eventType || typeof eventType !== 'string') errors.push('eventDetails.eventType is required');
    if (!isValidEventDate(date)) {
      errors.push('eventDetails.date must be a valid calendar date in YYYY-MM-DD format');
    }
    if (typeof guestCount !== 'number' || !Number.isFinite(guestCount) || guestCount <= 0) {
      errors.push('eventDetails.guestCount must be a positive finite number');
    }
    if (
      !isValidMoneyAmount(totalBudget) ||
      totalBudget <= 0 ||
      round2(totalBudget) <= 0
    ) {
      errors.push('eventDetails.totalBudget must be a positive finite amount');
    }
    if (!currency || typeof currency !== 'string') errors.push('eventDetails.currency is required');
    if (!language || typeof language !== 'string') errors.push('eventDetails.language is required');
  }

  // 2. Check budgetCategories
  if (!Array.isArray(plan.budgetCategories) || plan.budgetCategories.length === 0) {
    errors.push('plan.budgetCategories must be a non-empty array');
  } else {
    plan.budgetCategories.forEach((cat, idx) => {
      if (!cat || typeof cat !== 'object' || Array.isArray(cat)) {
        errors.push(`budgetCategories[${idx}] must be an object`);
        return;
      }

      if (!cat.id || !cat.name) errors.push(`budgetCategories[${idx}] missing id or name`);
      if (!isValidMoneyAmount(cat.allocatedAmount)) {
        errors.push(`budgetCategories[${idx}].allocatedAmount must be a non-negative finite amount`);
      }
      if (!Array.isArray(cat.items)) {
        errors.push(`budgetCategories[${idx}].items must be an array`);
      } else {
        cat.items.forEach((item, itemIdx) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) {
            errors.push(`budgetCategories[${idx}].items[${itemIdx}] must be an object`);
          } else if (!isValidMoneyAmount(item.estimatedCost)) {
            errors.push(`budgetCategories[${idx}].items[${itemIdx}].estimatedCost must be a non-negative finite amount`);
          }
        });
      }
    });
  }

  // 3. Check milestones
  if (!Array.isArray(plan.milestones)) {
    errors.push('plan.milestones must be an array');
  }

  // 4. Check protectedRituals
  if (!Array.isArray(plan.protectedRituals)) {
    errors.push('plan.protectedRituals must be an array');
  }

  // 5. Check recommendations
  if (!plan.recommendations || typeof plan.recommendations !== 'object') {
    errors.push('plan.recommendations must be an object with venues, catering, and decor');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates and deterministically reconciles budget mathematics
 * Sum of categories must equal eventDetails.totalBudget exactly
 */
export function validateAndNormalizeBudget(plan, options = { autoReconcile: true }) {
  const errors = [];
  const warnings = [];

  if (
    !plan?.eventDetails ||
    !isValidMoneyAmount(plan.eventDetails.totalBudget) ||
    round2(plan.eventDetails.totalBudget) <= 0
  ) {
    return {
      isValid: false,
      normalizedCategories: [],
      errors: ['eventDetails.totalBudget must be a positive finite amount'],
      warnings
    };
  }

  if (!Array.isArray(plan.budgetCategories) || plan.budgetCategories.length === 0) {
    return {
      isValid: false,
      normalizedCategories: [],
      errors: ['plan.budgetCategories must be a non-empty array'],
      warnings
    };
  }

  const hasInvalidCategory = plan.budgetCategories.some(cat =>
    !cat ||
    typeof cat !== 'object' ||
    !isValidMoneyAmount(cat.allocatedAmount)
  );
  if (hasInvalidCategory) {
    return {
      isValid: false,
      normalizedCategories: [],
      errors: ['Budget category allocations must be non-negative finite amounts'],
      warnings
    };
  }

  const totalBudget = round2(plan.eventDetails.totalBudget);
  let currentSum = 0;

  // Clone categories to avoid mutating input directly
  const categories = plan.budgetCategories.map(cat => ({
    ...cat,
    allocatedAmount: round2(cat.allocatedAmount),
    items: Array.isArray(cat.items) ? cat.items.map(item => ({ ...item })) : []
  }));

  for (const cat of categories) {
    currentSum = round2(currentSum + cat.allocatedAmount);
    if (!isValidMoneyAmount(currentSum)) {
      errors.push('Budget category allocations exceed the supported precise amount range');
      return {
        isValid: false,
        normalizedCategories: categories,
        errors,
        warnings
      };
    }
  }

  const discrepancy = round2(totalBudget - currentSum);
  if (!Number.isSafeInteger(Math.round(Math.abs(discrepancy) * 100))) {
    return {
      isValid: false,
      normalizedCategories: categories,
      errors: ['Budget discrepancy exceeds the supported precise amount range'],
      warnings
    };
  }

  if (Math.abs(discrepancy) > 0.01) {
    if (!options.autoReconcile) {
      errors.push(`Budget sum mismatch: categories sum to ${currentSum}, but total budget is ${totalBudget} (difference: ${discrepancy})`);
    } else {
      const hasFrozenItems = cat =>
        Array.isArray(cat.items) &&
        cat.items.some(item => item?.isFrozen || item?.status === 'paid');
      const isContingency = cat =>
        String(cat.id || '').includes('contingency') ||
        String(cat.id || '').includes('misc') ||
        (typeof cat.name === 'string' && cat.name.toLowerCase().includes('contingency'));
      const editableCategories = categories
        .filter(cat => !hasFrozenItems(cat))
        .sort((a, b) => b.allocatedAmount - a.allocatedAmount);
      const preferredCategory = editableCategories.find(isContingency);

      if (discrepancy > 0) {
        const target = preferredCategory || editableCategories[0];
        if (!target) {
          errors.push('Budget mismatch cannot be reconciled without changing a frozen category');
        } else {
          const originalAllocated = target.allocatedAmount;
          const adjustedAmount = round2(originalAllocated + discrepancy);
          if (!isValidMoneyAmount(adjustedAmount)) {
            errors.push('Budget reconciliation exceeds the supported precise amount range');
          } else {
            target.allocatedAmount = adjustedAmount;
            warnings.push(
              `Deterministic reconciliation applied: Adjusted '${target.name}' from ${originalAllocated} to ${adjustedAmount} (reconciled delta: ${discrepancy}) to match total budget ${totalBudget}`
            );
          }
        }
      } else {
        let remaining = round2(-discrepancy);
        const targets = [
          ...(preferredCategory ? [preferredCategory] : []),
          ...editableCategories.filter(cat => cat !== preferredCategory)
        ];

        for (const target of targets) {
          if (remaining <= 0.01) break;
          if (target.allocatedAmount <= 0) continue;

          const originalAllocated = target.allocatedAmount;
          const reduction = round2(Math.min(originalAllocated, remaining));
          target.allocatedAmount = round2(originalAllocated - reduction);
          remaining = round2(remaining - reduction);
          warnings.push(
            `Deterministic reconciliation applied: Adjusted '${target.name}' from ${originalAllocated} to ${target.allocatedAmount} (reduced by ${reduction}) to match total budget ${totalBudget}`
          );
        }

        if (remaining > 0.01) {
          errors.push('Budget mismatch cannot be reconciled without making an allocation negative or changing a frozen category');
        }
      }
    }
  }

  // Recalculate percentages accurately based on totalBudget
  categories.forEach(cat => {
    cat.percentage = totalBudget > 0 ? round2((cat.allocatedAmount / totalBudget) * 100) : 0;
  });

  return {
    isValid: errors.length === 0,
    normalizedCategories: categories,
    errors,
    warnings
  };
}

/**
 * Enforces commitment freezing rules
 * Paid bookings and completed tasks must NEVER be silently changed or removed
 */
export function validateFrozenCommitments(proposedPlan, baselinePlan) {
  const violations = [];

  if (!baselinePlan) {
    return { isValid: true, violations: [] };
  }

  // 1. Check frozen/paid budget items
  const baselineFrozenItems = new Map();
  if (Array.isArray(baselinePlan.budgetCategories)) {
    baselinePlan.budgetCategories.forEach(cat => {
      if (Array.isArray(cat.items)) {
        cat.items.forEach(item => {
          if (item.isFrozen || item.status === 'paid') {
            baselineFrozenItems.set(item.id, { ...item, categoryName: cat.name });
          }
        });
      }
    });
  }

  // Find corresponding items in proposed plan
  const proposedItemsMap = new Map();
  if (Array.isArray(proposedPlan.budgetCategories)) {
    proposedPlan.budgetCategories.forEach(cat => {
      if (Array.isArray(cat.items)) {
        cat.items.forEach(item => {
          proposedItemsMap.set(item.id, item);
        });
      }
    });
  }

  baselineFrozenItems.forEach((baseItem, itemId) => {
    const proposedItem = proposedItemsMap.get(itemId);

    if (!proposedItem) {
      violations.push(
        `CRITICAL COMMITMENT VIOLATION: Paid/frozen booking '${baseItem.name}' (ID: ${itemId}, Amount: ${baseItem.estimatedCost}) was silently removed in proposed plan.`
      );
    } else {
      if (round2(proposedItem.estimatedCost) !== round2(baseItem.estimatedCost)) {
        violations.push(
          `CRITICAL COMMITMENT VIOLATION: Paid/frozen booking '${baseItem.name}' amount was altered from ${baseItem.estimatedCost} to ${proposedItem.estimatedCost}. Paid commitments are frozen and cannot be changed.`
        );
      }
      if (proposedItem.status !== baseItem.status) {
        violations.push(
          `CRITICAL COMMITMENT VIOLATION: Paid commitment '${baseItem.name}' status was altered from '${baseItem.status}' to '${proposedItem.status}'.`
        );
      }
    }
  });

  // 2. Check completed tasks
  const baselineFrozenTasks = new Map();
  if (Array.isArray(baselinePlan.milestones)) {
    baselinePlan.milestones.forEach(m => {
      if (Array.isArray(m.tasks)) {
        m.tasks.forEach(t => {
          if (t.isFrozen || t.status === 'completed') {
            baselineFrozenTasks.set(t.id, t);
          }
        });
      }
    });
  }

  const proposedTasksMap = new Map();
  if (Array.isArray(proposedPlan.milestones)) {
    proposedPlan.milestones.forEach(m => {
      if (Array.isArray(m.tasks)) {
        m.tasks.forEach(t => {
          proposedTasksMap.set(t.id, t);
        });
      }
    });
  }

  baselineFrozenTasks.forEach((baseTask, taskId) => {
    const proposedTask = proposedTasksMap.get(taskId);
    if (!proposedTask) {
      violations.push(
        `CRITICAL COMMITMENT VIOLATION: Completed task '${baseTask.title}' (ID: ${taskId}) was removed in proposed plan.`
      );
    } else if (proposedTask.status !== baseTask.status) {
      violations.push(
        `CRITICAL COMMITMENT VIOLATION: Completed task '${baseTask.title}' status was modified from '${baseTask.status}' to '${proposedTask.status}'.`
      );
    }
  });

  return {
    isValid: violations.length === 0,
    violations
  };
}

/**
 * Enforces protected ritual preservation
 * Protected rituals marked by the user must NEVER be silently removed
 */
export function validateProtectedRituals(proposedPlan, baselinePlan) {
  const violations = [];

  if (!baselinePlan || !Array.isArray(baselinePlan.protectedRituals)) {
    return { isValid: true, violations: [] };
  }

  const baselineProtected = baselinePlan.protectedRituals.filter(r => r.isProtected);
  const proposedRitualsMap = new Map(
    (proposedPlan.protectedRituals || []).map(r => [r.id, r])
  );

  baselineProtected.forEach(baseRitual => {
    const proposedRitual = proposedRitualsMap.get(baseRitual.id);

    if (!proposedRitual) {
      violations.push(
        `RITUAL PROTECTION VIOLATION: Protected traditional ritual '${baseRitual.name}' was silently dropped in proposed plan. CelebrationOS strictly forbids deleting protected traditions.`
      );
    } else if (!proposedRitual.isProtected) {
      violations.push(
        `RITUAL PROTECTION VIOLATION: Protected status was removed from traditional ritual '${baseRitual.name}'.`
      );
    }
  });

  return {
    isValid: violations.length === 0,
    violations
  };
}

/**
 * Complete Master Invariant Pipeline
 * Enforces structure, math, frozen commitments, and protected traditions
 */
export function validateAndNormalizePlan(proposedPlan, options = {}) {
  const { baselinePlan, autoReconcile = true } = options;

  // 1. Structure Check
  const structResult = validatePlanStructure(proposedPlan);
  if (!structResult.isValid) {
    return {
      isValid: false,
      normalizedPlan: null,
      errors: structResult.errors,
      warnings: [],
      violations: []
    };
  }

  // 2. Budget Math Invariant
  const budgetResult = validateAndNormalizeBudget(proposedPlan, { autoReconcile });
  if (!budgetResult.isValid) {
    return {
      isValid: false,
      normalizedPlan: null,
      errors: budgetResult.errors,
      warnings: budgetResult.warnings,
      violations: []
    };
  }

  // Construct normalized plan with reconciled categories
  const normalizedPlan = {
    ...proposedPlan,
    budgetCategories: budgetResult.normalizedCategories
  };

  // 3. Frozen Commitments Check
  const commitmentsResult = validateFrozenCommitments(normalizedPlan, baselinePlan);

  // 4. Protected Rituals Check
  const ritualsResult = validateProtectedRituals(normalizedPlan, baselinePlan);

  const allViolations = [
    ...commitmentsResult.violations,
    ...ritualsResult.violations
  ];

  return {
    isValid: allViolations.length === 0,
    normalizedPlan,
    errors: [],
    warnings: budgetResult.warnings,
    violations: allViolations
  };
}
