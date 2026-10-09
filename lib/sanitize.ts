import DOMPurify from 'dompurify';

/**
 * Every byte of generated HTML passes through here before it reaches the page.
 * Markdown is untrusted input: raw HTML inside it is allowed only if it survives this allow-list.
 *
 * Removed outright: <script>, <iframe>, <object>, <embed>, <form>, <style>, <svg>, <math>,
 * event-handler attributes (onclick…), inline `style`, and javascript:/data: links.
 *
 * Remote images are never requested: their URL is moved out of `src` (see the hook below)
 * so nothing is fetched until the person explicitly chooses "Load images".
 */
const ALLOWED_TAGS = [
  'a', 'abbr', 'b', 'bdi', 'bdo', 'blockquote', 'br', 'caption', 'cite', 'code', 'col', 'colgroup',
  'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt', 'em', 'figcaption', 'figure',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'input', 'ins', 'kbd', 'li', 'mark',
  'ol', 'p', 'pre', 'q', 's', 'samp', 'section', 'small', 'span', 'strike', 'strong', 'sub',
  'summary', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'time', 'tr', 'u', 'ul', 'var', 'wbr',
];

const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'title', 'width', 'height', 'align', 'colspan', 'rowspan', 'scope',
  'open', 'type', 'checked', 'disabled', 'class', 'id', 'lang', 'dir', 'start', 'reversed',
  'cite', 'datetime', 'headers', 'abbr',
  // Source line range, written by the renderer so sections can be copied as Markdown.
  'data-md-start', 'data-md-end',
];

/**
 * Only these URL schemes survive on links; relative links are dropped (there is nothing to resolve them against).
 * Enforced in the hook below. (A strict ALLOWED_URI_REGEXP would make DOMPurify apply it to non-URL
 * attributes such as align="left", so the default URL handling is kept as a first layer.)
 */
const SAFE_LINK = /^(?:https?:|mailto:|tel:|#)/i;

/** Image sources that are safe to keep inline (they make no network request). */
const INLINE_IMAGE = /^data:image\/(?:png|jpe?g|gif|webp|avif|bmp|svg\+xml)[;,]/i;

/** CSS classes the renderer itself produces. Anything else in raw HTML is dropped. */
const ALLOWED_CLASS =
  /^(?:hljs(?:-[\w-]+)?|[a-z]+_{1,2}|language-[\w+#.-]+|alert(?:-[a-z]+)?|contains-task-list|task-list-item(?:-checkbox)?|footnotes(?:-sep|-list)?|footnote-(?:ref|item|backref)|front-matter)$/;

let hooksInstalled = false;

function installHooks(): void {
  if (hooksInstalled) return;
  hooksInstalled = true;

  DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
    if (data.attrName === 'class') {
      const kept = data.attrValue.split(/\s+/).filter((token) => ALLOWED_CLASS.test(token));
      if (kept.length > 0) data.attrValue = kept.join(' ');
      else data.keepAttr = false;
    } else if (data.attrName === 'id' && /^ui-/i.test(data.attrValue)) {
      // "ui-" is reserved for the app's own elements.
      data.keepAttr = false;
    }
  });

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    const tag = node.tagName;

    if (tag === 'A') {
      const href = node.getAttribute('href') ?? '';
      if (node.hasAttribute('href') && !SAFE_LINK.test(href)) {
        node.removeAttribute('href');
      } else if (/^https?:/i.test(href)) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
      return;
    }

    if (tag === 'IMG') {
      const src = node.getAttribute('src') ?? '';
      node.removeAttribute('src');
      if (src && INLINE_IMAGE.test(src)) {
        node.setAttribute('src', src);
      } else if (/^https:/i.test(src)) {
        node.setAttribute('data-remote-src', src);
        node.setAttribute('data-mdv-image', 'remote');
      } else if (/^http:/i.test(src)) {
        node.setAttribute('data-mdv-image', 'insecure');
      } else {
        node.setAttribute('data-mdv-image', 'local');
      }
      return;
    }

    if (tag === 'INPUT') {
      // Only the read-only checkboxes produced for task lists are allowed.
      if ((node.getAttribute('type') ?? '').toLowerCase() !== 'checkbox') {
        node.parentNode?.removeChild(node);
        return;
      }
      node.setAttribute('disabled', '');
    }
  });
}

/** Sanitizes an HTML string produced from untrusted Markdown. */
export function sanitizeHtml(dirty: string): string {
  installHooks();
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    RETURN_TRUSTED_TYPE: false,
  }) as string;
}
