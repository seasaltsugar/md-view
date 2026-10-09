---
title: MD View sample document
purpose: Try every feature without opening a real file
---

# MD View sample

Markdown shouldn't feel like source code. This file shows what MD View does with the Markdown you throw at it — from README files to product requirement documents to the long reports AI tools love to write.

> [!NOTE]
> Everything on this page was rendered **on your computer**. Nothing was uploaded, and nothing was requested from the internet to show it.

Try these: press **Ctrl+F** (⌘F on Mac) to search, hover a heading to see section actions, use the outline on the left to jump around, and flip between **Rendered** and **Source** in the toolbar.

## Reading well

Good typography is the whole point. Body text is set in a book serif at a comfortable line length, headings use a clear hierarchy, and spacing is generous enough for long documents. Inline formatting works as you would expect: *italic*, **bold**, ***both***, ~~strikethrough~~, `inline code`, and links like [the CommonMark spec](https://commonmark.org/). Bare URLs such as https://www.markdownguide.org become links too, and external links open safely in a new tab.

A second paragraph shows the rhythm of longer text. Technical writing often mixes prose with identifiers like `renderDocument()`, file names such as `README.md`, and keyboard shortcuts like <kbd>Ctrl</kbd> + <kbd>F</kbd>. All of them stay legible without turning the page into a code editor.

---

## Lists

### Plain and nested lists

- Product requirements
  - Goals
    - Reduce time-to-first-read
    - Keep every file on the device
  - Non-goals
    - Editing
    - Accounts
- Architecture notes
- Open questions

1. Open a Markdown file
2. Read it
   1. Search for a term
   2. Copy a section
3. Print or save as PDF

### Task lists

- [x] Render GitHub-flavored Markdown
- [x] Sanitize every byte of HTML
- [ ] Ship to the Chrome Web Store
  - [x] Write the privacy policy
  - [ ] Add the listing screenshots

## Code

Fenced code blocks are highlighted, labeled, and have a **Copy** button. Long lines scroll sideways instead of breaking the page.

```ts
interface Section {
  id: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
}

export function outline(sections: Section[]): Section[] {
  return sections.filter((s) => s.level <= 4); // the table of contents shows H1–H4
}
```

```python
from dataclasses import dataclass

@dataclass
class Report:
    title: str
    pages: int = 1

    def summary(self) -> str:
        return f"{self.title} ({self.pages} pages)"
```

```bash
# a very long line to show horizontal scrolling instead of layout breakage
curl --silent --show-error --location --fail --retry 3 --header "Accept: application/json" --output result.json "https://api.example.com/v1/reports?limit=100&offset=0&sort=created_at&order=desc"
```

```json
{
  "name": "md-view",
  "private": true,
  "features": ["local", "free", "no-tracking"]
}
```

```diff
- Markdown looks like source code.
+ Markdown looks like a document.
```

## Tables

Tables scroll sideways on small screens, keep their header visible while you scroll inside them, and respect column alignment.

| Capability               | Status      | Owner    | Q1 effort (days) | Q2 effort (days) | Risk   | Notes                                              |
| :----------------------- | :---------- | :------- | ---------------: | ---------------: | :----: | :------------------------------------------------- |
| Rendered view            | Shipped     | Core     |               12 |                3 |  Low   | Typography and spacing tuned for long documents    |
| Source view              | Shipped     | Core     |                2 |                1 |  Low   | Original text, exactly as written                  |
| Table of contents        | Shipped     | Core     |                6 |                2 |  Low   | Highlights the section you are reading             |
| Search                   | Shipped     | Core     |                5 |                2 |  Medium| Highlights every match without changing the page   |
| Section actions          | Shipped     | Core     |                4 |                1 |  Low   | Copy text, copy Markdown, copy link, collapse       |
| Print / Save as PDF      | Shipped     | Core     |                3 |                1 |  Low   | Clean stylesheet, code and tables stay intact       |

## Images

Images embedded in the file display normally:

![MD View — Beautiful Markdown. Private by default.](data:image/png;base64,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)

Images that live on other websites are **blocked by default** so that reading a document never contacts a server. You will see a notice offering to load them:

![Remote image example (blocked until you choose to load it)](https://example.com/images/diagram.png)

## Quotes and callouts

> Simplicity is prerequisite for reliability.
>
> — Edsger W. Dijkstra

> [!TIP]
> Hover over any heading and use the small icons to copy that section as text or as Markdown.

> [!IMPORTANT]
> Files stay on your computer. MD View has no backend to send them to.

> [!WARNING]
> Very large files (several megabytes) may turn off syntax highlighting to stay fast.

> [!CAUTION]
> Raw HTML in Markdown is sanitized. Scripts, iframes and event handlers are removed.

## HTML that is allowed

Some raw HTML is useful and safe, so it is kept:

<details>
<summary>Click to expand this details block</summary>

Hidden content appears here. It can contain **Markdown** too.

</details>

Press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd> to copy the entire Markdown file, or highlight text with <mark>the mark element</mark>.

<p align="center"><em>Centered text via the align attribute.</em></p>

## What gets removed

The next lines contain an HTML script element and a paragraph with an inline event handler. MD View removes the script entirely and strips the handler, keeping only the harmless text.

<script>alert('This never runs')</script>
<p onmouseover="alert('This never runs either')">This sentence survives, minus its event handler.</p>

If you can read this sentence, the page is intact and no code ran.

## Footnotes

Footnotes are supported.[^1] They collect at the end of the document with a link back to where you were reading.[^2]

## A longer section for scrolling

The outline on the left follows you as you scroll, so you always know where you are. Collapse this section with the chevron that appears next to its heading.

### Context

Large documents are where a reader earns its keep. A product requirements document might run to forty pages, a research report to sixty, an architecture review to a hundred. Navigation, search, and calm typography are what make them bearable.

### Findings

Readers skim first and read second. Headings, tables and callouts give the eye somewhere to land; the table of contents gives the mind a map. When a section is worth sharing, copying it should take one click.

### Recommendations

Keep documents local. Keep them readable. Keep the tool out of the way.

#### Short term

Open a file and start reading. There is nothing to configure.

#### Long term

Nothing to maintain either: no account, no sync, no subscription.

[^1]: This is the first footnote. It can contain *formatting* and [links](https://commonmark.org/).
[^2]: And this is the second. Click the arrow to return to the text.
