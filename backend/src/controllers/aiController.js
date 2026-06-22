const aiService = require('../services/aiService');
const recordModel = require('../models/recordModel');

// POST /ai/summarize - summarizes the logged-in user's own records (no body needed,
// but accepts optional { type } to scope the summary to one record type).
async function summarize(req, res, next) {
  try {
    const { type } = req.body || {};
    const records = await recordModel.getAllForUser(req.user.id, { type });
    const result = await aiService.summarizeRecords(records);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// POST /ai/organize - body: { text }
async function organize(req, res, next) {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });
    const result = await aiService.organizeRecord(text);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// POST /ai/explain - body: { text }
async function explain(req, res, next) {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });
    const result = await aiService.explainMedicalText(text);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { summarize, organize, explain };
