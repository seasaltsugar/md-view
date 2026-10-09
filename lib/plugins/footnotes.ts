import type { MD, StateBlock, StateCore, StateInline, Token } from './types';

/**
 * Footnotes:
 *   Text with a note.[^1]
 *
 *   [^1]: The note itself. Indented lines continue it.
 *
 * Definitions are collected while parsing; a numbered list is appended at the end of the document
 * with a back-link (↩) beside each note.
 */
interface FootnoteEnv {
  defs: Record<string, string>;
  order: string[];
  refCounts: Record<string, number>;
}

function getEnv(env: Record<string, unknown>): FootnoteEnv {
  const existing = env.footnotes as FootnoteEnv | undefined;
  if (existing) return existing;
  const created: FootnoteEnv = { defs: {}, order: [], refCounts: {} };
  env.footnotes = created;
  return created;
}

export default function footnotes(md: MD): void {
  // ── Block rule: "[^label]: text" ────────────────────────────────────────
  md.block.ruler.before(
    'reference',
    'footnote_def',
    (state: StateBlock, startLine: number, endLine: number, silent: boolean) => {
      const src = state.src;
      const start = state.bMarks[startLine] + state.tShift[startLine];
      const max = state.eMarks[startLine];
      if (state.sCount[startLine] - state.blkIndent >= 4) return false;
      if (src.charCodeAt(start) !== 0x5b || src.charCodeAt(start + 1) !== 0x5e) return false; // "[^"

      let pos = start + 2;
      for (; pos < max; pos++) {
        const ch = src.charCodeAt(pos);
        if (ch === 0x20 || ch === 0x5b) return false;
        if (ch === 0x5d) break;
      }
      if (pos === start + 2 || pos + 1 >= max || src.charCodeAt(pos + 1) !== 0x3a) return false; // "]:"
      if (silent) return true;

      const label = src.slice(start + 2, pos);
      const lines: string[] = [src.slice(pos + 2, max).trim()];
      let next = startLine + 1;

      while (next < endLine) {
        if (state.isEmpty(next)) {
          let k = next;
          while (k < endLine && state.isEmpty(k)) k++;
          if (k < endLine && state.sCount[k] - state.blkIndent >= 4) {
            for (let b = next; b < k; b++) lines.push('');
            next = k;
            continue;
          }
          break;
        }
        const indented = state.sCount[next] - state.blkIndent >= 4;
        const lineStart = state.bMarks[next] + state.tShift[next];
        const startsNewDef = src.charCodeAt(lineStart) === 0x5b && src.charCodeAt(lineStart + 1) === 0x5e;
        if (!indented && startsNewDef) break;
        lines.push(indented ? state.getLines(next, next + 1, state.blkIndent + 4, false).replace(/\n$/, '') : src.slice(lineStart, state.eMarks[next]));
        next++;
      }

      getEnv(state.env as Record<string, unknown>).defs[label] = lines.join('\n').trim();
      state.line = next;
      return true;
    },
  );

  // ── Inline rule: "[^label]" ────────────────────────────────────────────
  md.inline.ruler.before('link', 'footnote_ref', (state: StateInline, silent: boolean) => {
    const src = state.src;
    const start = state.pos;
    const max = state.posMax;
    if (src.charCodeAt(start) !== 0x5b || src.charCodeAt(start + 1) !== 0x5e) return false;

    let pos = start + 2;
    for (; pos < max; pos++) {
      const ch = src.charCodeAt(pos);
      if (ch === 0x20 || ch === 0x0a || ch === 0x5b) return false;
      if (ch === 0x5d) break;
    }
    if (pos === start + 2 || pos >= max) return false;

    const label = src.slice(start + 2, pos);
    const env = getEnv(state.env as Record<string, unknown>);
    if (!(label in env.defs)) return false;

    if (!silent) {
      let index = env.order.indexOf(label);
      if (index === -1) {
        index = env.order.length;
        env.order.push(label);
      }
      const count = (env.refCounts[label] = (env.refCounts[label] ?? 0) + 1);
      const token = state.push('footnote_ref', '', 0);
      token.meta = { number: index + 1, repeat: count };
    }
    state.pos = pos + 1;
    return true;
  });

  // ── Core rule: append the notes list ───────────────────────────────────
  md.core.ruler.push('footnote_list', (state: StateCore) => {
    const env = state.env as Record<string, unknown>;
    const data = env.footnotes as FootnoteEnv | undefined;
    if (!data || data.order.length === 0) return;

    const open = new state.Token('footnote_block_open', '', 1) as Token;
    state.tokens.push(open);

    data.order.forEach((label, index) => {
      const number = index + 1;
      const item = new state.Token('footnote_open', '', 1) as Token;
      item.meta = { number };
      state.tokens.push(item);

      const inner = state.md.parse(data.defs[label] ?? '', {});
      for (const token of inner) token.map = null; // line numbers are not meaningful here

      // Put the back-links at the end of the last paragraph.
      const total = data.refCounts[label] ?? 1;
      let links = '';
      for (let r = 1; r <= total; r++) {
        const id = r === 1 ? `fnref-${number}` : `fnref-${number}-${r}`;
        links += ` <a href="#${id}" class="footnote-backref" aria-label="Back to reference ${number}">↩\uFE0E</a>`;
      }
      const lastInline = [...inner].reverse().find((t) => t.type === 'inline');
      const backref = new state.Token('html_inline', '', 0) as Token;
      backref.content = links;
      if (lastInline?.children) {
        lastInline.children.push(backref);
      } else {
        const p = new state.Token('paragraph_open', 'p', 1) as Token;
        const inl = new state.Token('inline', '', 0) as Token;
        inl.children = [backref];
        inl.content = '';
        inner.push(p, inl, new state.Token('paragraph_close', 'p', -1) as Token);
      }
      state.tokens.push(...inner);
      state.tokens.push(new state.Token('footnote_close', '', -1) as Token);
    });

    state.tokens.push(new state.Token('footnote_block_close', '', -1) as Token);
  });

  const rules = md.renderer.rules;
  rules.footnote_ref = (tokens, idx) => {
    const { number, repeat } = tokens[idx].meta as { number: number; repeat: number };
    const refId = repeat === 1 ? `fnref-${number}` : `fnref-${number}-${repeat}`;
    return `<sup class="footnote-ref"><a href="#fn-${number}" id="${refId}">[${number}]</a></sup>`;
  };
  rules.footnote_block_open = () =>
    '<section class="footnotes" aria-label="Footnotes">\n<hr class="footnotes-sep">\n<ol class="footnotes-list">\n';
  rules.footnote_block_close = () => '</ol>\n</section>\n';
  rules.footnote_open = (tokens, idx) => `<li id="fn-${(tokens[idx].meta as { number: number }).number}" class="footnote-item">`;
  rules.footnote_close = () => '</li>\n';
}
