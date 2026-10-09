/**
 * Central configuration for MD View.
 *
 * Everything a maintainer is likely to change lives here. Nothing in this file is
 * secret and nothing here is sent anywhere.
 */

type Env = Record<string, string | undefined>;
// Build-time overrides: `WXT_SUPPORT_URL=https://ko-fi.com/you npm run build`
const env: Env = (import.meta as unknown as { env?: Env }).env ?? {};

export const SUPPORT_URL = 'https://ko-fi.com/seasaltsugar';
export const REPO_URL = 'https://github.com/seasaltsugar/md-view';
export const ISSUES_URL = 'https://github.com/seasaltsugar/md-view/issues';
export const PRIVACY_URL = 'https://github.com/seasaltsugar/md-view/blob/main/PRIVACY.md';


/** True when a usable https support link is configured. */
export const SUPPORT_ENABLED: boolean = /^https:\/\//i.test(SUPPORT_URL.trim());

/** The first support reminder can appear after this many successfully opened documents. */
export const SUPPORT_FIRST_PROMPT_AT = 20;
/** After "Not now", stay quiet for at least this many more document opens. */
export const SUPPORT_SNOOZE_OPENS = 50;

/** File handling. */
export const MARKDOWN_EXTENSIONS: readonly string[] = ['.md', '.markdown', '.mdown', '.mkd'];
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
/** Above this many characters, syntax highlighting is skipped to keep large files fast. */
export const LARGE_DOCUMENT_CHARS = 3 * 1024 * 1024;
/** Above this many characters, off-screen blocks are not laid out until scrolled near (content-visibility). */
export const LONG_DOCUMENT_CHARS = 400 * 1024;
/** With more headings than this, section actions are created when a heading is first hovered or touched. */
export const LAZY_HEADING_ACTIONS_ABOVE = 400;
/** A single code block longer than this is shown without syntax highlighting. */
export const MAX_HIGHLIGHT_CHARS = 100_000;

/** Search stops collecting after this many matches. */
export const MAX_SEARCH_MATCHES = 5000;

/** Prefix for the (few) preferences kept in localStorage. */
export const STORAGE_PREFIX = 'mdview:';
