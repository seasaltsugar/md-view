import { MARKDOWN_EXTENSIONS, MAX_FILE_BYTES } from './config';
import { AppError } from './errors';

export interface LoadedFile {
  name: string;
  size: number;
  text: string;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function hasMarkdownExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return MARKDOWN_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export const ACCEPT_ATTRIBUTE = `${MARKDOWN_EXTENSIONS.join(',')},text/markdown`;

/** Checks name, type and size before reading. Throws an AppError with a friendly message. */
export function validateFile(file: { name: string; size: number; type?: string }): void {
  const looksLikeMarkdown = hasMarkdownExtension(file.name) || /^text\/(x-)?markdown$/i.test(file.type ?? '');
  if (!looksLikeMarkdown) {
    throw new AppError(
      'unsupported-type',
      `“${file.name}” isn’t a Markdown file. MD View opens .md and .markdown files.`,
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new AppError(
      'too-large',
      `“${file.name}” is ${formatBytes(file.size)}, which is over MD View’s ${formatBytes(MAX_FILE_BYTES)} limit. Try splitting it into smaller files.`,
    );
  }
  if (file.size === 0) {
    throw new AppError('empty', `“${file.name}” is empty. Open a file that contains Markdown.`);
  }
}

/** Decodes bytes as text. Handles UTF-8, UTF-8 with BOM and UTF-16; rejects binary data. */
export function decodeText(buffer: ArrayBuffer, name = 'This file'): string {
  const bytes = new Uint8Array(buffer);
  let encoding = 'utf-8';
  let offset = 0;

  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    offset = 3;
  } else if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    encoding = 'utf-16le';
    offset = 2;
  } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    encoding = 'utf-16be';
    offset = 2;
  } else {
    const probe = Math.min(bytes.length, 8192);
    for (let i = 0; i < probe; i++) {
      if (bytes[i] === 0) {
        throw new AppError('binary', `“${name}” doesn’t look like a text file, so MD View can’t display it.`);
      }
    }
  }
  return new TextDecoder(encoding).decode(bytes.subarray(offset));
}

/** Reads a user-selected file entirely in the browser. Nothing is uploaded. */
export async function readMarkdownFile(file: File): Promise<LoadedFile> {
  validateFile(file);

  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    throw new AppError(
      'unreadable',
      `MD View couldn’t read “${file.name}”. Check that the file still exists, then try opening it again.`,
    );
  }

  const text = decodeText(buffer, file.name);
  if (text.trim() === '') {
    throw new AppError('empty', `“${file.name}” is empty. Open a file that contains Markdown.`);
  }
  return { name: file.name, size: file.size, text };
}
