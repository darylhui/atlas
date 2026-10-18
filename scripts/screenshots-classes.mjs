// Screenshots of the group-class screens on phone and iPad.
// Usage: npm run build && npx vite preview --port 4173 &
//        node scripts/screenshots-classes.mjs <outDir>
import { chromium, devices } from 'playwright';
import fs from 'node:fs';

const OUT = process.argv[2] ?? 'screenshots';
fs.mkdirSync(OUT, { recursive: true });
const errors = [];
const b = await chromium.launch();
async function run(name, opts, fn) {
  const ctx = await b.newContext({ ...opts, colorScheme: 'dark' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`[${name}] ${e.message}`));
  p.on('console', (m) => m.type() === 'error' && errors.push(`[${name}] console ${m.text()}`));
  const shot = async (n, full = false) => { await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/${name}-${n}.png`, fullPage: full }); };
  await p.goto('http://localhost:4173/');
  await p.getByText('Explore with demo clients').click();
  await p.waitForTimeout(2800);
  await fn(p, shot);
  await ctx.close();
}
await run('phone', devices['iPhone 13'], async (p, shot) => {
  await shot('01-dashboard', true);
  await p.locator('.tabbar').getByText('Classes').click();
  await shot('02-hub', true);
  await p.getByRole('tab', { name: 'Lesson programmes' }).click();
  await shot('03-programmes', true);
  await p.getByText('Lower-body strength').first().click();
  await shot('04-lesson', true);
  await p.getByRole('button', { name: 'Edit lesson' }).click();
  await shot('05-editor', true);
  await p.goBack();
  await p.getByRole('button', { name: 'Teach now' }).click();
  await shot('06-timer-ready');
  await p.getByRole('button', { name: 'Start class' }).click();
  await p.waitForTimeout(1500);
  await shot('07-timer-warmup');
  await p.getByRole('button', { name: 'Next interval' }).click();
  await p.getByRole('button', { name: 'Next interval' }).click();
  await p.waitForTimeout(1200);
  await shot('08-timer-stations');
  await p.getByRole('button', { name: 'Next interval' }).click();
  await p.waitForTimeout(800);
  await shot('09-timer-rest');
  await p.getByRole('button', { name: 'Exit timer' }).click();
  await p.getByRole('button', { name: 'Leave' }).click();
  await p.waitForTimeout(500);
  await p.evaluate(() => (location.hash = '#/classes'));
  await p.waitForTimeout(500);
  await p.getByRole('button', { name: 'Attendance' }).click();
  await shot('10-session', true);
  await p.evaluate(() => (location.hash = '#/schedule'));
  await shot('11-schedule', true);
  await p.evaluate(() => (location.hash = '#/business'));
  await shot('12-business', true);
  await p.evaluate(() => (location.hash = '#/clients'));
  await p.getByText('Mei Lin Wong').first().click();
  await p.getByRole('tab', { name: 'Recovery' }).click();
  await shot('13-mei-recovery');
});
await run('ipad', { viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, async (p, shot) => {
  await p.evaluate(() => (location.hash = '#/classes'));
  await p.waitForTimeout(500);
  await shot('01-hub', true);
  await p.evaluate(() => (location.hash = '#/classes/timer/ex-hiit'));
  await p.waitForTimeout(500);
  await p.getByRole('button', { name: 'Start class' }).click();
  await p.getByRole('button', { name: 'Next interval' }).click();
  await p.waitForTimeout(1500);
  await shot('02-timer-stations');
  for (let i = 0; i < 18; i++) await p.getByRole('button', { name: 'Next interval' }).click();
  await p.waitForTimeout(1200);
  await shot('03-timer-sprints');
});
await b.close();
console.log(errors.length ? errors.join('\n') : 'No console errors');
