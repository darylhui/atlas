// Walks through the main flows on phone and tablet viewports and saves
// screenshots. Usage: npm run build && npx vite preview --port 4173 &
//                     node scripts/screenshots.mjs [outDir]
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/';
const OUT = process.argv[2] ?? 'screenshots';
fs.mkdirSync(OUT, { recursive: true });

const errors = [];
const browser = await chromium.launch();

async function session(name, contextOpts, fn) {
  const ctx = await browser.newContext({ ...contextOpts, colorScheme: 'dark' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[${name}] pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`[${name}] console: ${m.text()}`));
  const shot = async (label, full = false) => {
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(OUT, `${name}-${label}.png`), fullPage: full });
  };
  await fn(page, shot);
  await ctx.close();
}

const go = (page, hash) => page.evaluate((h) => (window.location.hash = h), hash);

await session('phone', devices['iPhone 13'], async (page, shot) => {
  await page.goto(BASE);
  await page.getByText('Explore with demo clients').waitFor();
  await shot('00-welcome');
  await page.getByText('Explore with demo clients').click();
  await page.getByText('Today’s schedule').waitFor();
  await shot('01-dashboard');
  await shot('01-dashboard-full', true);

  await page.locator('.tabbar').getByText('Clients').click();
  await shot('02-clients');
  await page.getByText('Marcus Lee').first().click();
  await page.getByText('Overview', { exact: true }).waitFor();
  await shot('03-client-overview', true);
  for (const tab of ['Training', 'Recovery', 'Nutrition', 'Body', 'Goals & habits', 'Profile']) {
    await page.getByRole('tab', { name: tab }).click();
    await shot(`04-client-${tab.toLowerCase().replace(/[^a-z]+/g, '-')}`, true);
  }

  // Readiness check-in
  await page.getByRole('tab', { name: 'Overview' }).click();
  await page.locator('.quick').getByText('Check-in').click();
  await page.getByText('Hours slept').waitFor();
  await shot('05-check-in', true);
  await page.getByText('Save check-in').click();
  await page.waitForTimeout(300);

  // Workout logger
  await page.locator('.quick').getByText('Workout').click();
  await page.waitForTimeout(500);
  await page.locator('.sheet').getByText('Upper Body').last().click();
  await page.getByText('Add exercise').waitFor();
  await shot('06-logger');
  const checks = page.getByRole('button', { name: 'Complete set' });
  await checks.nth(0).click();
  await checks.nth(0).click();
  await page.waitForTimeout(400);
  await shot('07-logger-rest');
  await page.getByRole('button', { name: 'Finish' }).click();
  await page.getByText('Session RPE').waitFor();
  await shot('08-finish');
  await page.getByText('Save workout').click();
  await page.getByText('Workout complete').waitFor();
  await shot('09-summary', true);

  await go(page, '#/schedule');
  await page.getByText('PT · classes').waitFor();
  await shot('10-schedule');
  await go(page, '#/library');
  await shot('11-library');
  await go(page, '#/library/template/tpl-upper');
  await shot('12-template', true);
  await go(page, '#/tools');
  await shot('13-tools');
  await go(page, '#/business');
  await shot('14-business', true);
  await go(page, '#/settings');
  await shot('15-settings', true);
  await go(page, '#/more');
  await shot('16-more');

  // Client mode + share card
  await go(page, '#/clients');
  await page.getByText('Sarah Tan').first().click();
  await page.getByRole('button', { name: 'Share progress' }).click();
  await page.getByAltText('Progress card preview').waitFor();
  await shot('17-share-card');
  await page.getByRole('button', { name: 'Close' }).first().click();
  await page.locator('.quick').getByText('Client view').click();
  await page.getByText('Hi Sarah').waitFor();
  await shot('18-client-mode', true);

  // Quick add sheet
  await go(page, '#/');
  await page.locator('.tabbar .tab-fab').click();
  await shot('19-quick-add');
});

for (const [name, viewport] of [
  ['ipad-portrait', { width: 820, height: 1180 }],
  ['ipad-landscape', { width: 1180, height: 820 }],
]) {
  await session(name, { viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: devices['iPad (gen 7)'].userAgent }, async (page, shot) => {
    await page.goto(BASE);
    await page.getByText('Explore with demo clients').click();
    await page.getByText('Today’s schedule').waitFor();
    await shot('01-dashboard', true);
    await go(page, '#/clients');
    await page.getByText('Mei Lin Wong').first().click();
    await page.getByRole('tab', { name: 'Recovery' }).click();
    await shot('02-recovery', true);
    await page.getByRole('tab', { name: 'Training' }).click();
    await shot('03-training', true);
    await page.locator('.quick').getByText('Workout').click();
    await page.waitForTimeout(500);
    await page.locator('.sheet').getByText('Full Body A').last().click();
    await page.getByText('Add exercise').waitFor();
    await shot('04-logger');
  });
}

await browser.close();
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'No console errors');
