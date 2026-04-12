/**
 * fileIO.js — Save and load .md files using the File System Access API.
 *
 * Save flows:
 *   - saveToHandle(handle, text): sobrescribe un fichero ya abierto (sin diálogo)
 *   - saveAsNew(text, suggestedName): abre el diálogo "Guardar como" del SO
 *
 * Load flow: abre el diálogo nativo → lee → descifra → devuelve handle + texto
 *
 * Falls back to <a download> / <input type=file> when la File System Access
 * API no está disponible (Firefox). En ese caso el handle devuelto es null.
 */

import { encrypt, decrypt, isEncrypted } from './cipher.js';

const FILE_TYPES = [
  {
    description: 'Markdown files',
    accept: { 'text/markdown': ['.md'] },
  },
];

/**
 * Sobrescribe un fichero ya abierto usando su FileSystemFileHandle.
 * No muestra ningún diálogo. Devuelve true si tuvo éxito.
 * @param {FileSystemFileHandle} handle
 * @param {string} plaintext
 * @returns {Promise<boolean>}
 */
export async function saveToHandle(handle, plaintext) {
  const ciphertext = encrypt(plaintext);
  const writable = await handle.createWritable();
  await writable.write(ciphertext);
  await writable.close();
  return true;
}

/**
 * Abre el diálogo "Guardar como" del SO y escribe el fichero cifrado.
 * Devuelve { filename, handle } si tuvo éxito, o null si el usuario cancela.
 * @param {string} plaintext
 * @param {string} suggestedName
 * @returns {Promise<{filename: string, handle: FileSystemFileHandle|null}|null>}
 */
export async function saveAsNew(plaintext, suggestedName = 'documento.md') {
  const ciphertext = encrypt(plaintext);

  if (!suggestedName.endsWith('.md')) suggestedName += '.md';

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: FILE_TYPES,
      });
      const writable = await handle.createWritable();
      await writable.write(ciphertext);
      await writable.close();
      return { filename: handle.name, handle };
    } catch (err) {
      if (err.name === 'AbortError') return null;
      throw err;
    }
  } else {
    // Fallback: descarga del navegador (sin handle)
    const blob = new Blob([ciphertext], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestedName;
    a.click();
    URL.revokeObjectURL(url);
    return { filename: suggestedName, handle: null };
  }
}

/**
 * Abre el diálogo nativo de ficheros (.md), lee y descifra el contenido.
 * Devuelve { text, filename, handle } o null si el usuario cancela.
 * En el fallback (Firefox), handle es null.
 * @returns {Promise<{text: string, filename: string, handle: FileSystemFileHandle|null}|null>}
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
      return { text, filename: handle.name, handle };
    } catch (err) {
      if (err.name === 'AbortError') return null;
      throw err;
    }
  } else {
    // Fallback: <input type=file>
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.md';
      input.onchange = async () => {
        const file = input.files[0];
        if (!file) { resolve(null); return; }
        const raw = await file.text();
        const text = isEncrypted(raw) ? decrypt(raw) : raw;
        resolve({ text, filename: file.name, handle: null });
      };
      input.oncancel = () => resolve(null);
      input.click();
    });
  }
}
