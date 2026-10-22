import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateAndNormalizePlan } from './invariants.js';
import { generateEventPlan } from './gemini.js';
import {
  listPlans,
  getPlan,
  saveNewPlan,
  updatePlan,
  deletePlan,
  deleteSelectedRevisions,
  setHistoryTracking
} from './storage.js';
import { executeSafeUndo } from './historyEngine.js';
import { applyPlanShock } from './shockEngine.js';

// Load environment variables from .env if present
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON bodies
app.use(express.json());

// Serve static frontend assets from public/ folder
app.use(express.static(path.join(rootDir, 'public')));

// Minimal Server Health-Check Endpoint
app.get('/api/health', (req, res) => {
  const isKeyConfigured = Boolean(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY.trim() !== '' &&
    process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'
  );

  res.json({
    status: 'ok',
    app: 'CelebrationOS',
    version: '1.0.0',
    geminiConfigured: isKeyConfigured,
    timestamp: new Date().toISOString()
  });
});

// Deterministic Plan Validation Endpoint
app.post('/api/plan/validate', (req, res) => {
  try {
    const { plan, baselinePlan, autoReconcile = true } = req.body;

    if (!plan) {
      return res.status(400).json({
        isValid: false,
        errors: ['No plan provided in request body']
      });
    }

    const result = validateAndNormalizePlan(plan, {
      baselinePlan,
      autoReconcile
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      isValid: false,
      errors: [error.message]
    });
  }
});

// Event Plan Generation Endpoint
app.post('/api/plan/generate', async (req, res) => {
  try {
    const eventRequest = req.body || {};

    const result = await generateEventPlan(eventRequest, {
      baselinePlan: req.body.baselinePlan || null,
      forceMock: req.body.forceMock || false
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      errors: [error.message]
    });
  }
});

// ------------------------------------------------------------
// Plan Persistence & Version History Endpoints
// ------------------------------------------------------------

// List all saved plans
app.get('/api/plans', (req, res) => {
  try {
    const plans = listPlans();
    res.json({
      success: true,
      count: plans.length,
      plans
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Save a brand-new plan (Revision 1)
app.post('/api/plans', (req, res) => {
  try {
    const { plan, description } = req.body;

    if (!plan) {
      return res.status(400).json({
        success: false,
        error: 'Missing plan object in request body'
      });
    }

    const doc = saveNewPlan(
      plan,
      description || 'Initial plan created'
    );

    res.status(201).json({
      success: true,
      planId: doc.id,
      doc
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// Get a specific plan and its full revision history
app.get('/api/plans/:id', (req, res) => {
  try {
    const doc = getPlan(req.params.id);

    if (!doc) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    res.json({ success: true, doc });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Enable or disable historical snapshots for a saved plan.
app.patch('/api/plans/:id/history-tracking', (req, res) => {
  if (!/^[a-zA-Z0-9_-]+$/.test(req.params.id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid plan ID.'
    });
  }

  const { enabled } = req.body || {};
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({
      success: false,
      error: 'History tracking must be enabled or disabled explicitly.'
    });
  }

  try {
    const doc = setHistoryTracking(req.params.id, enabled);
    res.json({
      success: true,
      message: `History tracking ${enabled ? 'enabled' : 'disabled'}.`,
      doc
    });
  } catch (err) {
    const status = /not found/i.test(err.message) ? 404 : 400;
    res.status(status).json({
      success: false,
      error: err.message
    });
  }
});

// Update an existing plan (creates the next revision)
app.put('/api/plans/:id', (req, res) => {
  try {
    const { plan, description } = req.body;

    if (!plan) {
      return res.status(400).json({
        success: false,
        error: 'Missing plan object in request body'
      });
    }

    const result = updatePlan(
      req.params.id,
      plan,
      description || 'Plan updated'
    );

    res.json({
      success: true,
      doc: result.doc,
      warnings: result.warnings
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// Apply a budget and/or event-date shock while preserving protected commitments.
app.post('/api/plans/:id/shock', (req, res) => {
  try {
    const doc = getPlan(req.params.id);
    if (!doc) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    const shock = applyPlanShock(doc.activePlan, req.body || {});
    const result = updatePlan(
      req.params.id,
      shock.plan,
      'Shock Engine applied'
    );

    res.json({
      success: true,
      doc: result.doc,
      warnings: [...shock.warnings, ...result.warnings],
      shock: {
        budgetChanged: shock.budgetChanged,
        dateChanged: shock.dateChanged,
        shiftedTaskDates: shock.shiftedTaskDates,
        preservedTaskDates: shock.preservedTaskDates,
        unchangedRelativeTaskDates: shock.unchangedRelativeTaskDates
      }
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// Safe Undo: restores a previous revision while preserving commitments
app.post('/api/plans/:id/undo', (req, res) => {
  try {
    const targetRevision = req.body?.targetRevision;

    if (
      targetRevision === undefined ||
      targetRevision === null ||
      !Number.isSafeInteger(Number(targetRevision)) ||
      Number(targetRevision) < 1
    ) {
      return res.status(400).json({
        success: false,
        error: 'A valid targetRevision is required'
      });
    }

    const result = executeSafeUndo(
      req.params.id,
      Number(targetRevision)
    );

    res.json(result);
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// Selectively delete chosen historical revisions.
// Request body: { "revisions": [1, 2], "confirmed": true }
app.delete('/api/plans/:id/history', (req, res) => {
  try {
    const { revisions, confirmed } = req.body || {};

    if (confirmed !== true) {
      return res.status(400).json({
        success: false,
        error: 'Deletion was not confirmed. No revisions were deleted.'
      });
    }

    if (!Array.isArray(revisions) || revisions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Select at least one historical revision to delete.'
      });
    }

    const result = deleteSelectedRevisions(
      req.params.id,
      revisions,
      confirmed
    );

    res.json({
      success: true,
      message: 'Selected historical revisions deleted successfully.',
      deletedRevisions: result.deletedRevisions,
      doc: result.doc
    });
  } catch (err) {
    const message = err.message || 'Unable to delete selected revisions.';
    const status = /not found/i.test(message) ? 404 : 400;

    res.status(status).json({
      success: false,
      error: message
    });
  }
});

// Delete an entire plan (kept separate from revision deletion)
app.delete('/api/plans/:id', (req, res) => {
  try {
    const deleted = deletePlan(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    res.json({
      success: true,
      message: 'Plan deleted successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Start listening
app.listen(PORT, () => {
  console.log('\n==================================================');
  console.log('🎉 CelebrationOS Server is online!');
  console.log(`📍 Web Interface: http://localhost:${PORT}`);
  console.log(`🩺 Health API:    http://localhost:${PORT}/api/health`);
  console.log(
    `🔐 Gemini Key:    ${
      process.env.GEMINI_API_KEY
        ? 'Configured (Server-Side Only)'
        : 'Not set (mock/fallback mode)'
    }`
  );
  console.log('==================================================\n');
});