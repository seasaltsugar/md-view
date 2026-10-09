import { createSlugger } from './slug';

export interface HeadingInfo {
  /** Stable anchor id (also set on the element). */
  id: string;
  /** 1–6 */
  level: number;
  text: string;
  el: HTMLElement;
  /** True when the heading is a direct child of the document root (section actions work on these). */
  topLevel: boolean;
  /** Zero-based line in the original Markdown where this heading starts, when known. */
  startLine: number | null;
}

/**
 * Finds every heading, gives it a stable unique id (GitHub-style) and returns them in document order.
 * Headings that already have an id (from raw HTML) keep it.
 */
export function collectHeadings(root: ParentNode & Node): HeadingInfo[] {
  const elements = Array.from(root.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6'));
  const reserved = Array.from(root.querySelectorAll('[id]'), (el) => el.id);
  const slugger = createSlugger(reserved);

  return elements.map((el) => {
    const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (!el.id) el.id = slugger.slug(text);
    const topLevel = el.parentNode === root;
    const rawStart = el.getAttribute('data-md-start');
    const startLine = topLevel && rawStart !== null && rawStart !== '' ? Number(rawStart) : null;
    return {
      id: el.id,
      level: Number(el.tagName.charAt(1)),
      text,
      el,
      topLevel,
      startLine: Number.isFinite(startLine) ? startLine : null,
    };
  });
}
