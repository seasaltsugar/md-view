/**
 * Icons are defined once as <symbol>s in viewer/index.html and referenced with <use>.
 * That keeps the DOM small even for documents with thousands of headings.
 */
export type IconName =
  | 'toc' | 'folder' | 'search' | 'up' | 'down' | 'close' | 'copy' | 'link' | 'markdown'
  | 'chevron' | 'sun' | 'moon' | 'monitor' | 'print' | 'more' | 'heart' | 'info' | 'check'
  | 'lock' | 'eye-off' | 'infinity' | 'image' | 'alert';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function icon(name: IconName, doc: Document = document): SVGSVGElement {
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = doc.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.appendChild(use);
  return svg;
}
