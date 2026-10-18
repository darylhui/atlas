// Captures the README hero images (docs/screens.png, docs/classes.png) from a
// running build and lays them out as rounded phone/tablet frames.
// Usage: npm run build && npx vite preview --port 4173 &
//        node scripts/readme-shots.mjs
// Set BASE_URL to point elsewhere, and CHROME_PATH to use an installed
// Chromium-based browser instead of Playwright's bundled one.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-shots-'));
const BG = '#1b1b1b';

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const errors = [];

const phone = { ...devices['iPhone 13'], viewport: { width: 390, height: 720 } };
const ipad = { viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: devices['iPad (gen 7)'].userAgent };

async function session(opts, fn) {
  const ctx = await browser.newContext({ ...opts, colorScheme: 'dark' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(BASE);
  await page.getByText('Explore with demo clients').click();
  await page.getByText('Today’s schedule').waitFor();
  await page.waitForTimeout(3000); // let the demo-loaded snackbar clear
  const shots = [];
  const shot = async (name) => {
    await page.waitForTimeout(500);
    const file = path.join(TMP, `${name}.png`);
    await page.screenshot({ path: file });
    shots.push(file);
  };
  const go = async (hash) => {
    await page.evaluate((h) => (window.location.hash = h), hash);
    await page.waitForTimeout(500);
  };
  await fn(page, shot, go);
  await ctx.close();
  return shots;
}

// ---- Main README strip: dashboard, recovery, logger, nutrition, client view ----
const main = await session(phone, async (page, shot, go) => {
  await shot('dashboard');

  await go('#/clients');
  await page.getByText('Mei Lin Wong').first().click();
  await page.getByRole('tab', { name: 'Recovery' }).click();
  await shot('recovery');

  await page.locator('.quick').getByText('Workout').click();
  await page.waitForTimeout(500);
  await page.locator('.sheet').getByText('Full Body A').last().click();
  await page.getByText('Add exercise').waitFor();
  const checks = page.getByRole('button', { name: 'Complete set' });
  await checks.nth(0).click();
  await checks.nth(0).click();
  await page.waitForTimeout(3000);
  await shot('logger');

  await go('#/clients');
  await page.getByText('Sarah Tan').first().click();
  await page.getByRole('tab', { name: 'Nutrition' }).click();
  await shot('nutrition');

  await go('#/clients');
  await page.getByText('Sarah Tan').first().click();
  await page.locator('.quick').getByText('Client view').click();
  await page.getByText('Hi Sarah').waitFor();
  await shot('client-view');
});

// ---- Classes strip: hub, lesson, phone timer, iPad timer ----
const classesPhone = await session(phone, async (page, shot) => {
  await page.locator('.tabbar').getByText('Classes').click();
  await shot('classes-hub');
  await page.getByRole('tab', { name: 'Lesson programmes' }).click();
  await page.getByText('Lower-body strength').first().click();
  await shot('classes-lesson');
  await page.getByRole('button', { name: 'Teach now' }).click();
  await page.getByRole('button', { name: 'Start class' }).click();
  await page.getByRole('button', { name: 'Next interval' }).click();
  await page.getByRole('button', { name: 'Next interval' }).click();
  await page.waitForTimeout(1500);
  await shot('classes-timer');
});
const classesIpad = await session(ipad, async (page, shot, go) => {
  await go('#/classes/timer/ex-hiit');
  await page.getByRole('button', { name: 'Start class' }).click();
  await page.getByRole('button', { name: 'Next interval' }).click();
  await page.waitForTimeout(1500);
  await shot('classes-ipad-timer');
});

// ---- Composite ----
async function composite(out, frames) {
  const H = 640;
  const img = (f) => {
    const w = Math.round((f.w / f.h) * H);
    return `<img src="data:image/png;base64,${fs.readFileSync(f.file).toString('base64')}" style="height:${H}px;width:${w}px;border-radius:40px;display:block;box-shadow:0 8px 32px rgba(0,0,0,.45)">`;
  };
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.setContent(
    `<body style="margin:0;background:${BG}"><div id="s" style="display:inline-flex;gap:28px;padding:40px;background:${BG}">${frames.map(img).join('')}</div></body>`,
  );
  await page.locator('#s').screenshot({ path: out });
  await page.close();
  console.log('wrote', path.relative(ROOT, out));
}

const P = (file) => ({ file, w: 390, h: 720 });
await composite(path.join(ROOT, 'docs/screens.png'), main.map(P));
await composite(path.join(ROOT, 'docs/classes.png'), [...classesPhone.map(P), { file: classesIpad[0], w: 1180, h: 820 }]);

await browser.close();
fs.rmSync(TMP, { recursive: true, force: true });
console.log(errors.length ? `ERRORS:\n${[...new Set(errors)].join('\n')}` : 'No console errors');
