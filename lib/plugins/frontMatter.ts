import type { MD, StateBlock } from './types';

/**
 * YAML front matter at the very top of a file (--- … ---) is shown as a collapsed
 * "Front matter" block instead of being misread as a horizontal rule and a heading.
 */
export default function frontMatter(md: MD): void {
  md.block.ruler.before(
    'table',
    'front_matter',
    (state: StateBlock, startLine: number, endLine: number, silent: boolean) => {
      if (startLine !== 0) return false;
      if (state.src.slice(state.bMarks[0], state.eMarks[0]).trimEnd() !== '---') return false;

      let close = -1;
      for (let line = 1; line < endLine; line++) {
        const text = state.src.slice(state.bMarks[line], state.eMarks[line]).trimEnd();
        if (text === '---' || text === '...') {
          close = line;
          break;
        }
      }
      if (close === -1 || close === 1) return false; // no closing marker, or an empty block
      if (silent) return true;

      const token = state.push('front_matter', '', 0);
      token.content = state.getLines(1, close, 0, false);
      token.map = [0, close + 1];
      token.block = true;
      state.line = close + 1;
      return true;
    },
  );

  md.renderer.rules.front_matter = (tokens, idx) =>
    `<details class="front-matter"><summary>Front matter</summary><pre><code class="language-yaml">${md.utils.escapeHtml(
      tokens[idx].content,
    )}</code></pre></details>\n`;
}
