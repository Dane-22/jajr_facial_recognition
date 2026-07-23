const crypto = require('crypto');

// Secret key for AES-256 encryption. Must be 32 bytes long.
const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = Buffer.from(
  (process.env.ENCRYPTION_KEY || 'default_secret_key_32_bytes_long_123456789012').slice(0, 32).padEnd(32, '0')
);

/**
 * Encrypts a text string using AES-256-GCM
 * @param {string} text Plain text to encrypt
 * @returns {string} Hex-encoded IV:AuthTag:EncryptedData
 */
function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted payload
 * @param {string} encryptedText Encrypted text payload (IV:AuthTag:EncryptedData)
 * @returns {string} Original plain text
 */
function decrypt(encryptedText) {
  if (!encryptedText) return encryptedText;
  
  // If text is not encrypted (e.g. legacy plain JSON array starting with '['), return as is
  if (!encryptedText.includes(':') || encryptedText.trim().startsWith('[')) {
    return encryptedText;
  }

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedData = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[Crypto] Decryption failed:', err.message);
    return encryptedText;
  }
}

module.exports = { encrypt, decrypt };
