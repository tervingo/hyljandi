/**
 * fileIO.js — Save and load .md files using the File System Access API.
 *
 * Save flow: encrypt text → show native "Save As" dialog → write file
 * Load flow: open native file picker (.md filter) → read file → decrypt
 *
 * Falls back to a classic <a download> / <input type=file> approach
 * when the File System Access API is not available (e.g. Firefox).
 */

import { encrypt, decrypt, isEncrypted } from './cipher.js';

const FILE_TYPES = [
  {
    description: 'Markdown files',
    accept: { 'text/markdown': ['.md'] },
  },
];

/**
 * Save plaintext as an encrypted .md file.
 * Returns the filename chosen by the user, or null on cancel.
 * @param {string} plaintext
 * @param {string} suggestedName
 * @returns {Promise<string|null>}
 */
export async function saveFile(plaintext, suggestedName = 'document.md') {
  const ciphertext = encrypt(plaintext);

  // Ensure filename ends with .md
  if (!suggestedName.endsWith('.md')) {
    suggestedName += '.md';
  }

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: FILE_TYPES,
      });
      const writable = await handle.createWritable();
      await writable.write(ciphertext);
      await writable.close();
      return handle.name;
    } catch (err) {
      if (err.name === 'AbortError') return null; // user cancelled
      throw err;
    }
  } else {
    // Fallback: trigger a browser download
    const blob = new Blob([ciphertext], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestedName;
    a.click();
    URL.revokeObjectURL(url);
    return suggestedName;
  }
}

/**
 * Open a file picker for .md files, read and decrypt the selected file.
 * Returns { text, filename } or null on cancel.
 * @returns {Promise<{text: string, filename: string}|null>}
 */
export async function loadFile() {
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: FILE_TYPES,
        multiple: false,
      });
      const file = await handle.getFile();
      const raw = await file.text();
      const text = isEncrypted(raw) ? decrypt(raw) : raw;
      return { text, filename: handle.name };
    } catch (err) {
      if (err.name === 'AbortError') return null;
      throw err;
    }
  } else {
    // Fallback: hidden <input type=file>
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.md';
      input.onchange = async () => {
        const file = input.files[0];
        if (!file) { resolve(null); return; }
        const raw = await file.text();
        const text = isEncrypted(raw) ? decrypt(raw) : raw;
        resolve({ text, filename: file.name });
      };
      input.oncancel = () => resolve(null);
      input.click();
    });
  }
}
