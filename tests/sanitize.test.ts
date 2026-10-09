import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from '../lib/sanitize';
import { loadRemoteImages } from '../lib/document';
import { renderSafeHtml } from '../lib/render';
import { fragment, renderDoc } from './helpers';

describe('HTML sanitization', () => {
  it('removes <script> elements and their contents', () => {
    const html = renderSafeHtml('Hello\n\n<script>window.pwned = true</script>\n\nWorld');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('pwned');
    expect(html).toContain('Hello');
    expect(html).toContain('World');
  });

  it('removes inline event handlers', () => {
    const html = renderSafeHtml('<div onclick="alert(1)" onmouseover="alert(2)">x</div><img src="x" onerror="alert(3)">');
    expect(html).not.toMatch(/onclick|onmouseover|onerror/i);
  });

  it('removes iframes, objects, embeds, forms, styles, svg and meta/base/link tags', () => {
    const dirty = [
      '<iframe src="https://evil.example"></iframe>',
      '<object data="x"></object>',
      '<embed src="x">',
      '<form action="https://evil.example"><button>go</button></form>',
      '<style>body{display:none}</style>',
      '<svg onload="alert(1)"><circle/></svg>',
      '<math><mi>x</mi></math>',
      '<meta http-equiv="refresh" content="0;url=https://evil.example">',
      '<base href="https://evil.example/">',
      '<link rel="stylesheet" href="https://evil.example/x.css">',
      '<video src="x"></video><audio src="x"></audio>',
    ].join('\n');
    const root = fragment(renderSafeHtml(dirty));
    for (const tag of ['iframe', 'object', 'embed', 'form', 'style', 'svg', 'math', 'meta', 'base', 'link', 'video', 'audio', 'button']) {
      expect(root.querySelector(tag)).toBeNull();
    }
  });

  it('neutralizes javascript: and data: links', () => {
    const dirty = [
      '[a](javascript:alert(1))',
      '<a href="javascript:alert(2)">b</a>',
      '<a href="jav&#x09;ascript:alert(3)">c</a>',
      '<a href="  JaVaScRiPt:alert(4)">d</a>',
      '<a href="data:text/html,<script>alert(5)</script>">e</a>',
      '<a href="vbscript:msgbox(6)">f</a>',
    ].join('\n\n');
    const root = fragment(renderSafeHtml(dirty));
    root.querySelectorAll('a').forEach((a) => {
      expect(a.getAttribute('href') ?? '').not.toMatch(/javascript|vbscript|data:/i);
    });
    expect(renderSafeHtml(dirty)).not.toMatch(/alert\(\d\)"/);
  });

  it('strips inline style attributes', () => {
    const html = renderSafeHtml('<p style="position:fixed;inset:0;background:red">overlay</p>');
    expect(html).not.toContain('style=');
  });

  it('keeps only read-only checkboxes from <input>', () => {
    const root = fragment(renderSafeHtml('<input type="text" value="x"><input type="checkbox" checked>'));
    const inputs = root.querySelectorAll('input');
    expect(inputs).toHaveLength(1);
    expect(inputs[0].getAttribute('type')).toBe('checkbox');
    expect(inputs[0].hasAttribute('disabled')).toBe(true);
  });

  it('drops CSS classes that could imitate app UI and keeps renderer classes', () => {
    const root = fragment(renderSafeHtml('<p class="toolbar fixed inset-0">x</p>\n\n```js\nlet a\n```'));
    expect(root.querySelector('p')?.hasAttribute('class')).toBe(false);
    expect(root.querySelector('.hljs-keyword')).not.toBeNull();
  });

  it('drops ids that would collide with the app (ui-*) but keeps normal ids', () => {
    const root = fragment(sanitizeHtml('<h2 id="ui-toolbar">a</h2><h2 id="intro">b</h2>'));
    const [first, second] = Array.from(root.querySelectorAll('h2'));
    expect(first.id).toBe('');
    expect(second.id).toBe('intro');
  });

  it('opens external links in a new tab without leaking the opener or referrer', () => {
    const root = fragment(renderSafeHtml('[x](https://example.com) <a href="http://example.org">y</a> [local](#section)'));
    const [web, plain, anchor] = Array.from(root.querySelectorAll('a'));
    for (const a of [web, plain]) {
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    }
    expect(anchor.getAttribute('target')).toBeNull();
  });

  it('drops relative links that cannot be resolved', () => {
    const root = fragment(renderSafeHtml('[other](./other.md) [abs](/etc/passwd) [proto](//evil.example/x)'));
    root.querySelectorAll('a').forEach((a) => expect(a.hasAttribute('href')).toBe(false));
  });
});

describe('no network requests while reading', () => {
  it('never leaves a remote URL in an image src attribute', () => {
    const dirty = '![pixel](https://tracker.example/p.gif) <img src="https://tracker.example/q.png"> <img src="http://tracker.example/r.png">';
    const root = fragment(renderSafeHtml(dirty));
    root.querySelectorAll('img').forEach((img) => {
      expect(img.getAttribute('src')).toBeNull();
    });
  });

  it('replaces blocked images with placeholders and counts remote ones', () => {
    const { root, remoteImageCount } = renderDoc('![logo](https://cdn.example/logo.png)\n\n![local](./pic.png)');
    expect(remoteImageCount).toBe(1);
    expect(root.querySelectorAll('img')).toHaveLength(0);
    expect(root.querySelectorAll('.image-placeholder')).toHaveLength(2);
    expect(root.querySelector('.image-placeholder[data-remote-src]')?.getAttribute('data-remote-src')).toBe('https://cdn.example/logo.png');
  });

  it('rejects non-image data: URIs in <img>', () => {
    const root = fragment(renderSafeHtml('<img src="data:text/html;base64,PHNjcmlwdD4=" alt="x">'));
    expect(root.querySelector('img')?.getAttribute('src')).toBeNull();
  });

  it('does not call fetch, XHR or sendBeacon while rendering a hostile document', () => {
    const calls: string[] = [];
    const g = globalThis as unknown as Record<string, unknown>;
    const saved = { fetch: g.fetch, XMLHttpRequest: g.XMLHttpRequest };
    g.fetch = () => (calls.push('fetch'), Promise.reject(new Error('blocked')));
    g.XMLHttpRequest = function Blocked() {
      calls.push('xhr');
    };
    try {
      renderDoc(
        [
          '# Title',
          '![x](https://tracker.example/pixel.gif)',
          '<img src="https://tracker.example/a.png" srcset="https://tracker.example/b.png 2x">',
          '<a href="https://example.com">link</a>',
          '<link rel="prefetch" href="https://tracker.example/c">',
          '<script src="https://tracker.example/d.js"></script>',
        ].join('\n\n'),
      );
    } finally {
      g.fetch = saved.fetch;
      g.XMLHttpRequest = saved.XMLHttpRequest;
    }
    expect(calls).toEqual([]);
  });

  it('only creates a real <img src> after the explicit "Load images" action', () => {
    const { root } = renderDoc('![logo](https://cdn.example/logo.png)');
    expect(root.querySelector('img')).toBeNull();
    const loaded = loadRemoteImages(root);
    expect(loaded).toBe(1);
    const img = root.querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://cdn.example/logo.png');
    expect(img?.referrerPolicy).toBe('no-referrer');
  });
});
