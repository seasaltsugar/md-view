import { collectHeadings, type HeadingInfo } from './headings';
import { languageLabel } from './highlight';
import { icon, type IconName } from './icons';

/**
 * DOM post-processing of the already-sanitized document: stable heading ids, scrollable tables,
 * code-block chrome, image placeholders and heading actions.
 *
 * Everything added here is created with DOM APIs (never from Markdown text), and every control
 * is marked `data-mdv-ui` so search, copy and print can ignore it.
 */
export interface EnhanceResult {
  headings: HeadingInfo[];
  /** https images that were blocked until the person chooses to load them. */
  remoteImageCount: number;
}

type Root = (DocumentFragment | HTMLElement) & ParentNode;

export interface EnhanceOptions {
  /** Don't build section-action toolbars up front (very heading-dense documents); see buildHeadingActions. */
  lazyActions?: boolean;
}

export function enhanceDocument(root: Root, options: EnhanceOptions = {}): EnhanceResult {
  const doc = root.ownerDocument as Document;
  wrapTables(root, doc);
  wrapCodeBlocks(root, doc);
  const remoteImageCount = replaceBlockedImages(root, doc);
  labelTaskCheckboxes(root);
  const headings = collectHeadings(root);
  markHeadings(headings);
  if (!options.lazyActions) headings.forEach((heading) => buildHeadingActions(heading, doc));
  return { headings, remoteImageCount };
}

// ── Tables ────────────────────────────────────────────────────────────────

function wrapTables(root: ParentNode, doc: Document): void {
  root.querySelectorAll('table').forEach((table) => {
    if (table.parentElement?.classList.contains('table-wrap')) return;
    const wrap = doc.createElement('div');
    wrap.className = 'table-wrap';
    table.replaceWith(wrap);
    wrap.appendChild(table);
  });
}

// ── Code blocks ───────────────────────────────────────────────────────────

