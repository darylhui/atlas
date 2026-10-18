// Renders the PWA / Apple touch icons from an inline SVG using the
// pre-installed Chromium. Run with: node scripts/make-icons.mjs
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');

// Full-bleed square: iOS applies its own rounded mask to touch icons.
// The mark is a circle held up by a square, on the 32-unit grid used by <Logo>.
const mark = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#121212"/>
  <g transform="translate(${pad} ${pad}) scale(${(512 - pad * 2) / 32})">
    <rect x="9" y="15" width="14" height="14" fill="#03dac6"/>
    <circle cx="16" cy="9" r="6" fill="#bb86fc"/>
  </g>
</svg>`;

const icons = [
  { file: 'icon-512.png', size: 512, pad: 80 },
  { file: 'icon-192.png', size: 192, pad: 80 },
  { file: 'apple-touch-icon.png', size: 180, pad: 80 },
  { file: 'icon-maskable-512.png', size: 512, pad: 120 },
];

// CHROME_PATH lets you render with an installed Chromium-based browser.
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage();
for (const i of icons) {
  await page.setViewportSize({ width: i.size, height: i.size });
  await page.setContent(`<html><body style="margin:0">${mark(i.pad).replace('width="512" height="512"', `width="${i.size}" height="${i.size}"`)}</body></html>`);
  await page.screenshot({ path: path.join(out, i.file), omitBackground: false });
  console.log('wrote', i.file);
}
await browser.close();
