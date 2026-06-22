const crypto = require('crypto');

/**
 * Generates a cryptographically secure, URL-safe random token.
 * Default 32 bytes -> 43-character base64url string, ~256 bits of entropy.
 */
function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

module.exports = { generateSecureToken };
