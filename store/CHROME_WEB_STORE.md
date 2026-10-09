# Chrome Web Store listing

## Name
MD View

## Short description (max 132 characters)
Beautifully read Markdown files directly in Chrome. Private, local, free, and distraction-free.

## Category
Productivity

## Detailed description

Markdown shouldn't feel like source code.

MD View turns local Markdown files into clean, readable documents directly in your browser.

Open a file and start reading.

No uploads.
No account.
No ads.
No tracking.

Your Markdown stays on your computer.

WHY MD VIEW
• Beautiful reading: strong typography, generous spacing and comfortable line lengths for long documents, README files, PRDs, research reports, architecture documents and AI-generated Markdown.
• Private by design: files are read locally and never uploaded. There is no backend, no account, no analytics and no tracking. MD View requests no browser permissions.
• Free forever: every feature is free. Supporting development is entirely optional and never unlocks anything.

FEATURES
• GitHub-flavored Markdown: tables, task lists, nested lists, footnotes, alerts, images and more
• Syntax-highlighted code with a language label and a Copy button
• Sticky table of contents that follows where you are
• Search with highlighted matches (Ctrl/Cmd+F)
• Rendered and Source views
• Hover any heading to copy the section as text or Markdown, copy a link to it, or collapse it
• Light, Dark or System theme
• Clean printing and Save as PDF
• Copy the complete Markdown with one click
• Drag and drop a .md file, or pick one with Ctrl/Cmd+O

SAFE BY DEFAULT
Markdown is treated as untrusted input. All HTML is sanitized; scripts, iframes and event handlers never run. Images hosted on other websites are blocked until you choose to load them, so reading a document never contacts another server.

HOW TO USE
Click the MD View icon, then open a .md or .markdown file or drag one onto the page.

Open source. Free, private, and independently built.

## Single purpose statement
MD View has one purpose: to display local Markdown files, which the user chooses, as formatted, readable documents.

## Permission justification

MD View requests **no permissions** and **no host permissions**. There is nothing to justify beyond how each capability works without one:

| Capability | How it works without a permission |
| --- | --- |
| Opening the viewer when the toolbar icon is clicked | `chrome.action.onClicked` plus `chrome.tabs.create` for the extension's own page. Neither needs the `tabs` permission. |
| Reading Markdown files | The standard `<input type="file">` and drag-and-drop File API. The user selects each file; no file-system access is requested. |
| Saving preferences | `localStorage` on the extension's own origin (theme, sidebar state, reminder setting, a local document counter). No `storage` permission needed. |
| Copying text | `navigator.clipboard.writeText` in response to a user click or shortcut. No clipboard permission needed. MD View never reads the clipboard. |
| Printing | `window.print()` from the extension page. |

Remote code: **No.** All JavaScript is bundled in the package. The Content Security Policy is `script-src 'self'` with `connect-src 'none'`.

## Privacy practices tab

**Data usage — "What user data do you plan to collect?"** Leave every category **unchecked**: MD View collects none of the following: personally identifiable information, health information, financial and payment information, authentication information, personal communications, location, web history, user activity, website content.

**Certifications — check all three:**
- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** the public URL of `PRIVACY.md` in the repository (for example `https://github.com/<you>/md-view/blob/main/PRIVACY.md`).

## Privacy disclosure text (for the dashboard's privacy fields and listing)

MD View does not collect, transmit, sell or share any user data. Markdown files you open are read and rendered locally in your browser and are never uploaded. MD View has no backend, no account system, no analytics, no telemetry and no advertising. It makes no network requests while you read. It stores only a few preferences (theme, sidebar state, whether support reminders are on, and a local count of opened documents) in the extension's local storage on your computer. This count is never transmitted. Opening the optional "Support MD View" link takes you to an external website run by a third party with its own privacy policy. If you choose to load images that a document references, your browser requests them from the sites that host them.

## Assets to prepare
- Screenshots (1280×800): welcome screen, a rendered document with the outline, dark theme, heading actions, search.
- Small promo tile 440×280 (optional but recommended).
- Icon is in `public/icon/128.png`.
