/**
 * cipher.js — XOR cipher with Base64 encoding
 *
 * The plaintext is XOR-ed byte-by-byte against a repeating key,
 * then the result is encoded as Base64. Decryption is the same
 * operation in reverse (Base64 decode → XOR → plaintext).
 *
 * Security level: obfuscation (not cryptographic). The key is
 * embedded in the app. Sufficient to prevent casual reading.
 */

const KEY = import.meta.env.VITE_CIPHER_KEY;
if (!KEY) throw new Error('VITE_CIPHER_KEY no está definida en el fichero .env');

/**
 * Encode a UTF-8 string to a Base64 XOR-ciphered string.
 * @param {string} plaintext
 * @returns {string} Base64-encoded ciphertext
 */
export function encrypt(plaintext) {
  const textBytes = new TextEncoder().encode(plaintext);
  const keyBytes = new TextEncoder().encode(KEY);
  const cipher = new Uint8Array(textBytes.length);

  for (let i = 0; i < textBytes.length; i++) {
    cipher[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
  }

  // Convert Uint8Array to binary string, then Base64
  let binary = '';
  for (let i = 0; i < cipher.length; i++) {
    binary += String.fromCharCode(cipher[i]);
  }
  return btoa(binary);
}

/**
 * Decode a Base64 XOR-ciphered string back to UTF-8 plaintext.
 * @param {string} ciphertext Base64-encoded ciphertext
 * @returns {string} decoded plaintext
 */
export function decrypt(ciphertext) {
  const binary = atob(ciphertext);
  const cipher = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    cipher[i] = binary.charCodeAt(i);
  }

  const keyBytes = new TextEncoder().encode(KEY);
  const textBytes = new Uint8Array(cipher.length);
  for (let i = 0; i < cipher.length; i++) {
    textBytes[i] = cipher[i] ^ keyBytes[i % keyBytes.length];
  }

  return new TextDecoder().decode(textBytes);
}

/**
 * Returns true if the string looks like a valid Base64 payload
 * (used to detect whether a loaded file is encrypted or plain text).
 * @param {string} str
 * @returns {boolean}
 */
export function isEncrypted(str) {
  const trimmed = str.trim();
  return /^[A-Za-z0-9+/]+=*$/.test(trimmed) && trimmed.length > 0;
}
