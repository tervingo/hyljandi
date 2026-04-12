/**
 * Toolbar.jsx
 *
 * Renders the formatting toolbar and the file action buttons.
 * Formatting buttons insert MD syntax around the current selection
 * (or at the cursor position) in the editor textarea.
 */

import { useRef } from 'react';

// ── Toolbar button definitions ────────────────────────────────────────────────

const FORMAT_BUTTONS = [
  {
    label: 'B',
    title: 'Bold (Ctrl+B)',
    className: 'font-bold',
    wrap: { before: '**', after: '**', placeholder: 'bold text' },
  },
  {
    label: 'I',
    title: 'Italic (Ctrl+I)',
    className: 'italic',
    wrap: { before: '_', after: '_', placeholder: 'italic text' },
  },
  {
    label: 'S',
    title: 'Strikethrough',
    className: 'line-through',
    wrap: { before: '~~', after: '~~', placeholder: 'strikethrough' },
  },
  {
    label: 'H1',
    title: 'Heading 1',
    className: 'font-bold text-xs',
    wrap: { before: '# ', after: '', placeholder: 'Heading 1', linePrefix: true },
  },
  {
    label: 'H2',
    title: 'Heading 2',
    className: 'font-bold text-xs',
    wrap: { before: '## ', after: '', placeholder: 'Heading 2', linePrefix: true },
  },
  {
    label: 'H3',
    title: 'Heading 3',
    className: 'font-bold text-xs',
    wrap: { before: '### ', after: '', placeholder: 'Heading 3', linePrefix: true },
  },
  {
    label: 'H4',
    title: 'Heading 4',
    className: 'font-bold text-xs',
    wrap: { before: '#### ', after: '', placeholder: 'Heading 4', linePrefix: true },
  },
  {
    label: '`  `',
    title: 'Inline code',
    className: 'font-mono text-xs',
    wrap: { before: '`', after: '`', placeholder: 'code' },
  },
  {
    label: '```',
    title: 'Code block',
    className: 'font-mono text-xs',
    wrap: { before: '\n```\n', after: '\n```\n', placeholder: 'code block' },
  },
  {
    label: '❝',
    title: 'Blockquote',
    className: '',
    wrap: { before: '> ', after: '', placeholder: 'quote', linePrefix: true },
  },
  {
    label: '—',
    title: 'Horizontal rule',
    className: '',
    wrap: { before: '\n---\n', after: '', placeholder: '', insertOnly: true },
  },
  {
    label: '• List',
    title: 'Unordered list',
    className: 'text-xs',
    wrap: { before: '- ', after: '', placeholder: 'list item', linePrefix: true },
  },
  {
    label: '1. List',
    title: 'Ordered list',
    className: 'text-xs',
    wrap: { before: '1. ', after: '', placeholder: 'list item', linePrefix: true },
  },
  {
    label: '🔗',
    title: 'Link',
    className: '',
    wrap: { before: '[', after: '](url)', placeholder: 'link text' },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Apply a wrap operation to a textarea ref.
 * Inserts markdown syntax around the current selection (or a placeholder).
 */
function applyWrap(textareaRef, wrap, onChange) {
  const ta = textareaRef.current;
  if (!ta) return;

  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const value = ta.value;
  const selected = value.substring(start, end);

  let newText;
  let newCursorStart;
  let newCursorEnd;

  if (wrap.insertOnly) {
    // Just insert, no wrapping
    newText = value.substring(0, start) + wrap.before + value.substring(end);
    newCursorStart = newCursorEnd = start + wrap.before.length;
  } else if (wrap.linePrefix) {
    // Insert at start of current line
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const content = selected || wrap.placeholder;
    newText =
      value.substring(0, lineStart) +
      wrap.before +
      content +
      wrap.after +
      value.substring(end);
    newCursorStart = lineStart + wrap.before.length;
    newCursorEnd = newCursorStart + content.length;
  } else {
    const content = selected || wrap.placeholder;
    newText =
      value.substring(0, start) +
      wrap.before +
      content +
      wrap.after +
      value.substring(end);
    newCursorStart = start + wrap.before.length;
    newCursorEnd = newCursorStart + content.length;
  }

  onChange(newText);

  // Restore focus + selection after React re-render
  requestAnimationFrame(() => {
    ta.focus();
    ta.setSelectionRange(newCursorStart, newCursorEnd);
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Toolbar({
  textareaRef,
  text,
  onChange,
  onSave,
  onLoad,
  onClose,
  viewMode,
  onViewModeChange,
  filename,
  isDirty,
}) {
  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-[#1a1d27] border-b border-[#2d3148] flex-wrap select-none">

      {/* Format buttons */}
      {FORMAT_BUTTONS.map((btn) => (
        <button
          key={btn.label}
          title={btn.title}
          onClick={() => applyWrap(textareaRef, btn.wrap, onChange)}
          className={`
            px-2 py-1 min-w-[2rem] rounded text-sm text-slate-300
            bg-[#252836] hover:bg-[#323650] hover:text-white
            border border-transparent hover:border-[#4c5380]
            transition-colors duration-100 cursor-pointer
            ${btn.className}
          `}
        >
          {btn.label}
        </button>
      ))}

      {/* Separator */}
      <div className="w-px h-5 bg-[#2d3148] mx-1" />

      {/* View mode toggle */}
      <div className="flex rounded overflow-hidden border border-[#2d3148]">
        {['edit', 'split', 'preview'].map((mode) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} mode`}
            className={`
              px-2 py-1 text-xs capitalize transition-colors duration-100 cursor-pointer
              ${viewMode === mode
                ? 'bg-indigo-600 text-white'
                : 'bg-[#252836] text-slate-400 hover:bg-[#323650] hover:text-white'
              }
            `}
          >
            {mode === 'edit' ? '✏️' : mode === 'split' ? '⊞' : '👁'}
          </button>
        ))}
      </div>

      {/* Separator */}
      <div className="flex-1" />

      {/* Filename indicator */}
      {filename && (
        <span className="text-xs text-slate-500 mr-2 truncate max-w-[180px]" title={filename}>
          {isDirty ? '● ' : ''}{filename}
        </span>
      )}

      {/* Close button — only visible when a file is open */}
      {filename && (
        <button
          onClick={onClose}
          title="Cerrar fichero actual"
          className="
            flex items-center gap-1 px-3 py-1 rounded text-sm
            bg-[#252836] text-slate-400 hover:bg-red-900/60 hover:text-red-300
            border border-[#2d3148] hover:border-red-700
            transition-colors duration-100 cursor-pointer
          "
        >
          <span>✕</span> Cerrar
        </button>
      )}

      {/* Load button */}
      <button
        onClick={onLoad}
        title="Cargar fichero .md (descifra automáticamente)"
        className="
          flex items-center gap-1 px-3 py-1 rounded text-sm
          bg-[#252836] text-slate-300 hover:bg-[#323650] hover:text-white
          border border-[#2d3148] hover:border-[#4c5380]
          transition-colors duration-100 cursor-pointer
        "
      >
        <span>📂</span> Cargar
      </button>

      {/* Save button */}
      <button
        onClick={onSave}
        title="Guardar como .md cifrado"
        className="
          flex items-center gap-1 px-3 py-1 rounded text-sm
          bg-indigo-600 text-white hover:bg-indigo-500
          border border-indigo-500 hover:border-indigo-400
          transition-colors duration-100 cursor-pointer font-medium
        "
      >
        <span>💾</span> Guardar
      </button>
    </div>
  );
}
