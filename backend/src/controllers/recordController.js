const recordModel = require('../models/recordModel');

async function addRecord(req, res, next) {
  try {
    const { type, title, description, date } = req.body;

    if (!type || !title || !date) {
      return res.status(400).json({ error: 'type, title, and date are required' });
    }
    if (!recordModel.RECORD_TYPES.includes(type)) {
      return res.status(400).json({
        error: `type must be one of: ${recordModel.RECORD_TYPES.join(', ')}`,
      });
    }

    const record = await recordModel.createRecord({
      userId: req.user.id,
      type,
      title,
      description: description || null,
      date,
    });
    res.status(201).json({ record });
  } catch (err) {
    next(err);
  }
}

async function getRecords(req, res, next) {
  try {
    const { type } = req.query;
    const records = await recordModel.getAllForUser(req.user.id, { type });
    res.json({ records });
  } catch (err) {
    next(err);
  }
}

async function getRecord(req, res, next) {
  try {
    const record = await recordModel.getOneForUser(req.user.id, req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json({ record });
  } catch (err) {
    next(err);
  }
}

async function deleteRecord(req, res, next) {
  try {
    const deleted = await recordModel.deleteForUser(req.user.id, req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Record not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { addRecord, getRecords, getRecord, deleteRecord };
