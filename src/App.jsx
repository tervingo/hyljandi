/**
 * App.jsx — Root component for hyljandi markdown editor.
 *
 * Manages:
 *  - Editor text state
 *  - View mode (edit | split | preview)
 *  - Save / Load orchestration
 *  - Keyboard shortcuts (Ctrl+S, Ctrl+B, Ctrl+I)
 *  - "Dirty" indicator (unsaved changes)
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import Toolbar from './components/Toolbar';
import Editor from './components/Editor';
import Preview from './components/Preview';
import SaveModal from './components/SaveModal';
import { saveFile, loadFile } from './utils/fileIO';

const INITIAL_TEXT = `# Bienvenido a hyljandi

Escribe tu **Markdown** aquí. Usa la barra de herramientas para aplicar formato.

## Características

- Cifrado XOR automático al guardar
- Vista previa en tiempo real
- Atajos de teclado: \`Ctrl+B\`, \`Ctrl+I\`, \`Ctrl+S\`

---

> Empieza a escribir y pulsa **Guardar** cuando estés listo.
`;

export default function App() {
  const [text, setText] = useState(INITIAL_TEXT);
  const [viewMode, setViewMode] = useState('split'); // 'edit' | 'split' | 'preview'
  const [filename, setFilename] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [toast, setToast] = useState(null); // { message, type }
  const textareaRef = useRef(null);

  // ── Text change ────────────────────────────────────────────────────────────

  const handleChange = useCallback((newText) => {
    setText(newText);
    setIsDirty(true);
  }, []);

  // ── Toast helper ───────────────────────────────────────────────────────────

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Save flow ──────────────────────────────────────────────────────────────

  const triggerSave = useCallback(() => {
    setShowSaveModal(true);
  }, []);

  const handleSaveConfirm = useCallback(async (chosenName) => {
    setShowSaveModal(false);
    try {
      const saved = await saveFile(text, chosenName);
      if (saved) {
        setFilename(saved);
        setIsDirty(false);
        showToast(`Guardado: ${saved}`);
      }
    } catch (err) {
      showToast(`Error al guardar: ${err.message}`, 'error');
    }
  }, [text, showToast]);

  // ── Close flow ────────────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    if (isDirty) {
      const ok = window.confirm('Hay cambios sin guardar. ¿Cerrar de todas formas?');
      if (!ok) return;
    }
    setText('');
    setFilename(null);
    setIsDirty(false);
  }, [isDirty]);

  // ── Load flow ──────────────────────────────────────────────────────────────

  const handleLoad = useCallback(async () => {
    try {
      const result = await loadFile();
      if (result) {
        setText(result.text);
        setFilename(result.filename);
        setIsDirty(false);
        showToast(`Cargado: ${result.filename}`);
      }
    } catch (err) {
      showToast(`Error al cargar: ${err.message}`, 'error');
    }
  }, [showToast]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  const FORMAT_SHORTCUTS = {
    b: { before: '**', after: '**', placeholder: 'bold text' },
    i: { before: '_', after: '_', placeholder: 'italic text' },
  };

  const handleEditorKeyDown = useCallback(
    (e) => {
      if (e.ctrlKey || e.metaKey) {
        const fmt = FORMAT_SHORTCUTS[e.key.toLowerCase()];
        if (fmt) {
          e.preventDefault();
          const ta = textareaRef.current;
          if (!ta) return;
          const start = ta.selectionStart;
          const end = ta.selectionEnd;
          const selected = text.substring(start, end) || fmt.placeholder;
          const newText =
            text.substring(0, start) +
            fmt.before + selected + fmt.after +
            text.substring(end);
          setText(newText);
          setIsDirty(true);
          requestAnimationFrame(() => {
            ta.focus();
            ta.setSelectionRange(
              start + fmt.before.length,
              start + fmt.before.length + selected.length
            );
          });
        }
      }
    },
    [text]
  );

  // Global Ctrl+S
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        triggerSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [triggerSave]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-[#0f1117]">

      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-2 bg-[#12151f] border-b border-[#1e2235]">
        <span className="text-indigo-400 font-bold text-lg tracking-tight select-none">
          hyljandi
        </span>
        <span className="text-slate-600 text-xs">editor de markdown cifrado</span>
      </header>

      {/* Toolbar */}
      <Toolbar
        textareaRef={textareaRef}
        text={text}
        onChange={handleChange}
        onSave={triggerSave}
        onLoad={handleLoad}
        onClose={handleClose}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filename={filename}
        isDirty={isDirty}
      />

      {/* Main editing area */}
      <div className="flex flex-1 overflow-hidden">
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={`flex flex-col ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
            <div className="px-3 py-1 bg-[#14172a] border-b border-[#2d3148] text-xs text-slate-600 select-none">
              EDITOR
            </div>
            <Editor
              value={text}
              onChange={handleChange}
              textareaRef={textareaRef}
              onKeyDown={handleEditorKeyDown}
            />
          </div>
        )}

        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={`flex flex-col ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
            <div className="px-3 py-1 bg-[#14172a] border-b border-[#2d3148] text-xs text-slate-600 select-none">
              PREVIEW
            </div>
            <Preview text={text} />
          </div>
        )}
      </div>

      {/* Status bar */}
      <footer className="flex items-center gap-4 px-4 py-1 bg-[#12151f] border-t border-[#1e2235] text-xs text-slate-600 select-none">
        <span>{text.split('\n').length} líneas</span>
        <span>{text.length} caracteres</span>
        <span>{text.trim().split(/\s+/).filter(Boolean).length} palabras</span>
        <span className="flex-1" />
        <span className="text-indigo-600">XOR cifrado</span>
      </footer>

      {/* Save modal */}
      {showSaveModal && (
        <SaveModal
          defaultName={filename ? filename.replace(/\.md$/, '') : 'documento'}
          onConfirm={handleSaveConfirm}
          onCancel={() => setShowSaveModal(false)}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <div
          className={`
            fixed bottom-6 right-6 z-50 px-4 py-2 rounded-lg shadow-xl text-sm font-medium
            transition-all duration-300
            ${toast.type === 'error'
              ? 'bg-red-900/90 text-red-200 border border-red-700'
              : 'bg-indigo-900/90 text-indigo-100 border border-indigo-600'
            }
          `}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
