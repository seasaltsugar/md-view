# Changelog

All notable changes to MD View are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.0.0] - Unreleased

First release.

### Added
- Local-first Markdown reader opened from the toolbar icon in a full-tab page.
- Open files with a button or drag and drop; Ctrl/Cmd+O shortcut.
- GitHub-flavored Markdown: tables, task lists, strikethrough, footnotes, alerts, autolinks, front matter.
- Syntax highlighting for a bundled subset of common languages.
- Sticky, collapsible table of contents (H1–H4) that follows your reading position.
- Rendered and Source views; document search with highlighted matches (Ctrl/Cmd+F).
- Heading actions: copy section, copy section as Markdown, copy heading link, collapse section.
- Code block language labels and Copy buttons; scrollable, sticky-header tables.
- System, Light and Dark themes; print stylesheet for paper and PDF.
- Copy complete Markdown (Ctrl/Cmd+Shift+C).
- Optional support link and a quiet, dismissible reminder after 20 documents.
- Remote images are blocked until you choose to load them.

### Performance
- Files up to 10 MB; syntax highlighting off above ~3 MB; deferred layout above ~400 KB; lazy section actions on very heading-dense documents.

### Security and privacy
- No permissions, no backend, no analytics, no remote code.
- Every generated HTML fragment is sanitized with DOMPurify; strict extension Content Security Policy.
