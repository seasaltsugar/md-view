import type { HeadingInfo } from './headings';

/**
 * Collapsing hides a heading's section in the page. It never touches the original Markdown.
 * `collapsed` holds heading indexes. A collapsed heading hides everything up to the next heading
 * of the same or a higher level; collapsed state of inner headings is remembered while hidden.
 */
export function applyCollapse(article: Element, headings: readonly HeadingInfo[], collapsed: ReadonlySet<number>): void {
  const indexOf = new Map<Element, number>();
  headings.forEach((heading, i) => {
    if (heading.topLevel) indexOf.set(heading.el, i);
  });

  let hidingLevel = Infinity; // level of the collapsed heading currently hiding content
  for (const child of Array.from(article.children) as HTMLElement[]) {
    const i = indexOf.get(child);

    if (i !== undefined) {
      const level = headings[i].level;
      if (level <= hidingLevel) hidingLevel = Infinity;
      child.hidden = hidingLevel !== Infinity;
      const isCollapsed = collapsed.has(i);
      if (!child.hidden && isCollapsed) hidingLevel = level;

      child.setAttribute('data-collapsed', String(isCollapsed));
      const button = child.querySelector<HTMLElement>('[data-action="toggle-collapse"]');
      if (button) {
        const label = isCollapsed ? 'Expand section' : 'Collapse section';
        button.setAttribute('aria-expanded', String(!isCollapsed));
        button.setAttribute('aria-label', label);
        button.setAttribute('title', label);
      }
    } else if (child.classList.contains('footnotes')) {
      hidingLevel = Infinity; // footnotes always stay visible
      child.hidden = false;
    } else {
      child.hidden = hidingLevel !== Infinity;
    }
  }
}

/** Collapsed headings that currently hide `index`, so a link or search result can reveal it. */
export function collapsedAncestors(
  headings: readonly HeadingInfo[],
  collapsed: ReadonlySet<number>,
  index: number,
): number[] {
  const result: number[] = [];
  let level = headings[index].level;
  for (let i = index - 1; i >= 0; i--) {
    const heading = headings[i];
    if (!heading.topLevel || heading.level >= level) continue;
    level = heading.level;
    if (collapsed.has(i)) result.push(i);
  }
  return result;
}
