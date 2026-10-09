import { beforeAll, describe, expect, it } from 'vitest';
import { MAX_FILE_BYTES } from '../lib/config';
import { AppError, toUserMessage } from '../lib/errors';
import { decodeText, formatBytes, hasMarkdownExtension, readMarkdownFile, validateFile } from '../lib/files';

// Polyfill for jsdom's missing File.arrayBuffer()
beforeAll(() => {
  if (typeof File !== 'undefined' && !File.prototype.arrayBuffer) {
    File.prototype.arrayBuffer = function () {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(this);
      });
    };
  }
});

function codeOf(fn: () => unknown): string | null {
  try {
    fn();
  } catch (error) {
    return error instanceof AppError ? error.code : 'other';
  }
  return null;
}

describe('file validation', () => {
  it('accepts .md and .markdown in any letter case', () => {
    for (const name of ['a.md', 'B.MD', 'notes.markdown', 'x.Markdown', 'y.mdown']) {
      expect(hasMarkdownExtension(name)).toBe(true);
      expect(codeOf(() => validateFile({ name, size: 10 }))).toBeNull();
    }
  });

  it('rejects other file types with a friendly message', () => {
    expect(codeOf(() => validateFile({ name: 'photo.png', size: 10 }))).toBe('unsupported-type');
    expect(codeOf(() => validateFile({ name: 'notes.txt', size: 10 }))).toBe('unsupported-type');
    try {
      validateFile({ name: 'photo.png', size: 10 });
    } catch (error) {
      expect(toUserMessage(error)).toContain('isn’t a Markdown file');
    }
  });

  it('accepts a Markdown MIME type without an extension', () => {
    expect(codeOf(() => validateFile({ name: 'README', size: 10, type: 'text/markdown' }))).toBeNull();
  });

  it('rejects empty and very large files', () => {
    expect(codeOf(() => validateFile({ name: 'a.md', size: 0 }))).toBe('empty');
    expect(codeOf(() => validateFile({ name: 'a.md', size: MAX_FILE_BYTES + 1 }))).toBe('too-large');
  });

  it('formats sizes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });

  it('never leaks internals in error messages', () => {
    expect(toUserMessage(new TypeError('x is not a function at foo.js:12'))).not.toContain('foo.js');
  });
});

describe('reading files', () => {
  const bytes = (...values: number[]) => new Uint8Array(values).buffer;

  it('decodes UTF-8, with and without a BOM', () => {
    expect(decodeText(new TextEncoder().encode('héllo ✓').buffer)).toBe('héllo ✓');
    const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('# Hi')]);
    expect(decodeText(withBom.buffer)).toBe('# Hi');
  });

  it('decodes UTF-16 files', () => {
    expect(decodeText(bytes(0xff, 0xfe, 0x23, 0x00, 0x41, 0x00))).toBe('#A');
    expect(decodeText(bytes(0xfe, 0xff, 0x00, 0x23, 0x00, 0x41))).toBe('#A');
  });

  it('rejects binary data', () => {
    expect(codeOf(() => decodeText(bytes(0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x1a)))).toBe('binary');
  });

  it('reads a File and reports empty content', async () => {
    const good = new File(['# Title\n\nBody'], 'doc.md', { type: 'text/markdown' });
    const loaded = await readMarkdownFile(good);
    expect(loaded.text).toBe('# Title\n\nBody');
    expect(loaded.name).toBe('doc.md');

    const blank = new File(['   \n\n  '], 'blank.md');
    await expect(readMarkdownFile(blank)).rejects.toThrow('is empty');
  });
});