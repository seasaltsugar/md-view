# Contributing to MD View

Thanks for helping! MD View is a small utility with strict goals: **simple, private, fast, and beautiful to read**. Changes that fit those goals are welcome.

## Ground rules

These are not negotiable, and the automated tests check several of them:

1. **No network access.** No `fetch`, XHR, WebSocket, beacons, CDNs, remote fonts or remote scripts.
2. **No analytics, telemetry or accounts**, now or "just for debugging".
3. **No new browser permissions** without a very strong, documented reason (use optional permissions if ever needed).
4. **Treat Markdown as untrusted.** All HTML goes through `lib/sanitize.ts`. Never use `innerHTML` with unsanitized content.
5. **Nothing is gated behind payment.** Support is voluntary and must never change functionality.
6. Store preferences only. Never store file names, contents or anything about what was read.

## Setup

```bash
npm install
npm run dev        # builds and launches Chrome with the extension (WXT dev mode)
```

Or load manually: `npm run build`, then open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked** and select `.output/chrome-mv3`.

## Checks before opening a pull request

```bash
npm test           # unit tests (Vitest + jsdom)
npm run typecheck
npm run build      # also verifies the manifest requests no permissions
```

## Project layout

| Folder | Purpose |
| --- | --- |
| `entrypoints/` | Background worker and the viewer page (HTML shell). |
| `lib/` | Logic with no UI: Markdown parsing, sanitizing, headings, TOC, sections, search, theme, preferences, support reminder, files. |
| `lib/plugins/` | markdown-it plugins (task lists, footnotes, alerts, front matter). |
| `ui/` | DOM wiring: toolbar, menus, outline, search bar, About dialog, document view. |
| `styles/` | `app.css` (chrome), `document.css` (reading surface), `print.css`. |
| `tests/` | Vitest tests. |
| `store/` | Chrome Web Store listing text. |

## Style

- TypeScript, strict mode; vanilla HTML/CSS; no UI frameworks.
- Keep modules small and single-purpose. Put logic in `lib/` where it can be tested without a browser UI.
- Add a test for behavior you change. Keep UI copy plain: sentence case, say what happens.

## Reporting bugs

Open an issue using the **Report an issue** link in About MD View. Please include your Chrome version and, if possible, a **small** Markdown sample that reproduces the problem. Never paste private documents.

## Reporting security issues

Please report vulnerabilities privately to the maintainer (see the repository's security policy) rather than in a public issue.
