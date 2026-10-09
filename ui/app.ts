import { ACCEPT_ATTRIBUTE } from '../lib/files';
import { createLocalStore, getBoolean, setBoolean } from '../lib/prefs';
import {
  applyTheme,
  isThemePreference,
  loadThemePreference,
  saveThemePreference,
  type ThemePreference,
} from '../lib/theme';
import { initAbout } from './about';
import { createDocumentView } from './documentView';
import { byId, isMac } from './dom';
import { closeAllMenus, initMenu } from './menu';
import { createSearchBar } from './searchBar';
import { createSupport } from './supportNote';
import { hideError } from './toast';

const TOC_OPEN_KEY = 'toc-open';

/** Wires the page together. All preferences stay in this browser profile (localStorage). */
export function startApp(): void {
  const store = createLocalStore();
  const app = byId('ui-app');

  // ── Core pieces ───────────────────────────────────────────────────────
  const support = createSupport(store);
  const view = createDocumentView({
    onOpened: () => support.documentOpened(),
    onContentChanged: () => search.refresh(),
  });
  const search = createSearchBar(() => view.searchRoot());
  const about = initAbout(support);

  // ── Theme ─────────────────────────────────────────────────────────────
  function initTheme(): void {
    let preference: ThemePreference = loadThemePreference(store);
    applyTheme(preference);

    initMenu(byId('ui-theme-button'), byId('ui-theme-menu'));
    const choices = Array.from(document.querySelectorAll<HTMLElement>('[data-theme-choice]'));
    const icon = byId('ui-theme-icon');
    const button = byId('ui-theme-button');
    const names: Record<ThemePreference, string> = { system: 'System', light: 'Light', dark: 'Dark' };
    const icons: Record<ThemePreference, string> = { system: '#i-monitor', light: '#i-sun', dark: '#i-moon' };

    const sync = () => {
      choices.forEach((el) => el.setAttribute('aria-checked', String(el.dataset.themeChoice === preference)));
      icon.setAttribute('href', icons[preference]);
      button.setAttribute('aria-label', `Theme: ${names[preference]}`);
      button.title = `Theme: ${names[preference]}`;
    };
    choices.forEach((el) =>
      el.addEventListener('click', () => {
        const choice = el.dataset.themeChoice;
        if (!isThemePreference(choice)) return;
        preference = choice;
        saveThemePreference(store, preference);
        applyTheme(preference);
        sync();
      }),
    );
    sync();
  }

  // ── Opening files: picker and drag-and-drop ───────────────────────────
  function initFileOpening(): void {
    const input = byId<HTMLInputElement>('ui-file-input');
    input.accept = ACCEPT_ATTRIBUTE;
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      input.value = ''; // allows choosing the same file again
      if (file) void view.openFile(file);
    });

    const pick = () => input.click();
    byId('ui-open').addEventListener('click', pick);
    byId('ui-open-hero').addEventListener('click', pick);
    openPicker = pick;

    const overlay = byId('ui-drop-overlay');
    const zone = byId('ui-dropzone');
    let depth = 0;
    const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files');
    const inField = (event: Event) => !!(event.target as Element | null)?.closest?.('input, textarea');
    const endDrag = () => {
      depth = 0;
      overlay.hidden = true;
      zone.dataset.active = 'false';
    };

    window.addEventListener('dragenter', (event) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth++;
      overlay.hidden = false;
      zone.dataset.active = 'true';
    });
    window.addEventListener('dragover', (event) => {
      if (inField(event)) return;
      event.preventDefault(); // stops Chrome from navigating to a dropped file or link
      if (event.dataTransfer) event.dataTransfer.dropEffect = hasFiles(event) ? 'copy' : 'none';
    });
    window.addEventListener('dragleave', (event) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) endDrag();
    });
    window.addEventListener('drop', (event) => {
      if (inField(event)) return;
      event.preventDefault();
      endDrag();
      const file = event.dataTransfer?.files?.[0];
      if (file) void view.openFile(file);
    });
  }
  let openPicker: () => void = () => undefined;

  // ── Toolbar buttons ───────────────────────────────────────────────────
  function initToolbarActions(): void {
    for (const id of ['ui-copy-markdown', 'ui-copy-markdown-menu']) {
      byId(id).addEventListener('click', () => void view.copyMarkdown());
    }
    for (const id of ['ui-print', 'ui-print-menu']) {
      byId(id).addEventListener('click', () => view.print());
    }
  }

  // ── Outline: open/close, overlay on narrow windows ────────────────────
  const narrow = window.matchMedia('(max-width: 900px)');
  let outlineWide = getBoolean(store, TOC_OPEN_KEY, true);
  let outlineNarrow = false;

  function setOutline(open: boolean, remember = true): void {
    if (narrow.matches) outlineNarrow = open;
    else {
      outlineWide = open;
      if (remember) setBoolean(store, TOC_OPEN_KEY, open);
    }
    syncOutline();
  }
  function syncOutline(): void {
    const open = narrow.matches ? outlineNarrow : outlineWide;
    app.dataset.toc = open ? 'open' : 'closed';
    byId('ui-toc-toggle').setAttribute('aria-expanded', String(open));
  }
  function isOutlineOverlayOpen(): boolean {
    return narrow.matches && app.dataset.toc === 'open';
  }

  function initOutlineToggle(): void {
    byId('ui-toc-toggle').addEventListener('click', () => {
      const open = app.dataset.toc !== 'open';
      setOutline(open);
      if (open && narrow.matches) byId('ui-toc').querySelector<HTMLElement>('a')?.focus();
    });
    byId('ui-toc-backdrop').addEventListener('click', () => setOutline(false));
    // Choosing a section on a narrow window closes the overlay.
    byId('ui-toc').addEventListener('click', (event) => {
      if (narrow.matches && (event.target as Element).closest('a.toc-link')) setOutline(false);
    });
    narrow.addEventListener('change', () => {
      outlineNarrow = false;
      syncOutline();
    });
    syncOutline();
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────
  function initKeyboard(): void {
    document.addEventListener('keydown', (event) => {
      const primary = isMac() ? event.metaKey : event.ctrlKey;
      const key = event.key.toLowerCase();

      if (primary && !event.altKey) {
        if (key === 'o' && !event.shiftKey) {
          event.preventDefault();
          openPicker();
          return;
        }
        if (key === 'f' && !event.shiftKey && view.hasDocument()) {
          event.preventDefault();
          search.open();
          return;
        }
        if (key === 'c' && event.shiftKey && view.hasDocument()) {
          event.preventDefault();
          void view.copyMarkdown();
          return;
        }
      }

      if (event.key === 'Escape') {
        if (closeAllMenus()) return;
        if (about.isOpen()) return; // the dialog closes itself
        if (search.isOpen()) {
          search.close();
          byId('ui-main').focus({ preventScroll: true });
          return;
        }
        if (isOutlineOverlayOpen()) {
          setOutline(false);
          byId('ui-toc-toggle').focus();
        }
      }
    });
  }

  // ── Start ─────────────────────────────────────────────────────────────
  initTheme();
  initFileOpening();
  initToolbarActions();
  initOutlineToggle();
  initKeyboard();
  initMenu(byId('ui-more-button'), byId('ui-more-menu'));
  byId('ui-error-close').addEventListener('click', hideError);
}
