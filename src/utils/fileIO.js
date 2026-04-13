/**
 * fileIO.js — Save and load .md files.
 *
 * Orden de preferencia por capacidad del navegador:
 *
 *  GUARDAR (nuevo):
 *    1. showSaveFilePicker  → Chrome/Edge desktop: diálogo nativo del SO
 *    2. navigator.share     → iOS Safari: share sheet nativo (Drive, Dropbox, Archivos…)
 *    3. <a download>        → fallback universal: descarga al directorio de descargas
 *
 *  GUARDAR (existente):
 *    1. FileSystemFileHandle.createWritable() → sin diálogo (solo si hay handle)
 *
 *  CARGAR:
 *    1. showOpenFilePicker  → Chrome/Edge desktop
 *    2. <input type=file>   → iOS Safari y Firefox: selector de ficheros del SO
 *
 *  DIRECTORIO BASE (startIn):
 *    Solo disponible en navegadores con showSaveFilePicker/showOpenFilePicker.
 *    En iOS/Firefox no aplica.
 */

import { encrypt, decrypt, isEncrypted } from './cipher.js';
import { persistHandle, retrieveHandle } from './persist.js';

const FILE_TYPES   = [{ description: 'Markdown files', accept: { 'text/markdown': ['.md'] } }];
const BASE_DIR_KEY = 'baseDir';

// ── Capacidades del navegador ─────────────────────────────────────────────────

export const canPickDir  = typeof window !== 'undefined' && !!window.showDirectoryPicker;
export const canSavePick = typeof window !== 'undefined' && !!window.showSaveFilePicker;
export const canOpenPick = typeof window !== 'undefined' && !!window.showOpenFilePicker;
export const canShare    = typeof navigator !== 'undefined' &&
                           !!navigator.share &&
                           !!navigator.canShare;

// ── Directorio base ────────────────────────────────────────────────────────────

export async function getBaseDir() {
  try { return await retrieveHandle(BASE_DIR_KEY); }
  catch { return null; }
}

export async function chooseBaseDir() {
  if (!canPickDir) return null;
  try {
    const dir = await window.showDirectoryPicker({ mode: 'read' });
    await persistHandle(BASE_DIR_KEY, dir);
    return dir;
  } catch (err) {
    if (err.name === 'AbortError') return null;
    throw err;
  }
}

async function getStartIn() {
  if (!canPickDir) return undefined;
  const stored = await getBaseDir();
  if (stored) return stored;
  return (await chooseBaseDir()) ?? undefined;
}

// ── API pública ────────────────────────────────────────────────────────────────

/** Sobrescribe un fichero ya abierto. Sin diálogo. Solo Chrome/Edge desktop. */
export async function saveToHandle(handle, plaintext) {
  const writable = await handle.createWritable();
  await writable.write(encrypt(plaintext));
  await writable.close();
}

/**
 * Guarda como nuevo fichero cifrado.
 * Devuelve { filename, handle } o null si cancela.
 */
export async function saveAsNew(plaintext, suggestedName = 'documento.md') {
  if (!suggestedName.endsWith('.md')) suggestedName += '.md';

  const ciphertext = encrypt(plaintext);

  // ── Opción 1: File System Access API (Chrome/Edge desktop) ────────────────
  if (canSavePick) {
    try {
      const startIn = await getStartIn();
      const handle  = await window.showSaveFilePicker({
        suggestedName,
        types: FILE_TYPES,
        ...(startIn ? { startIn } : {}),
      });
      const writable = await handle.createWritable();
      await writable.write(ciphertext);
      await writable.close();
      return { filename: handle.name, handle };
    } catch (err) {
      if (err.name === 'AbortError') return null;
      throw err;
    }
  }

  // ── Opción 2: Web Share API (iOS Safari, Android Chrome) ─────────────────
  const blob = new Blob([ciphertext], { type: 'text/markdown' });
  const file = new File([blob], suggestedName, { type: 'text/markdown' });

  if (canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: suggestedName });
      return { filename: suggestedName, handle: null };
    } catch (err) {
      if (err.name === 'AbortError') return null;
      throw err;
    }
  }

  // ── Opción 3: descarga clásica del navegador ──────────────────────────────
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = suggestedName; a.click();
  URL.revokeObjectURL(url);
  return { filename: suggestedName, handle: null };
}

/**
 * Carga un fichero .md y lo descifra.
 * Devuelve { text, filename, handle } o null si cancela.
 */
export async function loadFile() {
  // ── Opción 1: File System Access API (Chrome/Edge desktop) ────────────────
  if (canOpenPick) {
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
  }

  // ── Opción 2: <input type=file> (iOS Safari, Firefox) ─────────────────────
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
