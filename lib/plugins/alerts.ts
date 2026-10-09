import type { MD, StateCore, Token } from './types';

/**
 * GitHub-style alerts:
 *   > [!NOTE]
 *   > Useful information.
 * Supported kinds: NOTE, TIP, IMPORTANT, WARNING, CAUTION.
 */
const MARKER = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]$/i;

export default function alerts(md: MD): void {
  md.core.ruler.push('alerts', (state: StateCore) => {
    const tokens = state.tokens;
    for (let i = 2; i < tokens.length; i++) {
      const inline = tokens[i];
      if (
        inline.type !== 'inline' ||
        tokens[i - 1].type !== 'paragraph_open' ||
        tokens[i - 2].type !== 'blockquote_open'
      ) {
        continue;
      }
      const children = inline.children;
      const first = children?.[0];
      if (!children || !first || first.type !== 'text') continue;
      const match = MARKER.exec(first.content.trim());
      if (!match) continue;
      const next = children[1];
      if (next && next.type !== 'softbreak') continue;

      const kind = match[1].toLowerCase();
      children.splice(0, next ? 2 : 1);
      inline.content = inline.content.replace(/^\[![A-Za-z]+\]\s*/, '');

      tokens[i - 2].attrJoin('class', `alert alert-${kind}`);
      const title = new state.Token('html_block', '', 0) as Token;
      title.content = `<p class="alert-title">${kind[0].toUpperCase()}${kind.slice(1)}</p>\n`;
      tokens.splice(i - 1, 0, title);
      i += 1;
    }
  });
}
