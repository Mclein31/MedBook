const shareModel = require('../models/shareModel');
const recordModel = require('../models/recordModel');
const { generateSecureToken } = require('../utils/token');

const DEFAULT_TTL_MINUTES = Number(process.env.SHARE_TOKEN_DEFAULT_TTL_MINUTES || 60);

// Protected: logged-in user generates a share token (and, on the client, a QR code from it).
async function createShare(req, res, next) {
  try {
    const { ttlMinutes, allowedTypes } = req.body;
    const minutes = Number(ttlMinutes) > 0 ? Number(ttlMinutes) : DEFAULT_TTL_MINUTES;

    if (allowedTypes && !Array.isArray(allowedTypes)) {
      return res.status(400).json({ error: 'allowedTypes must be an array of record types' });
    }

    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

    const share = await shareModel.createShare({
      userId: req.user.id,
      token,
      expiresAt,
      allowedTypes,
    });

    // The mobile app encodes `token` into a QR code. The doctor's scanner hits
    // GET /share/:token to retrieve the records — no login required for that route.
    res.status(201).json({
      token: share.token,
      expiresAt: share.expires_at,
      allowedTypes: share.allowed_types,
    });
  } catch (err) {
    next(err);
  }
}

// Public: anyone with a valid, unexpired, unrevoked token can read (not modify) the records.
async function getByToken(req, res, next) {
  try {
    const { token } = req.params;
    const share = await shareModel.findActiveByToken(token);

    if (!share) {
      return res.status(404).json({ error: 'This share link is invalid, expired, or revoked' });
    }

    const records = await recordModel.getAllForShare(share.user_id, share.allowed_types);
    res.json({
      expiresAt: share.expires_at,
      records,
    });
  } catch (err) {
    next(err);
  }
}

async function listShares(req, res, next) {
  try {
    const shares = await shareModel.listForUser(req.user.id);
    res.json({ shares });
  } catch (err) {
    next(err);
  }
}

async function revokeShare(req, res, next) {
  try {
    const revoked = await shareModel.revoke(req.user.id, req.params.id);
    if (!revoked) return res.status(404).json({ error: 'Share not found or already revoked' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { createShare, getByToken, listShares, revokeShare };
