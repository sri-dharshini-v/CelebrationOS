/**
 * CelebrationOS Local Persistence Engine
 *
 * Storage Strategy:
 * - JSON file-based storage in data/plans/{id}.json
 * - Each document stores the active plan and revision history snapshots.
 *
 * Production Note:
 * For stateless deployment such as Google Cloud Run, replace local file
 * operations with persistent storage such as Google Cloud Storage or Firestore.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateAndNormalizePlan } from './invariants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const DATA_DIR = path.join(rootDir, 'data', 'plans');

// Ensure storage directory exists.
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getPlanFilePath(planId) {
  if (typeof planId !== 'string' || !planId.trim()) {
    throw new Error('A valid plan ID is required.');
  }

  // Prevent directory traversal.
  const sanitized = planId.replace(/[^a-zA-Z0-9_-]/g, '');

  if (!sanitized || sanitized !== planId) {
    throw new Error('Invalid plan ID.');
  }

  return path.join(DATA_DIR, `${sanitized}.json`);
}

function writePlanDocument(doc) {
  const filePath = getPlanFilePath(doc.id);
  const temporaryPath = `${filePath}.tmp`;

  try {
    fs.writeFileSync(
      temporaryPath,
      JSON.stringify(doc, null, 2),
      'utf-8'
    );

    // Replace the saved document only after the temporary file is written.
    fs.renameSync(temporaryPath, filePath);
  } catch (error) {
    if (fs.existsSync(temporaryPath)) {
      fs.unlinkSync(temporaryPath);
    }
    throw error;
  }
}

/**
 * Lists all saved plans with summary metadata.
 */
export function listPlans() {
  if (!fs.existsSync(DATA_DIR)) return [];

  const files = fs.readdirSync(DATA_DIR).filter(file => file.endsWith('.json'));
  const plans = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(
        path.join(DATA_DIR, file),
        'utf-8'
      );
      const doc = JSON.parse(content);

      plans.push({
        id: doc.id,
        title: doc.activePlan?.eventDetails?.title || 'Untitled Event',
        eventType: doc.activePlan?.eventDetails?.eventType || 'other',
        date: doc.activePlan?.eventDetails?.date || '',
        location: doc.activePlan?.eventDetails?.location || '',
        totalBudget: doc.activePlan?.eventDetails?.totalBudget || 0,
        currency: doc.activePlan?.eventDetails?.currency || 'INR',
        language: doc.activePlan?.eventDetails?.language || 'en',
        currentRevision: doc.currentRevision || 1,
        historyTracking: doc.historyTracking !== false,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        historyCount: Array.isArray(doc.history) ? doc.history.length : 0
      });
    } catch (err) {
      console.warn(
        `[Storage] Skipping corrupt plan file ${file}:`,
        err.message
      );
    }
  }

  return plans.sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );
}

/**
 * Retrieves a plan document by ID.
 */
