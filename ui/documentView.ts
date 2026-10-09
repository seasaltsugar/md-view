import { copyText } from '../lib/clipboard';
import { applyCollapse, collapsedAncestors } from '../lib/collapse';
import { LARGE_DOCUMENT_CHARS, LAZY_HEADING_ACTIONS_ABOVE, LONG_DOCUMENT_CHARS } from '../lib/config';
import { buildHeadingActions, enhanceDocument, loadRemoteImages } from '../lib/document';
import { AppError, toUserMessage } from '../lib/errors';
import { readMarkdownFile } from '../lib/files';
import type { HeadingInfo } from '../lib/headings';
import { renderToFragment } from '../lib/render';
import { elementsToPlainText, getSectionElements, getSectionMarkdown } from '../lib/sections';
import { anchorUrl, idFromHash } from '../lib/slug';
import { byId, nextPaint, prefersReducedMotion } from './dom';
import { showError, showToast, hideError } from './toast';
import { TocView } from './tocView';
import { icon } from '../lib/icons';

export type ViewMode = 'rendered' | 'source';

interface DocState {
  name: string;
  source: string;
  headings: HeadingInfo[];
  collapsed: Set<number>;
  indexByElement: Map<Element, number>;
}

interface Hooks {
  /** Called after a document has been shown successfully. */
  onOpened(): void;
  /** Called when visible text changed (collapse, mode switch, new document) so search can refresh. */
  onContentChanged(): void;
}

/**
 * Owns everything about the open document: loading and rendering a file, the rendered/source
 * switch, the outline, heading and code actions, collapsing, links and printing.
 */
