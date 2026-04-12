/**
 * fileIO.js — Save and load .md files using the File System Access API.
 *
 * El diálogo del SO siempre se abre en el directorio del último fichero
 * usado, que se persiste en IndexedDB entre sesiones. Tras la primera
 * operación en Dropbox, todos los diálogos abrirán allí automáticamente.
 *
 * Falls back to <a download> / <input type=file> en Firefox.
 */

import { encrypt, decrypt, isEncrypted } from './cipher.js';
import { persistHandle, retrieveHandle } from './persist.js';

const FILE_TYPES = [
  { description: 'Markdown files', accept: { 'text/markdown': ['.md'] } },
];

const LAST_HANDLE_KEY = 'lastFileHandle';

/** Devuelve el handle persistido para usar como startIn, o undefined. */
async function getStartIn() {
  try {
    return (await retrieveHandle(LAST_HANDLE_KEY)) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Persiste el handle para la próxima sesión (silencia errores). */
async function rememberHandle(handle) {
  try {
    await persistHandle(LAST_HANDLE_KEY, handle);
  } catch { /* no critical */ }
}

// ── API pública ────────────────────────────────────────────────────────────────

/**
 * Sobrescribe un fichero ya abierto usando su FileSystemFileHandle.
 * No muestra ningún diálogo.
 * @param {FileSystemFileHandle} handle
 * @param {string} plaintext
 */
export async function saveToHandle(handle, plaintext) {
  const writable = await handle.createWritable();
  await writable.write(encrypt(plaintext));
  await writable.close();
  await rememberHandle(handle);
}

/**
 * Abre el diálogo "Guardar como" del SO, empezando en el último directorio usado.
 * Devuelve { filename, handle } o null si el usuario cancela.
 * @param {string} plaintext
 * @param {string} suggestedName
 * @returns {Promise<{filename: string, handle: FileSystemFileHandle|null}|null>}
 */
export async function saveAsNew(plaintext, suggestedName = 'documento.md') {
  if (!suggestedName.endsWith('.md')) suggestedName += '.md';

  if (window.showSaveFilePicker) {
    try {
      const startIn = await getStartIn();
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: FILE_TYPES,
        ...(startIn ? { startIn } : {}),
      });
      const writable = await handle.createWritable();
      await writable.write(encrypt(plaintext));
      await writable.close();
      await rememberHandle(handle);
      return { filename: handle.name, handle };
    } catch (err) {
      if (err.name === 'AbortError') return null;
      throw err;
    }
  } else {
    // Fallback: descarga del navegador (sin handle)
    const blob = new Blob([encrypt(plaintext)], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = suggestedName; a.click();
    URL.revokeObjectURL(url);
    return { filename: suggestedName, handle: null };
  }
}

/**
 * Abre el diálogo nativo de ficheros (.md), empezando en el último directorio usado.
 * Devuelve { text, filename, handle } o null si el usuario cancela.
 * @returns {Promise<{text: string, filename: string, handle: FileSystemFileHandle|null}|null>}
 */
export async function loadFile() {
  if (window.showOpenFilePicker) {
    try {
      const startIn = await getStartIn();
      const [handle] = await window.showOpenFilePicker({
        types: FILE_TYPES,
        multiple: false,
        ...(startIn ? { startIn } : {}),
      });
      const file = await handle.getFile();
      const raw  = await file.text();
      const text = isEncrypted(raw) ? decrypt(raw) : raw;
      await rememberHandle(handle);
      return { text, filename: handle.name, handle };
    } catch (err) {
      if (err.name === 'AbortError') return null;
      throw err;
    }
  } else {
    // Fallback: <input type=file>
    return new Promise((resolve) => {
      const input  = document.createElement('input');
      input.type   = 'file';
      input.accept = '.md';
      input.onchange = async () => {
        const file = input.files[0];
        if (!file) { resolve(null); return; }
        const raw  = await file.text();
        const text = isEncrypted(raw) ? decrypt(raw) : raw;
        resolve({ text, filename: file.name, handle: null });
      };
      input.oncancel = () => resolve(null);
      input.click();
    });
  }
}
