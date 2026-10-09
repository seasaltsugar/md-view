import { MAX_SEARCH_MATCHES } from './config';

/**
 * In-document search.
 *
 * Matches are found in the text of the page and painted with the CSS Custom Highlight API,
 * so the document DOM is never modified (no <mark> wrappers, no re-render).
 */

export interface TextMatch {
  start: number;
  end: number;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Case-insensitive matches of `query` in `text`. Whitespace in the query matches any run of whitespace. */
export function findMatches(text: string, query: string, limit: number = Infinity): TextMatch[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const pattern = trimmed.split(/\s+/).map(escapeRegExp).join('\\s+');
  const regex = new RegExp(pattern, 'gi');
  const matches: TextMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null && matches.length < limit) {
    matches.push({ start: m.index, end: m.index + m[0].length });
    if (m[0].length === 0) regex.lastIndex++;
  }
  return matches;
}

const BLOCK_SELECTOR =
  'p, li, td, th, pre, h1, h2, h3, h4, h5, h6, blockquote, dt, dd, figcaption, summary, caption, div, details, section, tr';

export interface CollectedRanges {
  ranges: Range[];
  truncated: boolean;
}

/** Finds `query` in the visible text under `root` and returns a Range for each match. */
export function collectRanges(root: Node, query: string, limit: number = MAX_SEARCH_MATCHES): CollectedRanges {
  const doc = root.ownerDocument ?? document;
  const ranges: Range[] = [];
  let truncated = false;

  const walker = doc.createTreeWalker(root, 0x1 /* SHOW_ELEMENT */ | 0x4 /* SHOW_TEXT */, {
    acceptNode(node: Node): number {
      if (node.nodeType === 1) {
        const el = node as Element;
        // Skip collapsed sections and the app's own controls.
        return el.hasAttribute('hidden') || el.hasAttribute('data-mdv-ui') ? 2 /* REJECT */ : 3 /* SKIP */;
      }
      return 1; /* ACCEPT */
    },
  });

  let currentBlock: Element | null = null;
  let group: Text[] = [];

  const flush = () => {
    if (group.length === 0 || truncated) {
      group = [];
      return;
    }
    const text = group.map((node) => node.data).join('');
    const matches = findMatches(text, query, limit - ranges.length + 1);
    let nodeIndex = 0;
    let nodeStart = 0;
    for (const match of matches) {
      if (ranges.length >= limit) {
        truncated = true;
        break;
      }
      while (nodeIndex < group.length - 1 && nodeStart + group[nodeIndex].data.length <= match.start) {
        nodeStart += group[nodeIndex].data.length;
        nodeIndex++;
      }
      let endIndex = nodeIndex;
      let endStart = nodeStart;
      while (endIndex < group.length - 1 && endStart + group[endIndex].data.length < match.end) {
        endStart += group[endIndex].data.length;
        endIndex++;
      }
      const range = doc.createRange();
      range.setStart(group[nodeIndex], match.start - nodeStart);
      range.setEnd(group[endIndex], match.end - endStart);
      ranges.push(range);
    }
    group = [];
  };

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    const block = text.parentElement?.closest(BLOCK_SELECTOR) ?? null;
    if (block !== currentBlock) {
      flush();
      currentBlock = block;
    }
    group.push(text);
    if (truncated) break;
  }
  flush();
  return { ranges, truncated };
}

// ── Painting & navigation ──────────────────────────────────────────────

export interface SearchStatus {
  query: string;
  count: number;
  /** 1-based index of the current match, 0 when there are none. */
  current: number;
  truncated: boolean;
}

interface HighlightApi {
  registry: Map<string, unknown>;
  Highlight: new (...ranges: Range[]) => { priority: number };
}

function highlightApi(): HighlightApi | null {
  const css = (globalThis as { CSS?: { highlights?: Map<string, unknown> } }).CSS;
  const Highlight = (globalThis as { Highlight?: HighlightApi['Highlight'] }).Highlight;
  return css?.highlights && Highlight ? { registry: css.highlights, Highlight } : null;
}

export class DocumentSearch {
  private ranges: Range[] = [];
  private index = -1;
  private query = '';
  private truncated = false;

  constructor(private readonly getRoot: () => Element | null) {}

  /** Runs a new search. `keepPosition` re-finds matches after the view changed without jumping. */
  run(query: string, keepPosition = false): SearchStatus {
    const root = this.getRoot();
    const previous = this.index;
    this.query = query;
    if (!root || !query.trim()) {
      this.ranges = [];
      this.index = -1;
      this.truncated = false;
    } else {
      const found = collectRanges(root, query);
      this.ranges = found.ranges;
      this.truncated = found.truncated;
      this.index = this.ranges.length === 0 ? -1 : keepPosition && previous >= 0 ? Math.min(previous, this.ranges.length - 1) : 0;
    }
    this.paint();
    if (!keepPosition) this.reveal();
    return this.status();
  }

  step(direction: 1 | -1): SearchStatus {
    if (this.ranges.length > 0) {
      this.index = (this.index + direction + this.ranges.length) % this.ranges.length;
      this.paint();
      this.reveal();
    }
    return this.status();
  }

  clear(): void {
    this.ranges = [];
    this.index = -1;
    this.query = '';
    this.truncated = false;
    this.paint();
  }

  status(): SearchStatus {
    return {
      query: this.query,
      count: this.ranges.length,
      current: this.index >= 0 ? this.index + 1 : 0,
      truncated: this.truncated,
    };
  }

  private paint(): void {
    const api = highlightApi();
    if (!api) return;
    api.registry.delete('mdv-search');
    api.registry.delete('mdv-search-current');
    if (this.ranges.length === 0) return;
    api.registry.set('mdv-search', new api.Highlight(...this.ranges));
    if (this.index >= 0) {
      const current = new api.Highlight(this.ranges[this.index]);
      current.priority = 1;
      api.registry.set('mdv-search-current', current);
    }
  }

  /** Scrolls the current match into view, opening any closed <details> around it. */
  private reveal(): void {
    const range = this.ranges[this.index];
    if (!range) return;

    let el: Element | null = range.startContainer.parentElement;
    while (el) {
      const closed = el.closest('details:not([open])');
      if (!closed) break;
      closed.setAttribute('open', '');
      el = closed.parentElement;
    }

    if (!highlightApi()) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    const rect = range.getBoundingClientRect();
    const scroller = range.startContainer.parentElement?.closest('pre, .table-wrap') as HTMLElement | null;
    if (scroller) {
      const box = scroller.getBoundingClientRect();
      if (rect.left < box.left || rect.right > box.right) scroller.scrollLeft += rect.left - box.left - box.width * 0.25;
      if (rect.top < box.top || rect.bottom > box.bottom) scroller.scrollTop += rect.top - box.top - box.height * 0.3;
    }
    const after = range.getBoundingClientRect();
    const top = 120; // below the sticky toolbar + search bar
    const bottom = window.innerHeight - 60;
    if (after.top < top || after.bottom > bottom) {
      window.scrollBy({ top: after.top - window.innerHeight * 0.35, behavior: 'auto' });
    }
  }
}
