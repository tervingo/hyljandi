/**
 * SaveModal.jsx — Dialog to enter the filename before saving.
 *
 * Shown when the user clicks "Guardar" and the File System Access API
 * is NOT available (fallback download path). When the API IS available,
 * the native OS dialog handles the filename, so this modal is skipped.
 *
 * Also used as a "suggested name" prompt before opening showSaveFilePicker.
 */

import { useState, useEffect, useRef } from 'react';

export default function SaveModal({ defaultName, onConfirm, onCancel }) {
  const [name, setName] = useState(defaultName || 'documento');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim() || 'documento';
    onConfirm(trimmed.endsWith('.md') ? trimmed : trimmed + '.md');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="bg-[#1a1d27] border border-[#2d3148] rounded-lg shadow-2xl p-6 w-80 flex flex-col gap-4"
      >
        <h2 className="text-white font-semibold text-base">Guardar como…</h2>

        <div className="flex flex-col gap-1">
          <label className="text-slate-400 text-xs">Nombre del fichero</label>
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="
                flex-1 bg-[#0f1117] border border-[#2d3148] rounded px-3 py-1.5
                text-slate-200 text-sm outline-none
                focus:border-indigo-500 transition-colors
              "
            />
            <span className="text-slate-500 text-sm">.md</span>
          </div>
        </div>

        <p className="text-slate-500 text-xs">
          El contenido se cifrará con XOR antes de guardar.
        </p>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="
              px-4 py-1.5 rounded text-sm text-slate-400
              bg-[#252836] hover:bg-[#323650] hover:text-white
              border border-[#2d3148] transition-colors cursor-pointer
            "
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="
              px-4 py-1.5 rounded text-sm font-medium
              bg-indigo-600 text-white hover:bg-indigo-500
              border border-indigo-500 transition-colors cursor-pointer
            "
          >
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
