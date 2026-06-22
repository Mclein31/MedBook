const pool = require('../config/db');

const RECORD_TYPES = [
  'consultation',
  'diagnosis',
  'lab',
  'prescription',
  'medication',
  'appointment',
  'other',
];

async function createRecord({ userId, type, title, description, date }) {
  const { rows } = await pool.query(
    `INSERT INTO medical_records (user_id, type, title, description, date)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, type, title, description, date, created_at, updated_at`,
    [userId, type, title, description, date]
  );
  return rows[0];
}

async function getAllForUser(userId, { type } = {}) {
  if (type) {
    const { rows } = await pool.query(
      `SELECT * FROM medical_records WHERE user_id = $1 AND type = $2 ORDER BY date DESC`,
      [userId, type]
    );
    return rows;
  }
  const { rows } = await pool.query(
    `SELECT * FROM medical_records WHERE user_id = $1 ORDER BY date DESC`,
    [userId]
  );
  return rows;
}

// Always scoped by user_id so a user can never fetch another user's record by guessing an id.
async function getOneForUser(userId, recordId) {
  const { rows } = await pool.query(
    `SELECT * FROM medical_records WHERE id = $1 AND user_id = $2`,
    [recordId, userId]
  );
  return rows[0] || null;
}

async function deleteForUser(userId, recordId) {
  const { rowCount } = await pool.query(
    `DELETE FROM medical_records WHERE id = $1 AND user_id = $2`,
    [recordId, userId]
  );
  return rowCount > 0;
}

// Used by the share-access flow; optionally filtered to a set of allowed types.
async function getAllForShare(userId, allowedTypes) {
  if (allowedTypes && allowedTypes.length > 0) {
    const { rows } = await pool.query(
      `SELECT id, type, title, description, date FROM medical_records
       WHERE user_id = $1 AND type = ANY($2) ORDER BY date DESC`,
      [userId, allowedTypes]
    );
    return rows;
  }
  const { rows } = await pool.query(
    `SELECT id, type, title, description, date FROM medical_records
     WHERE user_id = $1 ORDER BY date DESC`,
    [userId]
  );
  return rows;
}

module.exports = {
  RECORD_TYPES,
  createRecord,
  getAllForUser,
  getOneForUser,
  deleteForUser,
  getAllForShare,
};
