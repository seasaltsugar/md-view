import { enhanceDocument } from '../lib/document';
import { renderToFragment } from '../lib/render';
import type { RenderOptions } from '../lib/markdown';

/** Parses an HTML string into an inert fragment (no scripts run, nothing is fetched). */
export function fragment(html: string): DocumentFragment {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content;
}

/** Full pipeline used by the app: Markdown → sanitized fragment → enhanced document. */
export function renderDoc(markdown: string, options?: RenderOptions) {
  const root = renderToFragment(markdown, options);
  const result = enhanceDocument(root);
  return { root, ...result };
}

export const lines = (...parts: string[]): string => parts.join('\n');
