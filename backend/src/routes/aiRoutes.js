const express = require('express');
const { summarize, organize, explain } = require('../controllers/aiController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);

router.post('/summarize', summarize);
router.post('/organize', organize);
router.post('/explain', explain);

module.exports = router;
