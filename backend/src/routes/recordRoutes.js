const express = require('express');
const {
  addRecord,
  getRecords,
  getRecord,
  deleteRecord,
} = require('../controllers/recordController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth); // every route below requires a logged-in user

router.post('/', addRecord);
router.get('/', getRecords);
router.get('/:id', getRecord);
router.delete('/:id', deleteRecord);

module.exports = router;