export function createDocumentView(hooks: Hooks) {
  const app = byId('ui-app');
  const docSection = byId('ui-doc');
  const article = byId('ui-article');
  const sourcePre = byId('ui-source');
  const sourceCode = byId('ui-source-code');
  const notices = byId('ui-notices');
  const fileName = byId('ui-file-name');
  const progress = byId('ui-progress');
  const renderedButton = byId('ui-view-rendered');
  const sourceButton = byId('ui-view-source');

  let doc: DocState | null = null;
  let mode: ViewMode = 'rendered';
  let sourceStale = true;
  let lazyActions = false;

  // ── Outline ───────────────────────────────────────────────────────────
  const toc = new TocView(byId('ui-toc-scroll'), byId('ui-toc-list'), (id) => {
    if (mode === 'source') setMode('rendered');
    goToId(id);
  });

  // ── Opening a file ────────────────────────────────────────────────────
  function setBusy(busy: boolean): void {
    progress.hidden = !busy;
    app.setAttribute('aria-busy', String(busy));
  }

  async function openFile(file: File): Promise<void> {
    setBusy(true);
    try {
      const loaded = await readMarkdownFile(file);
      await nextPaint(); // let the progress bar show before heavy rendering
      const large = loaded.text.length > LARGE_DOCUMENT_CHARS;

      let rendered: ReturnType<typeof render>;
      try {
        rendered = render(loaded.text, large);
      } catch (error) {
        console.error(error);
        throw new AppError(
          'render-failed',
          `MD View couldn’t display “${loaded.name}”. The file wasn’t changed. Try another file, or open it in a text editor.`,
        );
      }

      commit(loaded.name, loaded.text, rendered, large);
      hideError();
      showToast(`Opened ${loaded.name}`);
      hooks.onOpened();
    } catch (error) {
      if (!(error instanceof AppError)) console.error(error);
      showError(toUserMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function render(text: string, large: boolean) {
    const root = renderToFragment(text, { highlight: !large });
    const headingCount = root.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
    lazyActions = headingCount > LAZY_HEADING_ACTIONS_ABOVE;
    return { root, ...enhanceDocument(root, { lazyActions }) };
  }

  function commit(name: string, source: string, rendered: ReturnType<typeof render>, large: boolean): void {
    const indexByElement = new Map<Element, number>();
    rendered.headings.forEach((h, i) => indexByElement.set(h.el, i));
    doc = { name, source, headings: rendered.headings, collapsed: new Set(), indexByElement };

    article.replaceChildren(rendered.root);
    article.classList.toggle('is-long', source.length > LONG_DOCUMENT_CHARS);
    sourceStale = true;

    fileName.textContent = name;
    fileName.title = name;
    document.title = `${name} — MD View`;

    const hasToc = toc.render(rendered.headings);
    app.dataset.hasToc = String(hasToc);
    app.dataset.state = 'doc';
    docSection.hidden = false;

    renderNotices(rendered.remoteImageCount, large);
    setMode('rendered', true);
    window.scrollTo(0, 0);
    hooks.onContentChanged();
  }

  // ── Notices (remote images, large files) ──────────────────────────────
  function renderNotices(remoteImages: number, large: boolean): void {
    notices.replaceChildren();

    if (remoteImages > 0) {
      const notice = document.createElement('div');
      notice.className = 'notice';
      notice.appendChild(icon('image'));
      const text = document.createElement('p');
      text.textContent =
        remoteImages === 1
          ? 'This document links to 1 image on another website. It’s blocked so nothing is requested while you read.'
          : `This document links to ${remoteImages} images on other websites. They’re blocked so nothing is requested while you read.`;
      const load = document.createElement('button');
      load.type = 'button';
      load.className = 'btn';
      load.textContent = remoteImages === 1 ? 'Load image' : 'Load images';
      load.title = 'Loading contacts the websites that host the images';
      load.addEventListener('click', () => {
        const count = loadRemoteImages(article);
        notice.remove();
        showToast(count === 1 ? 'Loaded 1 image' : `Loaded ${count} images`);
        hooks.onContentChanged();
      });
      notice.append(text, load);
      notices.appendChild(notice);
    }

    if (large) {
      const notice = document.createElement('div');
      notice.className = 'notice';
      notice.appendChild(icon('info'));
      const text = document.createElement('p');
      text.textContent = 'This is a large file, so syntax highlighting is off to keep reading fast.';
      notice.appendChild(text);
      notices.appendChild(notice);
    }
  }

  // ── Rendered / source ─────────────────────────────────────────────────
  function setMode(next: ViewMode, silent = false): void {
    mode = next;
    renderedButton.setAttribute('aria-pressed', String(next === 'rendered'));
    sourceButton.setAttribute('aria-pressed', String(next === 'source'));
    article.hidden = next === 'source';
    sourcePre.hidden = next !== 'source';
    notices.hidden = next === 'source';

    if (next === 'source' && doc && sourceStale) {
      sourceCode.textContent = doc.source;
      sourceStale = false;
    }
    toc.refresh();
    if (!silent) hooks.onContentChanged();
  }

  renderedButton.addEventListener('click', () => doc && setMode('rendered'));
  sourceButton.addEventListener('click', () => doc && setMode('source'));

  // ── Navigation ────────────────────────────────────────────────────────
  function revealElement(target: Element): void {
    if (!doc) return;
    let top: Element = target;
    while (top.parentElement && top.parentElement !== article) top = top.parentElement;

    // Find the heading that owns this element, then expand whatever hides it.
    let owner: number | undefined;
    for (let el: Element | null = top; el; el = el.previousElementSibling) {
      owner = doc.indexByElement.get(el);
      if (owner !== undefined) break;
    }
    if (owner === undefined) return;

    const toExpand = collapsedAncestors(doc.headings, doc.collapsed, owner);
    if (top !== doc.headings[owner].el && doc.collapsed.has(owner)) toExpand.push(owner);
    if (toExpand.length === 0) return;
    toExpand.forEach((i) => doc!.collapsed.delete(i));
    applyCollapse(article, doc.headings, doc.collapsed);
    toc.refresh();
    hooks.onContentChanged();
  }

  function goToId(id: string): void {
    if (mode === 'source') setMode('rendered');
    const target = article.querySelector<HTMLElement>(`[id="${CSS.escape(id)}"]`);
    if (!target) return;
    revealElement(target);
    target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    toc.setActive(id);
    try {
      history.replaceState(null, '', `#${encodeURIComponent(id)}`);
    } catch {
      /* some contexts disallow this; the scroll already happened */
    }
  }

  // ── Delegated clicks inside the document ──────────────────────────────
  article.addEventListener('click', (event) => {
    const element = event.target as Element;
    const control = element.closest<HTMLElement>('[data-action]');

    if (control) {
      const action = control.dataset.action ?? '';
      if (action === 'copy-code') void copyCode(control);
      else {
        const heading = control.closest<HTMLElement>('h1, h2, h3, h4, h5, h6');
        if (heading) void headingAction(action, heading);
      }
      return;
    }

    const link = element.closest<HTMLAnchorElement>('a[href^="#"]');
    if (link) {
      event.preventDefault();
      goToId(idFromHash(link.getAttribute('href') ?? ''));
    }
  });

  // Very heading-dense documents build each heading's toolbar the first time it is hovered or touched.
  article.addEventListener('pointerover', (event) => {
    if (!lazyActions || !doc) return;
    const heading = (event.target as Element).closest<HTMLElement>('h1, h2, h3, h4, h5, h6');
    const info = heading ? doc.headings[Number(heading.dataset.index)] : undefined;
    if (info) buildHeadingActions(info);
  });

  // Arrow keys move between a heading's action buttons (one tab stop per heading).
  article.addEventListener('keydown', (event) => {
    const bar = (event.target as Element).closest('.heading-actions');
    if (!bar) return;
    const buttons = Array.from(bar.querySelectorAll<HTMLButtonElement>('button'));
    const current = buttons.indexOf(event.target as HTMLButtonElement);
    let next = -1;
    if (event.key === 'ArrowRight') next = (current + 1) % buttons.length;
    else if (event.key === 'ArrowLeft') next = (current - 1 + buttons.length) % buttons.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = buttons.length - 1;
    if (next < 0) return;
    event.preventDefault();
    buttons.forEach((b, i) => (b.tabIndex = i === next ? 0 : -1));
    buttons[next].focus();
  });

  async function copyCode(button: HTMLElement): Promise<void> {
    const code = button.closest('.code-block')?.querySelector('pre')?.textContent ?? '';
    try {
      await copyText(code.replace(/\n$/, ''));
      const original = button.textContent;
      button.textContent = 'Copied';
      window.setTimeout(() => (button.textContent = original), 1600);
      showToast('Code copied');
    } catch (error) {
      showError(toUserMessage(error));
    }
  }

  async function headingAction(action: string, heading: HTMLElement): Promise<void> {
    if (!doc) return;
    const index = Number(heading.dataset.index);
    const info = doc.headings[index];
    if (!info) return;

    try {
      switch (action) {
        case 'copy-section':
          await copyText(elementsToPlainText(getSectionElements(doc.headings, index)));
          showToast('Section copied');
          break;
        case 'copy-section-markdown': {
          const markdown = getSectionMarkdown(doc.source, doc.headings, index);
          if (markdown === null) return;
          await copyText(markdown);
          showToast('Section copied as Markdown');
          break;
        }
        case 'copy-link':
          await copyText(anchorUrl(location.href, info.id));
          showToast('Heading link copied');
          break;
        case 'toggle-collapse':
          if (doc.collapsed.has(index)) doc.collapsed.delete(index);
          else doc.collapsed.add(index);
          applyCollapse(article, doc.headings, doc.collapsed);
          toc.refresh();
          hooks.onContentChanged();
          break;
      }
    } catch (error) {
      showError(toUserMessage(error));
    }
  }

  // ── Whole-document actions ────────────────────────────────────────────
  async function copyMarkdown(): Promise<void> {
    if (!doc) return;
    try {
      await copyText(doc.source);
      showToast('Markdown copied');
    } catch (error) {
      showError(toUserMessage(error));
    }
  }

  function print(): void {
    if (!doc) return;
    try {
      window.print();
    } catch {
      showError('MD View couldn’t open the print dialog. Press Ctrl+P (or ⌘P) to print instead.');
    }
  }

  // Printing shows every section, even ones collapsed on screen.
  window.addEventListener('beforeprint', () => {
    if (doc) applyCollapse(article, doc.headings, new Set());
  });
  window.addEventListener('afterprint', () => {
    if (doc) applyCollapse(article, doc.headings, doc.collapsed);
  });

  return {
    openFile,
    copyMarkdown,
    print,
    setMode,
    getMode: () => mode,
    hasDocument: () => doc !== null,
    /** The element search should look inside. */
    searchRoot: (): Element | null => (doc ? (mode === 'source' ? sourcePre : article) : null),
    /** Scroll to a heading by id (used for #links). */
    goToId,
  };
}

export type DocumentView = ReturnType<typeof createDocumentView>;
