import { describe, expect, it } from 'vitest';
import { anchorUrl, createSlugger, idFromHash, slugify } from '../lib/slug';

describe('anchor generation', () => {
  it('lowercases and hyphenates like GitHub', () => {
    expect(slugify('Getting Started')).toBe('getting-started');
    expect(slugify('API v2.0 — What’s new?')).toBe('api-v20--whats-new');
    expect(slugify('snake_case stays')).toBe('snake_case-stays');
  });

  it('keeps non-Latin letters and drops emoji', () => {
    expect(slugify('Überblick')).toBe('überblick');
    expect(slugify('日本語 ガイド')).toBe('日本語-ガイド');
    expect(slugify('🚀 Launch')).toBe('-launch');
  });

  it('falls back to "section" for empty results', () => {
    expect(slugify('???')).toBe('');
    expect(createSlugger().slug('???')).toBe('section');
  });

  it('is deterministic: the same headings always give the same ids', () => {
    const run = () => {
      const s = createSlugger();
      return ['Intro', 'Usage', 'Usage', 'Intro'].map((t) => s.slug(t));
    };
    expect(run()).toEqual(['intro', 'usage', 'usage-1', 'intro-1']);
    expect(run()).toEqual(run());
  });

  it('avoids ids that are already taken', () => {
    const s = createSlugger(['intro']);
    expect(s.slug('Intro')).toBe('intro-1');
  });

  it('builds and reads shareable heading links', () => {
    const url = anchorUrl('chrome-extension://abc/viewer.html#old', 'getting-started');
    expect(url).toBe('chrome-extension://abc/viewer.html#getting-started');
    expect(anchorUrl('x://y/z', 'café')).toBe('x://y/z#caf%C3%A9');
    expect(idFromHash('#caf%C3%A9')).toBe('café');
    expect(idFromHash('#bad%')).toBe('bad%');
  });
});
