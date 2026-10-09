import { describe, expect, it } from 'vitest';
import { buildHeadingActions, enhanceDocument } from '../lib/document';
import { renderToFragment } from '../lib/render';
import { lines, renderDoc } from './helpers';

describe('document enhancement', () => {
  it('adds section actions to top-level headings, with one tab stop each', () => {
    const { headings } = renderDoc(lines('# One', '', 'text', '', '## Two'));
    for (const heading of headings) {
      const bar = heading.el.querySelector('[role="toolbar"]');
      expect(bar).not.toBeNull();
      const buttons = Array.from(bar!.querySelectorAll('button'));
      expect(buttons.map((b) => b.getAttribute('data-action'))).toEqual([
        'copy-section',
        'copy-section-markdown',
        'copy-link',
        'toggle-collapse',
      ]);
      expect(buttons.map((b) => b.tabIndex)).toEqual([0, -1, -1, -1]);
      expect(buttons.every((b) => (b.getAttribute('aria-label') ?? '') !== '')).toBe(true);
      expect(heading.el.getAttribute('aria-label')).toBe(heading.text);
    }
  });

  it('marks every control as app UI so search, copy and print can ignore it', () => {
    const { root } = renderDoc(lines('## Title', '', '```js', 'x()', '```'));
    root.querySelectorAll('button').forEach((button) => {
      expect(button.closest('[data-mdv-ui]')).not.toBeNull();
    });
  });

  it('offers no "Copy section as Markdown" for headings written in raw HTML', () => {
    const { headings } = renderDoc('<h2>Raw</h2>\n\ntext');
    const actions = Array.from(headings[0].el.querySelectorAll('button')).map((b) => b.getAttribute('data-action'));
    expect(actions).toEqual(['copy-section', 'copy-link', 'toggle-collapse']);
  });

  it('gives nested headings ids but no actions', () => {
    const { headings } = renderDoc('> ## Quoted heading\n\n# Top');
    expect(headings.map((h) => h.id)).toEqual(['quoted-heading', 'top']);
    expect(headings[0].topLevel).toBe(false);
    expect(headings[0].el.querySelector('button')).toBeNull();
    expect(headings[1].topLevel).toBe(true);
  });

  it('shows no language label for unlabeled code but keeps the Copy button', () => {
    const { root } = renderDoc('```\nplain\n```');
    expect(root.querySelector('.code-lang')?.textContent).toBe('');
    expect(root.querySelector('button[data-action="copy-code"]')?.getAttribute('aria-label')).toBe('Copy code');
  });

  it('gives task-list checkboxes an accessible name from their item text', () => {
    const { root } = renderDoc(lines('- [x] Ship the release', '  - [ ] Write notes', '- [ ] Celebrate'));
    const names = Array.from(root.querySelectorAll('input[type="checkbox"]')).map((b) => b.getAttribute('aria-label'));
    expect(names).toEqual(['Ship the release', 'Write notes', 'Celebrate']);
  });

  it('keeps raw HTML structure that is safe, such as <details> and <kbd>', () => {
    const { root } = renderDoc('<details><summary>More</summary>Hidden <kbd>Ctrl</kbd></details>');
    expect(root.querySelector('details summary')?.textContent).toBe('More');
    expect(root.querySelector('kbd')?.textContent).toBe('Ctrl');
  });

  it('can defer section actions for very heading-dense documents and build them on demand', () => {
    const root = renderToFragment(lines('# One', '', '## Two'));
    const { headings } = enhanceDocument(root, { lazyActions: true });
    expect(root.querySelectorAll('.heading-actions')).toHaveLength(0);
    expect(headings.map((h) => h.el.getAttribute('data-index'))).toEqual(['0', '1']);

    buildHeadingActions(headings[1]);
    buildHeadingActions(headings[1]); // idempotent
    expect(headings[1].el.querySelectorAll('.heading-actions')).toHaveLength(1);
    expect(headings[0].el.querySelector('.heading-actions')).toBeNull();
  });
});
