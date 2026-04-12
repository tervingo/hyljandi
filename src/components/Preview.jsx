/**
 * Preview.jsx — Renders the Markdown as sanitized HTML.
 *
 * Uses marked for MD→HTML conversion and DOMPurify to prevent XSS.
 * Re-renders on every text change (memoised with useMemo).
 */

import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked once
marked.setOptions({
  breaks: true,   // single newline → <br>
  gfm: true,      // GitHub Flavored Markdown
});

export default function Preview({ text }) {
  const html = useMemo(() => {
    if (!text.trim()) return '<p class="text-slate-600 italic">Sin contenido todavía…</p>';
    const raw = marked.parse(text);
    return DOMPurify.sanitize(raw);
  }, [text]);

  return (
    <div
      className="flex-1 overflow-y-auto p-4 bg-[#0d1020] md-preview text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
