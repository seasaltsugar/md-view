import { describe, expect, it } from 'vitest';
import { applyCollapse, collapsedAncestors } from '../lib/collapse';
import { elementsToPlainText, getSectionElements, getSectionMarkdown, sectionEndIndex } from '../lib/sections';
import { lines, renderDoc } from './helpers';

const DOC = lines(
  '# Title',
  '',
  'Intro paragraph.',
  '',
  '## Alpha',
  '',
  'Alpha text with **bold**.',
  '',
  '### Alpha detail',
  '',
  '- one',
  '- two',
  '',
  '## Beta',
  '',
  '```md',
  '# not a heading',
  '```',
  '',
  'Beta end.',
);

describe('section extraction', () => {
  it('ends a section at the next heading of the same or higher level', () => {
    const { headings } = renderDoc(DOC);
    expect(headings.map((h) => h.text)).toEqual(['Title', 'Alpha', 'Alpha detail', 'Beta']);
    expect(sectionEndIndex(headings, 1)).toBe(3); // Alpha ends at Beta
    expect(sectionEndIndex(headings, 2)).toBe(3); // Alpha detail ends at Beta
    expect(sectionEndIndex(headings, 0)).toBe(4); // Title runs to the end
  });

  it('copies the original Markdown of a section, including nested subsections', () => {
    const { headings } = renderDoc(DOC);
    expect(getSectionMarkdown(DOC, headings, 1)).toBe(
      lines('## Alpha', '', 'Alpha text with **bold**.', '', '### Alpha detail', '', '- one', '- two'),
    );
    expect(getSectionMarkdown(DOC, headings, 2)).toBe(lines('### Alpha detail', '', '- one', '- two'));
  });

  it('copies the last section to the end of the file and ignores "#" inside code fences', () => {
    const { headings } = renderDoc(DOC);
    const beta = getSectionMarkdown(DOC, headings, 3);
    expect(beta).toBe(lines('## Beta', '', '```md', '# not a heading', '```', '', 'Beta end.'));
  });

  it('supports setext headings and Windows line endings', () => {
    const source = 'Top\n===\r\n\r\ntext\r\n\r\nSub\r\n---\r\n\r\nmore\r\n';
    const { headings } = renderDoc(source);
    expect(headings.map((h) => h.text)).toEqual(['Top', 'Sub']);
    expect(getSectionMarkdown(source, headings, 1)).toBe('Sub\n---\n\nmore');
  });

  it('returns null for headings without a source position', () => {
    const { headings } = renderDoc('<h2>From HTML</h2>\n\ntext');
    expect(headings).toHaveLength(1);
    expect(getSectionMarkdown('<h2>From HTML</h2>\n\ntext', headings, 0)).toBeNull();
  });
});

describe('copy section (rendered text)', () => {
  it('collects the heading and its content, stopping at the next heading of the same level', () => {
    const { headings } = renderDoc(DOC);
    const tags = getSectionElements(headings, 1).map((el) => el.tagName);
    expect(tags).toEqual(['H2', 'P', 'H3', 'UL']);
  });

  it('produces readable plain text for paragraphs, lists, code and tables', () => {
    const md = lines('## Mix', '', 'Some *styled* text.', '', '- a', '  - nested', '- b', '', '1. x', '2. y', '', '```js', 'let a = 1;', '```', '', '| H1 | H2 |', '| -- | -- |', '| c1 | c2 |');
    const { headings } = renderDoc(md);
    const text = elementsToPlainText(getSectionElements(headings, 0));
    expect(text).toBe(lines('Mix', '', 'Some styled text.', '', '- a', '  - nested', '- b', '', '1. x', '2. y', '', 'let a = 1;', '', 'H1\tH2', 'c1\tc2'));
  });

  it('leaves out copy buttons and heading action controls', () => {
    const { headings } = renderDoc(lines('## Code', '', '```js', 'run();', '```'));
    const text = elementsToPlainText(getSectionElements(headings, 0));
    expect(text).toBe('Code\n\nrun();');
    expect(text).not.toContain('Copy');
  });

  it('writes task items with [x] / [ ] markers', () => {
    const { headings } = renderDoc(lines('## Todo', '', '- [x] done', '- [ ] open'));
    expect(elementsToPlainText(getSectionElements(headings, 0))).toBe('Todo\n\n- [x] done\n- [ ] open');
  });

  it('does not include the footnotes list in the last section', () => {
    const { headings } = renderDoc(lines('## Notes', '', 'Claim.[^1]', '', '[^1]: The note.'));
    const text = elementsToPlainText(getSectionElements(headings, 0));
    expect(text).toContain('Claim.');
    expect(text).not.toContain('The note.');
  });
});

describe('collapsing sections', () => {
  it('hides a section without touching the source and restores it', () => {
    const { root, headings } = renderDoc(DOC);
    const article = document.createElement('div');
    article.append(root);

    applyCollapse(article, headings, new Set([1])); // collapse Alpha
    const hidden = Array.from(article.children).filter((el) => (el as HTMLElement).hidden).map((el) => el.tagName);
    expect(hidden).toEqual(['P', 'H3', 'UL']);
    expect(headings[1].el.getAttribute('data-collapsed')).toBe('true');
    expect(headings[1].el.querySelector('[data-action="toggle-collapse"]')?.getAttribute('aria-expanded')).toBe('false');

    applyCollapse(article, headings, new Set());
    expect(Array.from(article.children).some((el) => (el as HTMLElement).hidden)).toBe(false);
  });

  it('keeps inner collapsed state while an outer section is collapsed, and can find what hides a heading', () => {
    const { root, headings } = renderDoc(DOC);
    const article = document.createElement('div');
    article.append(root);

    const collapsed = new Set([0, 2]); // Title and Alpha detail
    applyCollapse(article, headings, collapsed);
    expect(Array.from(article.children).every((el, i) => i === 0 || (el as HTMLElement).hidden)).toBe(true);
    expect(collapsedAncestors(headings, collapsed, 3)).toEqual([0]);

    applyCollapse(article, headings, new Set([2]));
    expect(headings[3].el.hidden).toBe(false);
    expect((headings[2].el.nextElementSibling as HTMLElement).hidden).toBe(true);
  });
});