function wrapCodeBlocks(root: ParentNode, doc: Document): void {
  root.querySelectorAll('pre').forEach((pre) => {
    if (pre.parentElement?.classList.contains('code-block')) return;
    const code = pre.querySelector('code');
    const lang = /(?:^|\s)language-([\w+#.-]+)/.exec(code?.className ?? '')?.[1] ?? '';
    const label = languageLabel(lang);

    const wrapper = doc.createElement('div');
    wrapper.className = 'code-block';
    if (lang) wrapper.setAttribute('data-lang', lang.toLowerCase());

    const header = doc.createElement('div');
    header.className = 'code-header';
    header.setAttribute('data-mdv-ui', '');

    const name = doc.createElement('span');
    name.className = 'code-lang';
    name.textContent = label;
    header.appendChild(name);

    const copy = doc.createElement('button');
    copy.type = 'button';
    copy.className = 'code-copy';
    copy.setAttribute('data-action', 'copy-code');
    copy.setAttribute('aria-label', label ? `Copy ${label} code` : 'Copy code');
    copy.textContent = 'Copy';
    header.appendChild(copy);

    pre.replaceWith(wrapper);
    wrapper.append(header, pre);
  });
}

// ── Task lists ────────────────────────────────────────────────────────────

/** Gives each read-only checkbox an accessible name: the text of its list item (without nested lists). */
function labelTaskCheckboxes(root: ParentNode): void {
  root.querySelectorAll<HTMLInputElement>('input.task-list-item-checkbox').forEach((box) => {
    const item = box.closest('li');
    if (!item) return;
    let text = '';
    item.childNodes.forEach((node) => {
      const tag = node.nodeType === 1 ? (node as Element).tagName : '';
      if (tag === 'UL' || tag === 'OL' || node === box) return;
      text += node.textContent ?? '';
    });
    box.setAttribute('aria-label', text.replace(/\s+/g, ' ').trim() || 'Task');
  });
}

// ── Images ────────────────────────────────────────────────────────────────

const PLACEHOLDER_TEXT: Record<string, string> = {
  remote: 'Remote image not loaded',
  insecure: 'Insecure (http) image blocked',
  local: 'Image on your computer can’t be shown',
  failed: 'Image couldn’t be loaded',
};

function makePlaceholder(doc: Document, alt: string, state: string, remoteSrc: string | null): HTMLElement {
  const span = doc.createElement('span');
  span.className = 'image-placeholder';
  span.setAttribute('data-state', state);
  if (remoteSrc) span.setAttribute('data-remote-src', remoteSrc);
  span.setAttribute('role', 'img');
  span.setAttribute('aria-label', alt ? `${alt} (${PLACEHOLDER_TEXT[state]})` : PLACEHOLDER_TEXT[state]);

  span.appendChild(icon('image', doc));
  const text = doc.createElement('span');
  text.className = 'image-placeholder-text';
  const title = doc.createElement('strong');
  title.textContent = alt || 'Image';
  const note = doc.createElement('small');
  note.textContent = PLACEHOLDER_TEXT[state];
  text.append(title, note);
  span.appendChild(text);
  return span;
}

function replaceBlockedImages(root: ParentNode, doc: Document): number {
  let remote = 0;
  root.querySelectorAll('img').forEach((img) => {
    const state = img.getAttribute('data-mdv-image');
    if (!state) {
      img.loading = 'lazy';
      img.decoding = 'async';
      return; // inline data: image
    }
    if (state === 'remote') remote++;
    img.replaceWith(makePlaceholder(doc, img.getAttribute('alt') ?? '', state, img.getAttribute('data-remote-src')));
  });
  return remote;
}

/**
 * Loads the remote images the person has chosen to load. This is the ONLY place a document
 * can cause a network request, and only after an explicit click.
 */
export function loadRemoteImages(root: ParentNode): number {
  const doc = (root as Node).ownerDocument ?? document;
  let loaded = 0;
  root.querySelectorAll<HTMLElement>('.image-placeholder[data-remote-src]').forEach((placeholder) => {
    const src = placeholder.getAttribute('data-remote-src') ?? '';
    if (!/^https:/i.test(src)) return;
    const alt = placeholder.querySelector('strong')?.textContent ?? '';
    const img = doc.createElement('img');
    img.referrerPolicy = 'no-referrer';
    img.decoding = 'async';
    img.loading = 'lazy';
    img.alt = alt === 'Image' ? '' : alt;
    img.addEventListener('error', () => img.replaceWith(makePlaceholder(doc, img.alt, 'failed', null)), { once: true });
    img.src = src;
    placeholder.replaceWith(img);
    loaded++;
  });
  return loaded;
}

// ── Heading actions ───────────────────────────────────────────────────────

interface ActionSpec {
  action: string;
  label: string;
  icon: IconName;
}

const HEADING_ACTIONS: ActionSpec[] = [
  { action: 'copy-section', label: 'Copy section', icon: 'copy' },
  { action: 'copy-section-markdown', label: 'Copy section as Markdown', icon: 'markdown' },
  { action: 'copy-link', label: 'Copy heading link', icon: 'link' },
  { action: 'toggle-collapse', label: 'Collapse section', icon: 'chevron' },
];

function markHeadings(headings: HeadingInfo[]): void {
  headings.forEach((heading, index) => heading.el.setAttribute('data-index', String(index)));
}

/** Adds the hover toolbar (copy section / Markdown / link, collapse) to one top-level heading. Safe to call twice. */
export function buildHeadingActions(heading: HeadingInfo, doc: Document = document): void {
  if (!heading.topLevel || heading.el.querySelector(':scope > .heading-actions')) return;

  // The toolbar lives inside the heading, so give the heading a clean accessible name.
  heading.el.setAttribute('aria-label', heading.text);

  const bar = doc.createElement('span');
  bar.className = 'heading-actions';
  bar.setAttribute('data-mdv-ui', '');
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Section actions');

  const specs = HEADING_ACTIONS.filter((spec) => spec.action !== 'copy-section-markdown' || heading.startLine !== null);
  specs.forEach((spec, i) => {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'heading-action';
    button.setAttribute('data-action', spec.action);
    button.setAttribute('aria-label', spec.label);
    button.setAttribute('title', spec.label);
    button.tabIndex = i === 0 ? 0 : -1; // one tab stop per heading; arrow keys move within
    if (spec.action === 'toggle-collapse') {
      const collapsed = heading.el.getAttribute('data-collapsed') === 'true';
      button.setAttribute('aria-expanded', String(!collapsed));
      if (collapsed) {
        button.setAttribute('aria-label', 'Expand section');
        button.setAttribute('title', 'Expand section');
      }
    }
    button.appendChild(icon(spec.icon, doc));
    bar.appendChild(button);
  });
  heading.el.appendChild(bar);
}
