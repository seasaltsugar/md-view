/**
 * Stable heading anchors, compatible with GitHub's scheme so that links written for
 * GitHub READMEs (e.g. [Install](#installation)) keep working.
 *
 * Same text → same id, every time. Repeated headings get -1, -2, … suffixes in document order.
 */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\s-]/gu, '')
    .replace(/\s/g, '-');
}

export interface Slugger {
  slug(text: string): string;
}

export function createSlugger(reserved: Iterable<string> = []): Slugger {
  const used = new Set<string>(reserved);
  return {
    slug(text: string): string {
      const base = slugify(text) || 'section';
      let candidate = base;
      let n = 0;
      while (used.has(candidate)) candidate = `${base}-${++n}`;
      used.add(candidate);
      return candidate;
    },
  };
}

/** Builds a shareable in-page link for a heading id. */
export function anchorUrl(pageUrl: string, id: string): string {
  const base = pageUrl.split('#')[0];
  return `${base}#${encodeURIComponent(id)}`;
}

/** Reads a heading id back out of location.hash. */
export function idFromHash(hash: string): string {
  const raw = hash.replace(/^#/, '');
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
