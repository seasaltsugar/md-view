import { markdownToHtml, type RenderOptions } from './markdown';
import { sanitizeHtml } from './sanitize';

/** Markdown → sanitized HTML string. This is the only way document HTML is produced. */
export function renderSafeHtml(source: string, options: RenderOptions = {}): string {
  return sanitizeHtml(markdownToHtml(source, options));
}

/** Markdown → sanitized, inert DocumentFragment (scripts cannot run, images are not requested). */
export function renderToFragment(source: string, options: RenderOptions = {}, doc: Document = document): DocumentFragment {
  const template = doc.createElement('template');
  template.innerHTML = renderSafeHtml(source, options);
  return template.content;
}
