import { describe, expect, it } from 'vitest';
import { collectRanges, findMatches } from '../lib/search';
import { fragment } from './helpers';

describe('search matching', () => {
  it('finds all case-insensitive matches', () => {
    expect(findMatches('Foo foo FOO fo', 'foo')).toEqual([
      { start: 0, end: 3 },
      { start: 4, end: 7 },
      { start: 8, end: 11 },
    ]);
  });

  it('treats regex characters literally', () => {
    expect(findMatches('a.b a*b (x)', 'a.b')).toHaveLength(1);
    expect(findMatches('cost $5 [ok]', '[ok]')).toHaveLength(1);
    expect(findMatches('anything', '.*')).toHaveLength(0);
  });

  it('lets a space match line breaks inside a paragraph', () => {
    expect(findMatches('hello\n  world', 'hello world')).toHaveLength(1);
  });

  it('ignores empty queries and respects the limit', () => {
    expect(findMatches('abc', '   ')).toEqual([]);
    expect(findMatches('aaaa', 'a', 2)).toHaveLength(2);
  });
});

describe('search in the document', () => {
  it('matches across inline elements within one block', () => {
    const root = fragment('<p>Use <strong>fast</strong> search</p><p>fast again</p>');
    const { ranges } = collectRanges(root, 'use fast search');
    expect(ranges).toHaveLength(1);
    expect(ranges[0].toString()).toBe('Use fast search');
  });

  it('never matches across separate blocks', () => {
    const root = fragment('<p>end</p><p>start</p>');
    expect(collectRanges(root, 'endstart').ranges).toHaveLength(0);
  });

  it('skips collapsed sections and app controls', () => {
    const root = fragment(
      '<p>needle</p><p hidden>needle</p><div class="code-header" data-mdv-ui><button>needle</button></div><pre>needle</pre>',
    );
    expect(collectRanges(root, 'needle').ranges).toHaveLength(2);
  });

  it('reports truncation when there are too many matches', () => {
    const root = fragment('<p>' + 'x '.repeat(50) + '</p>');
    const result = collectRanges(root, 'x', 10);
    expect(result.ranges).toHaveLength(10);
    expect(result.truncated).toBe(true);
  });
});
