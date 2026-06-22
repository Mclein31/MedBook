const express = require('express');
const {
  createShare,
  getByToken,
  listShares,
  revokeShare,
} = require('../controllers/shareController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// Protected: only the record owner can generate, list, or revoke share links.
router.post('/', requireAuth, createShare);
router.get('/', requireAuth, listShares);
router.delete('/:id', requireAuth, revokeShare);

// Public: this is what a doctor's QR scan hits. No login required — the token itself
// is the credential, and it's short-lived and revocable.
router.get('/:token', getByToken);

module.exports = router;
