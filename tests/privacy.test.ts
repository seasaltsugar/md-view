// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Static checks that back up the privacy promises: no backend, no analytics,
 * no remote code, no network APIs, no extra permissions.
 */
const ROOT = new URL('..', import.meta.url).pathname;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const sourceFiles = ['entrypoints', 'lib', 'ui', 'styles']
  .flatMap((dir) => walk(join(ROOT, dir)))
  .filter((file) => /\.(ts|css|html)$/.test(file));

const read = (file: string) => readFileSync(file, 'utf8');

/** Source with comments removed, so the checks look at what the code does, not what its comments say. */
const code = (file: string) =>
  read(file)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/<!--[\s\S]*?-->/g, '');

describe('privacy and architecture guarantees', () => {
  it('finds the source files it is supposed to check', () => {
    expect(sourceFiles.length).toBeGreaterThan(20);
  });

  it('uses no network APIs anywhere in the extension', () => {
    const forbidden = [/\bfetch\s*\(/, /XMLHttpRequest/, /\bWebSocket\b/, /sendBeacon/, /\bEventSource\b/, /importScripts/, /navigator\.connection/];
    for (const file of sourceFiles.filter((f) => f.endsWith('.ts'))) {
      const text = code(file);
      for (const pattern of forbidden) {
        expect(`${relative(ROOT, file)}: ${pattern.test(text)}`).toBe(`${relative(ROOT, file)}: false`);
      }
    }
  });

  it('evaluates no dynamic code', () => {
    for (const file of sourceFiles.filter((f) => f.endsWith('.ts'))) {
      const text = code(file);
      expect(/\beval\s*\(/.test(text)).toBe(false);
      expect(/new Function\s*\(/.test(text)).toBe(false);
    }
  });

  it('hard-codes no URLs outside config.ts (and the SVG namespace)', () => {
    for (const file of sourceFiles) {
      if (file.endsWith('lib/config.ts')) continue;
      const text = code(file).replace(/http:\/\/www\.w3\.org\/2000\/svg/g, '');
      expect(`${relative(ROOT, file)}: ${/https?:\/\//.test(text)}`).toBe(`${relative(ROOT, file)}: false`);
    }
  });

  it('loads nothing from a CDN: the page has no external scripts, styles, fonts or inline code', () => {
    const html = read(join(ROOT, 'entrypoints/viewer/index.html'));
    expect(html).not.toMatch(/(src|href)=["']https?:/i);
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/i); // no inline scripts
    expect(html).not.toMatch(/\sstyle=/i); // no inline styles
    expect(html).not.toMatch(/\son[a-z]+=/i); // no inline handlers
    for (const file of sourceFiles.filter((f) => f.endsWith('.css'))) {
      expect(/@import\s+url\(|url\(\s*["']?https?:/i.test(read(file))).toBe(false);
    }
  });

  it('declares no extension permissions and forbids connections in the production CSP', () => {
    const config = code(join(ROOT, 'wxt.config.ts'));
    expect(config).toMatch(/permissions:\s*\[\s*\]/);
    expect(config).not.toMatch(/host_permissions|optional_permissions|<all_urls>|"tabs"|'tabs'|'history'|'storage'|'clipboardRead'/);
    expect(config).toContain("connect-src 'none'");
    expect(config).toContain("script-src 'self'");
    expect(config).toContain("frame-src 'none'");
    expect(config).toContain("object-src 'none'");
  });

  it('ships only the three rendering libraries as runtime dependencies', () => {
    const pkg = JSON.parse(read(join(ROOT, 'package.json'))) as { dependencies: Record<string, string> };
    expect(Object.keys(pkg.dependencies).sort()).toEqual(['dompurify', 'highlight.js', 'markdown-it']);
  });

  it('stores only preferences: nothing about files is ever written to storage', () => {
    const uiAndLib = sourceFiles.filter((f) => /\/(lib|ui)\//.test(f) && f.endsWith('.ts'));
    for (const file of uiAndLib) {
      const text = read(file);
      expect(/(?:store|localStorage)\.set(?:Item)?\([^)]*(?:file|name|source|text|content)/i.test(text)).toBe(false);
    }
  });
});
