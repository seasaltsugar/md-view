// Regenerates public/icon/*.png from assets/icon.svg.
// Needs the `sharp` package (not a dependency of the extension):  npm i --no-save sharp && npm run icons
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { default: sharp } = await import('sharp');
const svg = readFileSync(join(root, 'assets/icon.svg'));
mkdirSync(join(root, 'public/icon'), { recursive: true });
for (const size of [16, 32, 48, 96, 128]) {
  await sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toFile(join(root, `public/icon/${size}.png`));
  console.log(`public/icon/${size}.png`);
}
