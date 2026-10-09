# MD View

**A free, private, local-first Markdown reader for Chrome.**

Beautiful Markdown. Private by default. Open a file and start reading.

- Free forever. No account. No ads. No analytics. No tracking.
- No uploads, no backend. Documents never leave your computer.
- Zero browser permissions.

Built for developers, product teams and anyone reading Markdown from AI tools: READMEs, PRDs, research reports, architecture documents.

## What it does

Click the toolbar icon, then open a `.md` or `.markdown` file (button, drag and drop, or Ctrl/Cmd+O). MD View renders it as a clean document:

- GitHub-flavored Markdown: headings, emphasis, strikethrough, nested and task lists, tables, blockquotes, GitHub-style alerts, footnotes, images, code with syntax highlighting, front matter.
- Sticky, collapsible table of contents (H1–H4) that highlights where you are.
- Rendered / Source toggle, in-document search (Ctrl/Cmd+F) with highlighted matches.
- Hover a heading to **copy the section**, **copy it as Markdown**, **copy a link**, or **collapse** it.
- Code blocks with language label and Copy button; tables that scroll instead of breaking the page.
- System / Light / Dark themes, a clean print stylesheet, and **Copy Markdown** for the whole file.

| Shortcut | Action |
| --- | --- |
| Ctrl/Cmd + O | Open a Markdown file |
| Ctrl/Cmd + F | Search the document |
| Ctrl/Cmd + Shift + C | Copy the complete Markdown |
| Esc | Close search, menus and overlays |

Chrome may reserve Ctrl+Shift+C on some platforms; the toolbar button always works.

## Installation

**From the Chrome Web Store:** search for "MD View" (link will be added once published).

**From source (development build):**

1. `npm install`
2. `npm run build`
3. Open `chrome://extensions`, turn on **Developer mode**.
4. Choose **Load unpacked** and select the `.output/chrome-mv3` folder.
5. Click the MD View icon and open `sample.md` from this repository to try it.

## Local development

Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # WXT dev mode: opens Chrome with the extension and reloads on change
npm test           # unit tests (Vitest, jsdom)
npm run typecheck
```

To load the dev build manually, use the same **Load unpacked** steps with the folder WXT prints (`.output/chrome-mv3-dev`).

## Production build

```bash
npm run build      # .output/chrome-mv3
npm run zip        # .output/md-view-<version>-chrome.zip, ready to upload
```

Both commands finish with `scripts/check-release.mjs`, which **fails** if the built manifest asks for any permission or lacks the strict Content Security Policy, and **warns** if placeholder URLs remain in `lib/config.ts`.

Upload the ZIP at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole). Listing text, the privacy disclosure and the permission justification are in [`store/CHROME_WEB_STORE.md`](store/CHROME_WEB_STORE.md).

## Large files

Files up to 10 MB open. Rendering happens on the main thread (sanitizing needs the DOM), so time grows with size. Rough timings on a laptop-class machine in Chromium: about 0.3 s for 0.5 MB, 1–3 s for 2 MB, and 7–12 s for 5–8 MB of prose, tables and code. Files over about 3 MB open without syntax highlighting, and files over about 400 KB skip layout of off-screen blocks until you scroll near them. Documents with more than 400 headings create each heading's section actions the first time you hover it. A progress bar shows while a file renders; if a file is rejected, the document you were reading stays open.

## Privacy model

- Files are read with the browser's File API after you choose them. No file-system permission is requested.
- The page's Content Security Policy forbids all connections (`connect-src 'none'`), remote scripts, frames and objects. A bug could not send data anywhere.
- No `fetch`, XHR, WebSocket or beacon exists in the code; a test scans the source to keep it that way.
- Only preferences are stored in `localStorage` (theme, sidebar state, reminder setting and a document-open counter). Never file names or contents.
- Images that live on other websites are **blocked by default**; they load only if you click **Load images**.
- See [`PRIVACY.md`](PRIVACY.md).

## Security model

Markdown is untrusted input.

1. `markdown-it` renders it (raw HTML allowed in, `javascript:`/`vbscript:` links refused).
2. **DOMPurify** sanitizes the result against a strict allow-list before anything is inserted into the page. Scripts, iframes, objects, forms, SVG, inline styles and event handlers are removed. Only `http(s)`, `mailto`, `tel` and `#` links survive. Unknown CSS classes and ids that could imitate the app's own UI are dropped.
3. External links open in a new tab with `rel="noopener noreferrer"`.
4. The extension CSP is a second, independent barrier.

## Support model

MD View is and will stay free. **Support MD View** (in the ⋯ menu and About) is an optional, voluntary gift that opens an external page in a new tab. It never unlocks or changes anything, and MD View never handles payment details.

After you have successfully opened 20 documents, a small, dismissible note (not a modal) may offer the link once. **Not now** hides it for at least 50 more documents; **Don't show again** or the **Show support reminders** setting turns it off permanently. The count lives only on your computer.

### Configure `SUPPORT_URL`

Edit [`lib/config.ts`](lib/config.ts):

```ts
export const SUPPORT_URL = 'https://ko-fi.com/your-handle'; // Ko-fi, GitHub Sponsors, Buy Me a Coffee, your own page…
export const REPO_URL = 'https://github.com/you/md-view';
```

or set environment variables at build time:

```bash
WXT_SUPPORT_URL=https://ko-fi.com/you WXT_REPO_URL=https://github.com/you/md-view npm run zip
```

`SUPPORT_URL` must be `https://`. Set it to an empty string to hide all support UI. `ISSUES_URL` and `PRIVACY_URL` derive from `REPO_URL` and can be overridden with `WXT_ISSUES_URL` / `WXT_PRIVACY_URL`.

## Technology

WXT, TypeScript, vanilla HTML and CSS, markdown-it, DOMPurify, highlight.js (a bundled subset of languages). Chrome Manifest V3, Chrome 111 or newer.

## Contributing and bug reports

See [`CONTRIBUTING.md`](CONTRIBUTING.md). To report a bug, use **Report an issue** in About MD View, or open an issue in the repository with your Chrome version and a small sample file.

## License

MIT, see [`LICENSE`](LICENSE).
