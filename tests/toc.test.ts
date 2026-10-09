import { describe, expect, it } from 'vitest';
import { buildToc, renderTocList } from '../lib/toc';
import { lines, renderDoc } from './helpers';

const entry = (level: number, text: string) => ({ id: text.toLowerCase(), level, text });

describe('table of contents', () => {
  it('nests headings by level', () => {
    const tree = buildToc([entry(1, 'A'), entry(2, 'B'), entry(3, 'C'), entry(2, 'D'), entry(1, 'E')]);
    expect(tree.map((n) => n.text)).toEqual(['A', 'E']);
    expect(tree[0].children.map((n) => n.text)).toEqual(['B', 'D']);
    expect(tree[0].children[0].children.map((n) => n.text)).toEqual(['C']);
  });

  it('includes H1–H4 only by default', () => {
    const tree = buildToc([entry(1, 'a'), entry(4, 'b'), entry(5, 'c'), entry(6, 'd')]);
    const flat: string[] = [];
    const walk = (nodes: typeof tree) => nodes.forEach((n) => (flat.push(n.text), walk(n.children)));
    walk(tree);
    expect(flat).toEqual(['a', 'b']);
  });

  it('handles skipped levels (H1 → H3) and documents that start deep', () => {
    const tree = buildToc([entry(3, 'deep'), entry(1, 'top'), entry(3, 'skipped')]);
    expect(tree.map((n) => n.text)).toEqual(['deep', 'top']);
    expect(tree[1].children.map((n) => n.text)).toEqual(['skipped']);
  });

  it('returns an empty outline when there are no headings', () => {
    expect(buildToc([])).toEqual([]);
  });

  it('builds the TOC for a rendered document with stable links', () => {
    const md = lines('# Guide', '## Install', '### macOS', '## Install', '##### too deep');
    const first = renderDoc(md).headings;
    const second = renderDoc(md).headings;
    expect(first.map((h) => h.id)).toEqual(second.map((h) => h.id));

    const list = renderTocList(buildToc(first));
    const links = Array.from(list.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(links).toEqual(['#guide', '#install', '#macos', '#install-1']);
    expect(list.querySelector('ul ul ul')).not.toBeNull();
  });
});
