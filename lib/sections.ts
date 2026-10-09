import type { HeadingInfo } from './headings';

/**
 * A "section" is a heading plus everything after it up to (not including) the next heading
 * of the same or a higher level — or the end of the document.
 */
type Outline = Pick<HeadingInfo, 'level'>;

/** Index of the first heading AFTER `index` that ends its section (same or higher level), or headings.length. */
export function sectionEndIndex(headings: readonly Outline[], index: number): number {
  const level = headings[index].level;
  for (let i = index + 1; i < headings.length; i++) {
    if (headings[i].level <= level) return i;
  }
  return headings.length;
}

/**
 * The original Markdown that belongs to a heading's section, sliced from the source by line number.
 * Returns null when the heading has no known source position (e.g. it came from raw HTML).
 */
export function getSectionMarkdown(
  source: string,
  headings: readonly Pick<HeadingInfo, 'level' | 'startLine'>[],
  index: number,
): string | null {
  const heading = headings[index];
  if (!heading || heading.startLine === null) return null;

  const lines = source.split(/\r\n|\r|\n/);
  let end = lines.length;
  for (let i = index + 1; i < headings.length; i++) {
    const next = headings[i];
    if (next.startLine !== null && next.level <= heading.level) {
      end = next.startLine;
      break;
    }
  }
  return lines.slice(heading.startLine, end).join('\n').replace(/\s+$/, '');
}

/** The top-level elements of the rendered document that make up a section (heading first). */
export function getSectionElements(headings: readonly HeadingInfo[], index: number): HTMLElement[] {
  const heading = headings[index];
  if (!heading || !heading.topLevel) return heading ? [heading.el] : [];

  const stopAt = new Set<Element>();
  for (let i = sectionEndIndex(headings, index); i < headings.length; i++) {
    if (headings[i].topLevel) {
      stopAt.add(headings[i].el);
      break;
    }
  }

  const elements: HTMLElement[] = [heading.el];
  for (let el = heading.el.nextElementSibling; el; el = el.nextElementSibling) {
    if (stopAt.has(el) || el.classList.contains('footnotes')) break;
    elements.push(el as HTMLElement);
  }
  return elements;
}

// ── Plain-text extraction ───────────────────────────────────────────────

const isUi = (node: Node): boolean => node.nodeType === 1 && (node as Element).hasAttribute('data-mdv-ui');

const LIST_TAGS = new Set(['UL', 'OL']);
const BLOCK_TAGS = new Set([
  'P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'UL', 'OL', 'PRE', 'TABLE', 'HR',
  'DETAILS', 'SECTION', 'DL', 'FIGURE', 'FIGCAPTION',
]);

function inlineText(node: Node): string {
  if (node.nodeType === 3) return (node.textContent ?? '').replace(/\s+/g, ' ');
  if (node.nodeType !== 1 || isUi(node)) return '';
  const el = node as Element;
  if (el.tagName === 'BR') return '\n';
  if (el.tagName === 'INPUT') return (el as HTMLInputElement).hasAttribute('checked') ? '[x]' : '[ ]';
  if (el.tagName === 'IMG') return el.getAttribute('alt') ?? '';
  let out = '';
  el.childNodes.forEach((child) => (out += inlineText(child)));
  return out;
}

function tableText(table: Element): string {
  const rows: string[] = [];
  table.querySelectorAll('tr').forEach((row) => {
    const cells = Array.from(row.children).map((cell) => inlineText(cell).trim());
    rows.push(cells.join('\t'));
  });
  return rows.join('\n');
}

function listText(list: Element): string {
  let number = Number(list.getAttribute('start') ?? '1');
  if (!Number.isFinite(number)) number = 1;
  const ordered = list.tagName === 'OL';
  const lines: string[] = [];
  Array.from(list.children).forEach((item) => {
    if (item.tagName !== 'LI') return;
    const marker = ordered ? `${number++}. ` : '- ';
    const body = flowText(item, '\n').split('\n');
    body.forEach((line, i) => lines.push((i === 0 ? marker : ' '.repeat(marker.length)) + line));
  });
  return lines.join('\n');
}

/** Text of an element's children: inline runs become paragraphs, block children are handled by blockText. */
function flowText(el: Element, separator: string): string {
  const parts: string[] = [];
  let run = '';
  const flush = () => {
    const trimmed = run.replace(/[ \t]+\n/g, '\n').trim();
    if (trimmed) parts.push(trimmed);
    run = '';
  };
  el.childNodes.forEach((child) => {
    if (isUi(child)) return;
    if (child.nodeType === 1 && BLOCK_TAGS.has((child as Element).tagName)) {
      flush();
      const text = blockText(child as Element);
      if (text) parts.push(text);
    } else {
      run += inlineText(child);
    }
  });
  flush();
  return parts.join(separator);
}

function blockText(el: Element): string {
  if (isUi(el)) return '';
  if (LIST_TAGS.has(el.tagName)) return listText(el);
  if (el.tagName === 'TABLE') return tableText(el);
  if (el.tagName === 'PRE') return (el.textContent ?? '').replace(/\n$/, '');
  if (el.tagName === 'HR') return '---';
  if (el.tagName === 'TR') return '';
  return flowText(el, '\n\n');
}

/** Readable plain text for a list of rendered elements (used by "Copy section"). Ignores app controls. */
export function elementsToPlainText(elements: readonly Element[]): string {
  return elements
    .map((el) => (BLOCK_TAGS.has(el.tagName) || el.tagName === 'LI' ? blockText(el) : inlineText(el).trim()))
    .filter((text) => text !== '')
    .join('\n\n')
    .trim();
}
