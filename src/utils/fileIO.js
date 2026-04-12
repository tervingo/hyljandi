/**
 * fileIO.js — Save and load .md files using the File System Access API.
 *
 * El diálogo del SO siempre se abre en el directorio base configurado
 * por el usuario (guardado en IndexedDB). Si no hay directorio base
 * configurado, se pide al usuario que lo elija antes de continuar.
 *
 * Falls back to <a download> / <input type=file> en Firefox.
 */

import { encrypt, decrypt, isEncrypted } from './cipher.js';
import { persistHandle, retrieveHandle } from './persist.js';

const FILE_TYPES   = [{ description: 'Markdown files', accept: { 'text/markdown': ['.md'] } }];
const BASE_DIR_KEY = 'baseDir';

// ── Directorio base ────────────────────────────────────────────────────────────

/** Devuelve el DirectoryHandle base almacenado, o null. */
export async function getBaseDir() {
  try { return await retrieveHandle(BASE_DIR_KEY); }
  catch { return null; }
}

/**
 * Abre showDirectoryPicker para que el usuario elija su directorio base,
 * lo persiste en IndexedDB y lo devuelve.
 * @returns {Promise<FileSystemDirectoryHandle|null>}
 */
export async function chooseBaseDir() {
  if (!window.showDirectoryPicker) return null;
  try {
    const dir = await window.showDirectoryPicker({ mode: 'read' });
    await persistHandle(BASE_DIR_KEY, dir);
    return dir;
  } catch (err) {
    if (err.name === 'AbortError') return null;
    throw err;
  }
}

/**
 * Devuelve el directorio base guardado. Si no existe, lanza el picker
 * para que el usuario lo elija ahora.
 * @returns {Promise<FileSystemDirectoryHandle|undefined>}
 */
async function getStartIn() {
  const stored = await getBaseDir();
  if (stored) return stored;
  // Primera vez: pedir directorio
  return (await chooseBaseDir()) ?? undefined;
}

// ── API pública ────────────────────────────────────────────────────────────────

/**
 * Sobrescribe un fichero ya abierto usando su FileSystemFileHandle.
 * No muestra ningún diálogo.
 */
export async function saveToHandle(handle, plaintext) {
  const writable = await handle.createWritable();
  await writable.write(encrypt(plaintext));
  await writable.close();
}

/**
 * Abre el diálogo "Guardar como" del SO, empezando en el directorio base.
 * Devuelve { filename, handle } o null si cancela.
 */
export async function saveAsNew(plaintext, suggestedName = 'documento.md') {
  if (!suggestedName.endsWith('.md')) suggestedName += '.md';

  if (window.showSaveFilePicker) {
    try {
      const startIn = await getStartIn();
      const handle  = await window.showSaveFilePicker({
        suggestedName,
        types: FILE_TYPES,
        ...(startIn ? { startIn } : {}),
      });
      const writable = await handle.createWritable();
      await writable.write(encrypt(plaintext));
      await writable.close();
      return { filename: handle.name, handle };
    } catch (err) {
      if (err.name === 'AbortError') return null;
      throw err;
    }
  } else {
    const blob = new Blob([encrypt(plaintext)], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = suggestedName; a.click();
    URL.revokeObjectURL(url);
    return { filename: suggestedName, handle: null };
  }
}

/**
 * Abre el diálogo nativo de ficheros (.md), empezando en el directorio base.
 * Devuelve { text, filename, handle } o null si cancela.
 */
export async function loadFile() {
  if (window.showOpenFilePicker) {
    try {
      const startIn  = await getStartIn();
      const [handle] = await window.showOpenFilePicker({
        types: FILE_TYPES,
        multiple: false,
        ...(startIn ? { startIn } : {}),
      });
      const file = await handle.getFile();
      const raw  = await file.text();
      const text = isEncrypted(raw) ? decrypt(raw) : raw;
      return { text, filename: handle.name, handle };
    } catch (err) {
      if (err.name === 'AbortError') return null;
      throw err;
    }
  } else {
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
