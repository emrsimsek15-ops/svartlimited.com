// Responsive screenshot + overflow pass. Usage: npm run build && npm run screenshots
// Starts `vite preview`, loads the sample data, and visits every screen at every width.
import { createRequire } from 'node:module';
// Uses an installed `playwright` package (npm i -D playwright) — resolved via require so a global install works too.
const { chromium } = createRequire(import.meta.url)('playwright');
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const PORT = 4179;
const BASE = `http://localhost:${PORT}/davinci/`;
const WIDTHS = [
  [375, 812], [390, 844], [430, 932], [768, 1024], [820, 1180], [1024, 768], [1180, 820], [1366, 900], [1440, 900], [1920, 1080],
  [1180, 820, 'ipad-landscape'],
];
const ROUTES = ['', 'calendar', 'trades', 'reports', 'settings'];
const only = process.argv[2];

mkdirSync('screenshots', { recursive: true });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((r) => server.stdout.on('data', (d) => String(d).includes('Local') && r()));

const browser = await chromium.launch();
const problems = [];
try {
  // Seed once (IndexedDB persists per context, so use one persistent storage state).
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce', timezoneId: 'Europe/Istanbul' });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.getByRole('button', { name: 'Örnek veriyi aç' }).click();
  await page.waitForSelector('text=Kümülatif net K/Z');

  for (const [w, h, name] of WIDTHS) {
    if (only && String(w) !== only) continue;
    await page.setViewportSize({ width: w, height: h });
    for (const r of ROUTES) {
      await page.goto(`${BASE}#/${r}`);
      await page.waitForTimeout(450);
      const overflow = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const bad = [];
        for (const el of document.querySelectorAll('body *')) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || getComputedStyle(el).position === 'fixed') continue;
          if (rect.right > vw + 0.5 || rect.left < -0.5) {
            let p = el.parentElement, clipped = false;
            while (p) { const o = getComputedStyle(p).overflowX; if (o === 'hidden' || o === 'auto' || o === 'scroll' || o === 'clip') { clipped = true; break; } p = p.parentElement; }
            if (!clipped) bad.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} ${Math.round(rect.left)}..${Math.round(rect.right)}`);
          }
        }
        return { scroll: document.documentElement.scrollWidth > vw, vw, bad: bad.slice(0, 5) };
      });
      if (overflow.scroll || overflow.bad.length) problems.push({ w, r, ...overflow });
      await page.screenshot({ path: `screenshots/${name ?? w}-${r || 'dashboard'}.png`, fullPage: r !== 'trades' });
    }
    // Day sheet on calendar
    await page.goto(`${BASE}#/calendar`);
    await page.waitForTimeout(300);
    const day = page.locator('button[aria-label*=" işlem"]:not([aria-label*="yok"])').first();
    if (await day.count()) {
      await day.click();
      await page.waitForTimeout(450);
      await page.screenshot({ path: `screenshots/${name ?? w}-calendar-day.png` });
      await page.keyboard.press('Escape');
    }
  }
} finally {
  await browser.close();
  server.kill();
}
if (problems.length) {
  console.log('OVERFLOW PROBLEMS:');
  for (const p of problems) console.log(JSON.stringify(p));
  process.exit(1);
} else console.log('No horizontal overflow at any width.');
process.exit(0);
