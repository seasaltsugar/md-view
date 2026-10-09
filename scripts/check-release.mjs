// Release sanity check, run after `npm run build` and `npm run zip`.
//  - FAILS if the built manifest requests any permission, or lacks the strict CSP.
//  - WARNS if lib/config.ts still contains placeholder URLs (set them before publishing).
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = false;
const fail = (msg) => ((failed = true), console.error(`✗ ${msg}`));
const ok = (msg) => console.log(`✓ ${msg}`);
const warn = (msg) => console.warn(`⚠ ${msg}`);

const manifestPath = join(root, '.output/chrome-mv3/manifest.json');
if (!existsSync(manifestPath)) {
  fail('No built manifest found at .output/chrome-mv3/manifest.json — run `npm run build` first.');
} else {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const permissionKeys = ['permissions', 'host_permissions', 'optional_permissions', 'optional_host_permissions', 'content_scripts', 'externally_connectable'];
  const requested = permissionKeys.filter((key) => Array.isArray(manifest[key]) ? manifest[key].length > 0 : Boolean(manifest[key]));
  if (requested.length) fail(`Manifest requests more than MD View promises: ${requested.join(', ')}`);
  else ok('Manifest requests no permissions, host access or content scripts');

  const csp = manifest.content_security_policy?.extension_pages ?? '';
  for (const rule of ["connect-src 'none'", "script-src 'self'", "object-src 'none'", "frame-src 'none'"]) {
    if (!csp.includes(rule)) fail(`Content Security Policy is missing ${rule}`);
  }
  if (csp) ok('Strict Content Security Policy present');
  if (manifest.description?.length > 132) fail('Manifest description is longer than the 132 characters Chrome allows');
}

const config = readFileSync(join(root, 'lib/config.ts'), 'utf8');
if (/example\.com|your-username/.test(config)) {
  warn('lib/config.ts still has placeholder URLs (SUPPORT_URL / REPO_URL). Set them, or pass WXT_SUPPORT_URL and WXT_REPO_URL, before submitting to the Chrome Web Store.');
} else ok('Support and repository URLs are configured');

process.exit(failed ? 1 : 0);
