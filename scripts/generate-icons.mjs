/**
 * Renders assets/icon-source.svg into every icon the manifest and iOS need.
 * Run with `npm run icons`. Output is committed so CI never needs sharp.
 *
 * The same source feeds @capacitor/assets in M7.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'assets', 'icon-source.svg');
const markSource = join(root, 'assets', 'icon-mark.svg');
const outDir = join(root, 'public', 'icons');

const BACKGROUND = { r: 14, g: 165, b: 233, alpha: 1 }; // --color-brand-500

await mkdir(outDir, { recursive: true });

/** Plain icons: artwork fills the square. */
async function renderPlain(size, name) {
  await sharp(source, { density: 384 })
    .resize(size, size, { fit: 'contain', background: BACKGROUND })
    .flatten({ background: BACKGROUND })
    .png()
    .toFile(join(outDir, name));
  console.log(`  ${name}  ${size}x${size}`);
}

/**
 * Maskable icon: Android may crop to a circle, so the artwork must sit inside
 * the inner 80% and nothing meaningful may touch the edge. Scaling the mark to
 * 60% and padding with the brand colour keeps it clear of any mask.
 *
 * Uses icon-mark.svg (transparent, no backdrop) — compositing the full artboard
 * would stamp its gradient square onto the flat padding.
 */
async function renderMaskable(size, name) {
  const inner = Math.round(size * 0.6);
  const pad = Math.round((size - inner) / 2);

  const art = await sharp(markSource, { density: 384 }).resize(inner, inner).png().toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: BACKGROUND },
  })
    .composite([{ input: art, top: pad, left: pad }])
    .png()
    .toFile(join(outDir, name));
  console.log(`  ${name}  ${size}x${size} (maskable, 60% safe zone)`);
}

console.log('Generating icons from assets/icon-source.svg');
await renderPlain(192, 'icon-192.png');
await renderPlain(512, 'icon-512.png');
await renderMaskable(512, 'icon-512-maskable.png');
await renderPlain(180, 'apple-touch-icon-180.png');

// favicon.ico: a real multi-size ICO, assembled by hand because sharp has no
// ICO encoder. Header + directory entries + embedded PNGs (Vista-style ICO).
const icoSizes = [16, 32, 48];
const pngs = await Promise.all(
  icoSizes.map((s) =>
    sharp(source, { density: 384 })
      .resize(s, s, { fit: 'contain', background: BACKGROUND })
      .flatten({ background: BACKGROUND })
      .png()
      .toBuffer(),
  ),
);

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type 1 = icon
header.writeUInt16LE(icoSizes.length, 4);

let offset = 6 + icoSizes.length * 16;
const entries = [];
for (const [i, size] of icoSizes.entries()) {
  const png = pngs[i];
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size === 256 ? 0 : size, 0); // width
  entry.writeUInt8(size === 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // palette size
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(offset, 12);
  entries.push(entry);
  offset += png.length;
}

await writeFile(join(root, 'public', 'favicon.ico'), Buffer.concat([header, ...entries, ...pngs]));
console.log('  favicon.ico  16/32/48');
console.log('Done.');
