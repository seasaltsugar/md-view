import { describe, expect, it } from 'vitest';
import { markdownToHtml } from '../lib/markdown';
import { renderSafeHtml } from '../lib/render';
import { fragment, lines, renderDoc } from './helpers';

describe('basic Markdown rendering', () => {
  it('renders headings H1–H6', () => {
    const { root } = renderDoc(lines('# One', '## Two', '### Three', '#### Four', '##### Five', '###### Six'));
    for (let level = 1; level <= 6; level++) {
      expect(root.querySelectorAll(`h${level}`)).toHaveLength(1);
    }
  });

  it('renders emphasis, strong, strikethrough and inline code', () => {
    const html = renderSafeHtml('*it* **bold** ~~gone~~ `code`');
    expect(html).toContain('<em>it</em>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<s>gone</s>');
    expect(html).toContain('<code>code</code>');
  });

  it('renders ordered, unordered and nested lists', () => {
    const { root } = renderDoc(lines('- a', '  - nested', '    - deeper', '- b', '', '1. first', '2. second'));
    expect(root.querySelectorAll('ul')).toHaveLength(3);
    expect(root.querySelectorAll('ol li')).toHaveLength(2);
    expect(root.querySelector('ul ul ul li')?.textContent).toBe('deeper');
  });

  it('renders links, blockquotes and horizontal rules', () => {
    const { root } = renderDoc(lines('[site](https://example.com)', '', '> quoted', '', '---', '', 'after'));
    expect(root.querySelector('a')?.getAttribute('href')).toBe('https://example.com');
    expect(root.querySelector('blockquote')?.textContent?.trim()).toBe('quoted');
    expect(root.querySelectorAll('hr')).toHaveLength(1);
  });

  it('turns bare URLs into links but leaves file names like README.md alone', () => {
    const { root } = renderDoc('See https://example.com/docs and README.md for details.');
    const links = Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(links).toEqual(['https://example.com/docs']);
  });

  it('keeps inline data: images', () => {
    const png = 'data:image/png;base64,iVBORw0KGgo=';
    const { root } = renderDoc(`![dot](${png})`);
    expect(root.querySelector('img')?.getAttribute('src')).toBe(png);
  });

  it('does not throw on malformed Markdown', () => {
    const nasty = ['```js\nunclosed fence', '| a | b\n|--', '[link](', '<div><span>unclosed', '> > > > > > > deep', '\u0000 nul', '*'.repeat(500)];
    for (const source of nasty) {
      expect(() => renderSafeHtml(source)).not.toThrow();
    }
  });
});

describe('headings', () => {
  it('generates stable ids from heading text', () => {
    const { headings } = renderDoc(lines('# Getting Started', '## Install & Run', '## Café Menu'));
    expect(headings.map((h) => h.id)).toEqual(['getting-started', 'install--run', 'café-menu']);
  });

  it('makes repeated headings unique in document order', () => {
    const { headings } = renderDoc(lines('## Usage', '## Usage', '## Usage'));
    expect(headings.map((h) => h.id)).toEqual(['usage', 'usage-1', 'usage-2']);
  });

  it('records where each top-level heading starts in the source', () => {
    const { headings } = renderDoc(lines('# A', '', 'text', '', '## B'));
    expect(headings.map((h) => h.startLine)).toEqual([0, 4]);
  });
});

describe('code blocks', () => {
  it('highlights known languages and keeps the language class', () => {
    const html = renderSafeHtml('```js\nconst answer = 42;\n```');
    expect(html).toContain('language-js');
    expect(html).toContain('hljs-keyword');
  });

  it('escapes unknown languages instead of highlighting them', () => {
    const html = renderSafeHtml('```madeup\n<b>x</b> && y\n```');
    expect(html).toContain('language-madeup');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt; &amp;&amp; y');
    expect(html).not.toContain('hljs-');
  });

  it('never executes HTML placed inside code', () => {
    const { root } = renderDoc('```html\n<script>alert(1)</script>\n```');
    expect(root.querySelector('script')).toBeNull();
    expect(root.querySelector('code')?.textContent).toContain('<script>alert(1)</script>');
  });

  it('preserves whitespace and indentation', () => {
    const { root } = renderDoc('```python\ndef f():\n    return  1\n```');
    expect(root.querySelector('pre code')?.textContent).toBe('def f():\n    return  1\n');
  });

  it('renders indented code blocks', () => {
    const { root } = renderDoc('para\n\n    indented code\n');
    expect(root.querySelector('pre code')?.textContent).toContain('indented code');
  });

  it('skips highlighting when asked (large documents)', () => {
    const html = markdownToHtml('```js\nconst a = 1;\n```', { highlight: false });
    expect(html).not.toContain('hljs-');
  });

  it('adds a header with the language label and a Copy button', () => {
    const { root } = renderDoc('```ts\nlet x: number = 1;\n```');
    const block = root.querySelector('.code-block');
    expect(block).not.toBeNull();
    expect(block?.querySelector('.code-lang')?.textContent).toBe('TypeScript');
    const copy = block?.querySelector('button[data-action="copy-code"]');
    expect(copy?.getAttribute('aria-label')).toBe('Copy TypeScript code');
    expect(copy?.textContent).toBe('Copy');
  });
});