export function getPlan(planId) {
  const filePath = getPlanFilePath(planId);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * Saves a brand-new plan (Revision 1).
 */
export function saveNewPlan(planData, description = 'Initial plan creation') {
  const validation = validateAndNormalizePlan(planData);

  if (!validation.isValid) {
    throw new Error(
      `Plan validation failed: ${
        [...validation.errors, ...validation.violations].join(', ')
      }`
    );
  }

  const now = new Date().toISOString();
  const planId =
    `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const normalized = validation.normalizedPlan;

  const doc = {
    id: planId,
    createdAt: now,
    updatedAt: now,
    currentRevision: 1,
    historyTracking: true,
    activePlan: normalized,
    history: [
      {
        revision: 1,
        timestamp: now,
        description,
        planSnapshot: JSON.parse(JSON.stringify(normalized))
      }
    ]
  };

  writePlanDocument(doc);
  return doc;
}

/**
 * Updates an existing plan and records a snapshot when history tracking is on.
 */
export function updatePlan(
  planId,
  updatedPlanData,
  description = 'Plan updated'
) {
  const existingDoc = getPlan(planId);

  if (!existingDoc) {
    throw new Error(`Plan not found: ${planId}`);
  }

  const validation = validateAndNormalizePlan(updatedPlanData, {
    baselinePlan: existingDoc.activePlan,
    autoReconcile: true
  });

  if (!validation.isValid) {
    throw new Error(
      `Update rejected by invariants: ${
        [...validation.errors, ...validation.violations].join(', ')
      }`
    );
  }

  const now = new Date().toISOString();
  const newRevisionNumber = existingDoc.currentRevision + 1;
  const normalized = validation.normalizedPlan;

  existingDoc.updatedAt = now;
  existingDoc.currentRevision = newRevisionNumber;
  existingDoc.activePlan = normalized;

  if (!Array.isArray(existingDoc.history)) {
    existingDoc.history = [];
  }

  existingDoc.historyTracking = existingDoc.historyTracking !== false;
  if (existingDoc.historyTracking) {
    existingDoc.history.push({
      revision: newRevisionNumber,
      timestamp: now,
      description,
      planSnapshot: JSON.parse(JSON.stringify(normalized))
    });
  }

  writePlanDocument(existingDoc);

  return {
    doc: existingDoc,
    warnings: validation.warnings
  };
}

/**
 * Enables or disables history snapshots for a saved plan.
 * Re-enabling tracking checkpoints the active plan if its revision is missing.
 */
export function setHistoryTracking(planId, enabled) {
  if (typeof enabled !== 'boolean') {
    throw new Error('History tracking must be enabled or disabled explicitly.');
  }

  const existingDoc = getPlan(planId);
  if (!existingDoc) {
    throw new Error(`Plan not found: ${planId}`);
  }

  if (!Number.isSafeInteger(existingDoc.currentRevision) || existingDoc.currentRevision < 1) {
    throw new Error('The current active revision is invalid.');
  }

  if (!Array.isArray(existingDoc.history)) {
    existingDoc.history = [];
  }

  const now = new Date().toISOString();
  if (
    enabled &&
    !existingDoc.history.some(entry => entry.revision === existingDoc.currentRevision)
  ) {
    existingDoc.history.push({
      revision: existingDoc.currentRevision,
      timestamp: now,
      description: 'History tracking re-enabled; active plan checkpoint',
      planSnapshot: JSON.parse(JSON.stringify(existingDoc.activePlan))
    });
  }

  existingDoc.historyTracking = enabled;
  existingDoc.updatedAt = now;
  writePlanDocument(existingDoc);

  return existingDoc;
}

/**
 * Deletes selected historical revisions only.
 *
 * Safety rules:
 * - Explicit confirmation is required.
 * - The active revision cannot be deleted.
 * - Every selected revision must exist before deletion begins.
 * - Duplicate or invalid revision numbers are rejected.
 * - The plan and active plan are never deleted by this function.
 */
export function deleteSelectedRevisions(
  planId,
  revisionsToDelete,
  confirmed = false
) {
  if (confirmed !== true) {
    throw new Error(
      'Confirmation is required to delete historical revisions.'
    );
  }

  if (
    !Array.isArray(revisionsToDelete) ||
    revisionsToDelete.length === 0
  ) {
    throw new Error('Select at least one historical revision to delete.');
  }

  const existingDoc = getPlan(planId);

  if (!existingDoc) {
    throw new Error(`Plan not found: ${planId}`);
  }

  if (!Array.isArray(existingDoc.history)) {
    throw new Error('Plan history is missing or invalid.');
  }

  if (!Number.isSafeInteger(existingDoc.currentRevision)) {
    throw new Error('The current active revision is invalid.');
  }

  // Do not silently convert strings or other values into revision numbers.
  if (
    revisionsToDelete.some(
      revision =>
        !Number.isSafeInteger(revision) || revision < 1
    )
  ) {
    throw new Error('Invalid revision number selected.');
  }

  const selectedRevisions = [...revisionsToDelete];

  if (new Set(selectedRevisions).size !== selectedRevisions.length) {
    throw new Error('Duplicate revision numbers selected.');
  }

  // Validate the entire selection before modifying history.
  for (const revision of selectedRevisions) {
    if (revision === existingDoc.currentRevision) {
      throw new Error('The active revision cannot be deleted.');
    }

    const matchingEntries = existingDoc.history.filter(
      entry => entry.revision === revision
    );

    if (matchingEntries.length !== 1) {
      throw new Error(
        `Revision ${revision} does not exist uniquely in history.`
      );
    }
  }

  const updatedHistory = existingDoc.history.filter(
    entry => !selectedRevisions.includes(entry.revision)
  );

  // Persist only after all validation succeeds.
  const updatedDoc = {
    ...existingDoc,
    updatedAt: new Date().toISOString(),
    history: updatedHistory
  };

  writePlanDocument(updatedDoc);

  return {
    success: true,
    deletedRevisions: selectedRevisions,
    doc: updatedDoc
  };
}

/**
 * Deletes an entire plan by ID.
 * This is separate from historical revision deletion.
 */
export function deletePlan(planId) {
  const filePath = getPlanFilePath(planId);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }

  return false;
}