import hljs from 'highlight.js/lib/core';

// Only a practical subset of languages is bundled (not all ~190) to keep the extension small and fast.
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import go from 'highlight.js/lib/languages/go';
import ini from 'highlight.js/lib/languages/ini';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import lua from 'highlight.js/lib/languages/lua';
import makefile from 'highlight.js/lib/languages/makefile';
import markdown from 'highlight.js/lib/languages/markdown';
import nginx from 'highlight.js/lib/languages/nginx';
import php from 'highlight.js/lib/languages/php';
import plaintext from 'highlight.js/lib/languages/plaintext';
import powershell from 'highlight.js/lib/languages/powershell';
import protobuf from 'highlight.js/lib/languages/protobuf';
import python from 'highlight.js/lib/languages/python';
import ruby from 'highlight.js/lib/languages/ruby';
import rust from 'highlight.js/lib/languages/rust';
import scss from 'highlight.js/lib/languages/scss';
import shell from 'highlight.js/lib/languages/shell';
import sql from 'highlight.js/lib/languages/sql';
import swift from 'highlight.js/lib/languages/swift';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

const LANGUAGES = {
  bash, c, cpp, csharp, css, diff, dockerfile, go, ini, java, javascript, json, kotlin,
  lua, makefile, markdown, nginx, php, plaintext, powershell, protobuf, python, ruby, rust, scss,
  shell, sql, swift, typescript, xml, yaml,
};

for (const [name, definition] of Object.entries(LANGUAGES)) {
  hljs.registerLanguage(name, definition);
}
hljs.registerAliases(['jsonc', 'json5'], { languageName: 'json' });
hljs.registerAliases(['mjs', 'cjs'], { languageName: 'javascript' });

/** Friendly names for the language label above a code block. */
const LABELS: Record<string, string> = {
  js: 'JavaScript', javascript: 'JavaScript', jsx: 'JSX', mjs: 'JavaScript', cjs: 'JavaScript',
  ts: 'TypeScript', typescript: 'TypeScript', tsx: 'TSX',
  json: 'JSON', jsonc: 'JSON', json5: 'JSON5',
  html: 'HTML', xml: 'XML', svg: 'SVG', css: 'CSS', scss: 'SCSS',
  sh: 'Shell', bash: 'Bash', zsh: 'Zsh', shell: 'Shell', console: 'Console', powershell: 'PowerShell', ps1: 'PowerShell',
  py: 'Python', python: 'Python', rb: 'Ruby', ruby: 'Ruby', rs: 'Rust', rust: 'Rust', go: 'Go', golang: 'Go',
  java: 'Java', kt: 'Kotlin', kotlin: 'Kotlin', swift: 'Swift', php: 'PHP', lua: 'Lua',
  c: 'C', cpp: 'C++', 'c++': 'C++', cs: 'C#', csharp: 'C#',
  sql: 'SQL', proto: 'Protocol Buffers', protobuf: 'Protocol Buffers',
  yaml: 'YAML', yml: 'YAML', toml: 'TOML', ini: 'INI', diff: 'Diff', patch: 'Diff',
  md: 'Markdown', markdown: 'Markdown', dockerfile: 'Dockerfile', docker: 'Dockerfile', makefile: 'Makefile', nginx: 'Nginx',
  text: 'Text', txt: 'Text', plaintext: 'Text', plain: 'Text',
};

/** Pretty label for a fence info string, or '' when there is no language. */
export function languageLabel(lang: string): string {
  const key = lang.trim().toLowerCase();
  if (!key) return '';
  return LABELS[key] ?? lang.trim();
}

/** Returns highlighted HTML, or null when the language is unknown or highlighting fails. */
export function highlightCode(code: string, lang: string): string | null {
  const key = lang.trim().toLowerCase();
  if (!key || !hljs.getLanguage(key)) return null;
  try {
    return hljs.highlight(code, { language: key, ignoreIllegals: true }).value;
  } catch {
    return null;
  }
}
