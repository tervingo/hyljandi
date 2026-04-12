/**
 * Editor.jsx — The raw textarea where the user writes Markdown.
 *
 * Supports:
 *  - Tab key → inserts two spaces (instead of changing focus)
 *  - Ctrl+B / Ctrl+I shortcuts wired to the toolbar via onKeyDown callback
 */

import { useCallback } from 'react';

export default function Editor({ value, onChange, textareaRef, onKeyDown }) {
  const handleKeyDown = useCallback(
    (e) => {
      // Tab → two spaces
      if (e.key === 'Tab') {
        e.preventDefault();
        const ta = e.target;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        onChange(newValue);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 2;
        });
        return;
      }
      // Delegate other shortcuts (Ctrl+B, Ctrl+I, etc.) to parent
      if (onKeyDown) onKeyDown(e);
    },
    [value, onChange, onKeyDown]
  );

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      spellCheck={false}
      placeholder="Escribe tu Markdown aquí…"
      className="
        flex-1 w-full resize-none outline-none
        bg-[#0f1117] text-slate-200 caret-indigo-400
        font-mono text-sm leading-relaxed
        p-4 border-r border-[#2d3148]
        placeholder:text-slate-600
        selection:bg-indigo-800/60
      "
    />
  );
}
