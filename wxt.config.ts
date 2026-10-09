import { defineConfig } from 'wxt';

/**
 * MD View is a Manifest V3 extension with ZERO permissions.
 *
 * - Preferences use localStorage on the extension's own origin (no "storage" permission).
 * - Files are chosen with the standard File API (no file-system access permission).
 * - Copying uses navigator.clipboard.writeText during a user gesture (no clipboard permission).
 * - Clicking the toolbar icon opens our own page with chrome.tabs.create (no "tabs" permission).
 *
 * The production Content Security Policy forbids every network connection, so even a bug
 * could not send data anywhere. The only relaxed directive is `img-src https:`, which exists
 * solely so people can *choose* to load remote images referenced by a document. Those images
 * are blocked by default and never requested unless the person clicks "Load images".
 */
const PRODUCTION_CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "connect-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

export default defineConfig({
  manifest: ({ command }) => ({
    name: 'MD View',
    description:
      'Beautifully read Markdown files directly in Chrome. Private, local, free, and distraction-free.',
    minimum_chrome_version: '111',
    permissions: [],
    action: { default_title: 'Open MD View' },
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      96: 'icon/96.png',
      128: 'icon/128.png',
    },
    // In `wxt` (dev) mode the dev server needs looser rules for hot reload, so the strict CSP
    // is applied to production builds only.
    content_security_policy: command === 'build' ? { extension_pages: PRODUCTION_CSP } : undefined,
  }),
});
