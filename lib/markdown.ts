import MarkdownIt from 'markdown-it';
import { MAX_HIGHLIGHT_CHARS } from './config';
import { highlightCode } from './highlight';
import alerts from './plugins/alerts';
import footnotes from './plugins/footnotes';
import frontMatter from './plugins/frontMatter';
import taskLists from './plugins/taskLists';
import type { MD, StateCore } from './plugins/types';

/**
 * Markdown → HTML using markdown-it (GitHub-flavored feature set).
 *
 * ⚠ The returned HTML is UNTRUSTED. Raw HTML in the Markdown is passed through here and
 * must go through `sanitizeHtml` (see render.ts) before it is inserted into a page.
 */
export interface RenderOptions {
  /** Syntax-highlight fenced code. Turned off automatically for very large documents. */
  highlight?: boolean;
}

let instance: MD | null = null;

export function getMarkdownIt(): MD {
  if (instance) return instance;

  const md = new MarkdownIt({
    html: true, // raw HTML is allowed in; the sanitizer decides what survives
    linkify: true, // bare https://… URLs become links, as on GitHub
    typographer: false, // keep quotes and dashes exactly as written
    breaks: false,
  });
  // Don't turn file names like README.md into links.
  md.linkify.set({ fuzzyLink: false, fuzzyEmail: false });

  md.use(frontMatter);
  md.use(footnotes);
  md.use(taskLists);
  md.use(alerts);

  // Remember where each top-level heading starts so "Copy section as Markdown" can slice the source.
  md.renderer.rules.heading_open = (tokens, idx, options, _env, self) => {
    const token = tokens[idx];
    if (token.map && token.level === 0) {
      token.attrSet('data-md-start', String(token.map[0]));
      token.attrSet('data-md-end', String(token.map[1]));
    }
    return self.renderToken(tokens, idx, options);
  };

  // Fenced code: keep the language, highlight when it is cheap enough.
  md.renderer.rules.fence = (tokens, idx, _options, env: { highlight?: boolean }) => {
    const token = tokens[idx];
    const info = token.info ? md.utils.unescapeAll(token.info).trim() : '';
    const lang = (info.split(/\s+/)[0] ?? '').replace(/[^\w+#.-]/g, '');
    const code = token.content;

    const html = env.highlight !== false && code.length <= MAX_HIGHLIGHT_CHARS ? highlightCode(code, lang) : null;
    const classes = [lang ? `language-${lang}` : '', html !== null ? 'hljs' : ''].filter(Boolean).join(' ');
    const attr = classes ? ` class="${classes}"` : '';
    return `<pre><code${attr}>${html ?? md.utils.escapeHtml(code)}</code></pre>\n`;
  };

  // Table alignment: markdown-it emits inline style="text-align:…"; styles are stripped by the sanitizer,
  // so convert to the `align` attribute (styled in CSS).
  md.core.ruler.push('table_align', (state: StateCore) => {
    for (const token of state.tokens) {
      if (token.type !== 'th_open' && token.type !== 'td_open') continue;
      const style = token.attrGet('style');
      const match = style ? /text-align:\s*(left|right|center)/.exec(style) : null;
      if (match) {
        token.attrs = (token.attrs ?? []).filter(([name]) => name !== 'style');
        token.attrSet('align', match[1]);
      }
    }
  });

  instance = md;
  return md;
}

/** Converts Markdown to UNSANITIZED HTML. Prefer `renderSafeHtml` from render.ts. */
export function markdownToHtml(source: string, options: RenderOptions = {}): string {
  return getMarkdownIt().render(source, { highlight: options.highlight ?? true });
}
