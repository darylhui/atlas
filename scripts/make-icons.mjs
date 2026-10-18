// Renders the PWA / Apple touch icons from an inline SVG using the
// pre-installed Chromium. Run with: node scripts/make-icons.mjs
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');

// Full-bleed square: iOS applies its own rounded mask to touch icons.
const mark = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#c6f432"/>
  <g transform="translate(${pad} ${pad}) scale(${(512 - pad * 2) / 32})">
    <path d="M9.5 24 16 8l6.5 16" fill="none" stroke="#0b0c0e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M6 18.5h20" stroke="#0b0c0e" stroke-width="2.6" stroke-linecap="round"/>
    <rect x="5" y="15.5" width="2.6" height="6" rx="1" fill="#0b0c0e"/>
    <rect x="24.4" y="15.5" width="2.6" height="6" rx="1" fill="#0b0c0e"/>
  </g>
</svg>`;

const icons = [
  { file: 'icon-512.png', size: 512, pad: 40 },
  { file: 'icon-192.png', size: 192, pad: 40 },
  { file: 'apple-touch-icon.png', size: 180, pad: 40 },
  { file: 'icon-maskable-512.png', size: 512, pad: 110 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const i of icons) {
  await page.setViewportSize({ width: i.size, height: i.size });
  await page.setContent(`<html><body style="margin:0">${mark(i.pad).replace('width="512" height="512"', `width="${i.size}" height="${i.size}"`)}</body></html>`);
  await page.screenshot({ path: path.join(out, i.file), omitBackground: false });
  console.log('wrote', i.file);
}
await browser.close();