describe('tables', () => {
  const table = lines('| Name | Qty | Note |', '| :--- | ---: | :---: |', '| a | 1 | x |', '| b | 22 | y |');

  it('renders header and body rows', () => {
    const { root } = renderDoc(table);
    expect(root.querySelectorAll('thead th')).toHaveLength(3);
    expect(root.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('keeps column alignment without inline styles', () => {
    const { root } = renderDoc(table);
    const aligns = Array.from(root.querySelectorAll('thead th')).map((th) => th.getAttribute('align'));
    expect(aligns).toEqual(['left', 'right', 'center']);
    expect(root.querySelector('[style]')).toBeNull();
  });

  it('wraps tables in a horizontally scrollable container', () => {
    const { root } = renderDoc(table);
    const wrap = root.querySelector('.table-wrap');
    expect(wrap?.firstElementChild?.tagName).toBe('TABLE');
  });
});

describe('task lists', () => {
  it('renders checked and unchecked read-only checkboxes', () => {
    const { root } = renderDoc(lines('- [x] done', '- [ ] todo', '- plain'));
    const boxes = Array.from(root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
    expect(boxes).toHaveLength(2);
    expect(boxes.map((b) => b.hasAttribute('checked'))).toEqual([true, false]);
    expect(boxes.every((b) => b.hasAttribute('disabled'))).toBe(true);
    expect(root.querySelector('ul')?.classList.contains('contains-task-list')).toBe(true);
    expect(root.querySelectorAll('li.task-list-item')).toHaveLength(2);
  });

  it('removes the [ ] marker from the item text', () => {
    const { root } = renderDoc('- [x] ship it');
    expect(root.querySelector('li')?.textContent?.trim()).toBe('ship it');
  });
});

describe('footnotes', () => {
  it('links references to a numbered list with back-links', () => {
    const { root } = renderDoc(lines('Claim.[^a] Another.[^b]', '', '[^a]: First note.', '[^b]: Second note.'));
    expect(root.querySelectorAll('sup.footnote-ref a')).toHaveLength(2);
    expect(root.querySelectorAll('section.footnotes li')).toHaveLength(2);
    expect(root.querySelector('#fn-1')?.textContent).toContain('First note.');
    expect(root.querySelector('#fn-2 a.footnote-backref')?.getAttribute('href')).toBe('#fnref-2');
  });

  it('leaves [^x] alone when there is no definition', () => {
    const { root } = renderDoc('No definition [^missing] here.');
    expect(root.querySelector('sup')).toBeNull();
    expect(root.textContent).toContain('[^missing]');
  });
});

describe('alerts and front matter', () => {
  it('renders GitHub-style alerts', () => {
    const { root } = renderDoc(lines('> [!WARNING]', '> Careful here.'));
    const quote = root.querySelector('blockquote');
    expect(quote?.className).toContain('alert-warning');
    expect(quote?.querySelector('.alert-title')?.textContent).toBe('Warning');
    expect(quote?.textContent).toContain('Careful here.');
  });

  it('shows YAML front matter as a collapsed block instead of a heading', () => {
    const { root, headings } = renderDoc(lines('---', 'title: Hello', '---', '', '# Real heading'));
    expect(root.querySelector('details.front-matter')?.textContent).toContain('title: Hello');
    expect(headings.map((h) => h.text)).toEqual(['Real heading']);
    expect(fragment(renderSafeHtml('---\nnot front matter\n')).querySelector('details')).toBeNull();
  });
});
