import type { HeadingInfo } from '../lib/headings';
import { idFromHash } from '../lib/slug';
import { buildToc, renderTocList } from '../lib/toc';

/** A heading counts as "reached" once its top edge is above this line (px from the top of the window). */
const READING_LINE = 128;

/**
 * The sticky outline: renders nested links for H1–H4 and keeps the current section highlighted
 * while scrolling.
 *
 * Tracking walks forward/backward from the last known heading by position, once per animation
 * frame. That is cheap (usually zero or one heading checked) and stays correct after big jumps
 * such as Home/End, search results or anchor links.
 */
export class TocView {
  private items: HeadingInfo[] = [];
  private index = -1;
  private activeId: string | null = null;
  private frame = 0;

  constructor(
    private readonly scroller: HTMLElement,
    private readonly host: HTMLElement,
    private readonly navigate: (id: string) => void,
  ) {
    host.addEventListener('click', (event) => {
      const link = (event.target as Element).closest<HTMLAnchorElement>('a.toc-link');
      if (!link) return;
      event.preventDefault();
      this.navigate(idFromHash(link.getAttribute('href') ?? ''));
    });
    window.addEventListener('scroll', this.schedule, { passive: true });
    window.addEventListener('resize', this.schedule, { passive: true });
  }

  /** Builds the outline. Returns false when the document has no H1–H4 headings. */
  render(headings: HeadingInfo[]): boolean {
    this.host.replaceChildren();
    this.items = headings.filter((h) => h.level <= 4);
    this.index = -1;
    this.activeId = null;
    const tree = buildToc(headings);
    if (tree.length === 0) {
      this.items = [];
      return false;
    }
    this.host.appendChild(renderTocList(tree));
    this.schedule();
    return true;
  }

  /** Recompute the current section (after collapsing, switching views, etc.). */
  refresh(): void {
    this.schedule();
  }

  setActive(id: string | null): void {
    if (id === this.activeId) return;
    this.activeId = id;
    this.host.querySelectorAll('[aria-current]').forEach((el) => el.removeAttribute('aria-current'));
    if (!id) return;
    const link = this.host.querySelector<HTMLElement>(`a.toc-link[data-id="${CSS.escape(id)}"]`);
    if (!link) return;
    link.setAttribute('aria-current', 'location');

    // Keep the active link comfortably inside the sidebar.
    const top = link.offsetTop;
    const { scrollTop, clientHeight } = this.scroller;
    if (top < scrollTop + 48 || top > scrollTop + clientHeight - 72) {
      this.scroller.scrollTop = Math.max(0, top - clientHeight / 3);
    }
  }

  private schedule = (): void => {
    if (this.frame !== 0 || this.items.length === 0) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.update();
    });
  };

  /** Top edge of a heading, or null when it isn't rendered (collapsed section, source view). */
  private topOf(k: number): number | null {
    const rect = this.items[k].el.getBoundingClientRect();
    return rect.width === 0 && rect.height === 0 ? null : rect.top;
  }

  private update(): void {
    const count = this.items.length;
    let i = this.index;

    for (let j = i + 1; j < count; j++) {
      const top = this.topOf(j);
      if (top === null) continue;
      if (top <= READING_LINE) i = j;
      else break;
    }
    while (i >= 0) {
      const top = this.topOf(i);
      if (top !== null && top <= READING_LINE) break;
      i--;
    }

    // Before the first heading is reached (e.g. a notice or front matter sits above it), highlight the first one.
    if (i < 0 && window.scrollY < 4) {
      for (let j = 0; j < count; j++) {
        if (this.topOf(j) !== null) {
          i = j;
          break;
        }
      }
    }

    // At the very bottom, the last visible heading is the current one even if it never reached the line.
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    if (atBottom && i >= 0) {
      for (let j = count - 1; j > i; j--) {
        if (this.topOf(j) !== null) {
          i = j;
          break;
        }
      }
    }

    this.index = i;
    this.setActive(i >= 0 ? this.items[i].id : null);
  }
}
