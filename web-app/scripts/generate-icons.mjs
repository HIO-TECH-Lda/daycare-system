// Generates the favicon / app / PWA icons from the logo mark (the tree).
// Run again when the clean vector logo arrives: node scripts/generate-icons.mjs
//
// The traced logo only looks right on light backgrounds, so icons use a white tile.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const SOURCE = 'public/brand/logo-mark.svg';
const BACKGROUND = '#ffffff';

/** The mark centred on a square tile, filling `fill` of its width. */
async function tile(size, fill, out) {
  const inner = Math.round(size * fill);
  const mark = await sharp(SOURCE, { density: 600 })
    .resize(inner, inner, { fit: 'contain', background: BACKGROUND })
    .png()
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BACKGROUND } })
    .composite([{ input: mark, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`${out} (${size}×${size})`);
}

mkdirSync('public/icons', { recursive: true });
await tile(192, 0.86, 'app/icon.png');
await tile(180, 0.8, 'app/apple-icon.png');
await tile(192, 0.86, 'public/icons/icon-192.png');
await tile(512, 0.86, 'public/icons/icon-512.png');
// Maskable: launchers may crop to a circle, so keep the mark inside the 80% safe zone
await tile(512, 0.62, 'public/icons/maskable-512.png');
