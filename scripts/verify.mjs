// Smoke-test driver: loads the site in headless Edge, clicks Start, drives
// the Ape into the About zone, and screenshots each stage.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const OUT = 'scripts/shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--use-angle=default', '--enable-unsafe-swiftshader'],
});
const page = await (await browser.newContext({
  viewport: { width: 1440, height: 900 },
})).newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});

await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

// 1. loading screen — title must read VITO / DI GRIGOLI on exactly two lines
await page.waitForSelector('#start-btn.ready', { timeout: 30000 });
const titleLines = await page.evaluate(() => {
  const tops = [...document.querySelectorAll('#loader-title .word')]
    .map((w) => Math.round(w.getBoundingClientRect().top));
  return [...new Set(tops)].length;
});
console.log('loader title lines:', titleLines, titleLines === 2 ? '(ok)' : '(BAD)');
if (titleLines !== 2) errors.push(`loader title spans ${titleLines} lines, expected 2`);
await page.screenshot({ path: `${OUT}/1-loader.png` });

// 2. start → world
await page.click('#start-btn');
await page.waitForTimeout(2500);
const info = await page.evaluate(() => ({ ...window.__vito.renderInfo }));
console.log('draw calls:', info.calls, '| triangles:', info.triangles);
await page.screenshot({ path: `${OUT}/2-spawn.png` });

// 3. drive forward, snap a mid-turn shot (lean + steering), then coast
await page.keyboard.down('w');
await page.waitForTimeout(900);
await page.keyboard.down('d');
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/3a-turning.png` });
await page.keyboard.up('d');
await page.waitForTimeout(2300);
await page.keyboard.up('w');
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/3-driving.png` });

// 4. bird's-eye view to check the Sicily silhouette
await page.evaluate(() => window.__vito.topView(true));
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/3b-sicily-shape.png` });
await page.evaluate(() => window.__vito.topView(false));

// 5. teleport next to the About house and confirm the panel opens
await page.evaluate(() => {
  const v = window.__vito.vehicle;
  v.position.set(-38, 0, -8);
  v.speed = 0;
});
await page.waitForSelector('#panel.show', { timeout: 5000 });
await page.waitForTimeout(700);
const panelTitle = await page.textContent('#panel-title');
console.log('panel opened with title:', JSON.stringify(panelTitle));
await page.screenshot({ path: `${OUT}/4-about-panel.png` });

// 5b. teleport into the theater and confirm a project panel opens
await page.evaluate(() => {
  const v = window.__vito.vehicle;
  v.position.set(28, 0, 27);
  v.heading = Math.PI; // look north across the orchestra
  v.speed = 0;
});
await page.waitForTimeout(1200);
const projTitle = await page.textContent('#panel-title');
console.log('project panel title:', JSON.stringify(projTitle));
await page.screenshot({ path: `${OUT}/4b-projects.png` });

// 5c. the Valley of the Temples (skills)
await page.evaluate(() => {
  const v = window.__vito.vehicle;
  v.position.set(-34, 0, 13);
  v.heading = 0; // look south toward the temple
  v.speed = 0;
});
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/4c-temples.png` });

// 5. measure FPS over 3 seconds
const fps = await page.evaluate(() => new Promise((res) => {
  let frames = 0;
  const t0 = performance.now();
  const tick = () => {
    frames++;
    if (performance.now() - t0 < 3000) requestAnimationFrame(tick);
    else res(Math.round(frames / ((performance.now() - t0) / 1000)));
  };
  requestAnimationFrame(tick);
}));
console.log('fps (headless/software renderer):', fps);

// 6b. signposts in the piazza (reverse a bit so they're in frame)
await page.evaluate(() => {
  const v = window.__vito.vehicle;
  v.position.set(0, 0, 10);
  v.heading = Math.PI;
  v.speed = 0;
});
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/6-signposts.png` });

// 6c. vespa rear: license plate (drive away from camera then stop)
await page.keyboard.down('w');
await page.waitForTimeout(700);
await page.keyboard.up('w');
await page.waitForTimeout(1100);
await page.screenshot({ path: `${OUT}/6b-vespa-rear.png` });

// 6d. night mode: toggle and screenshot piazza + lampposts
await page.click('#night-btn');
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/7-night.png` });
// lighthouse glows at night
await page.evaluate(() => {
  const v = window.__vito.vehicle;
  v.position.set(-72, 0, 5);
  v.heading = -Math.PI / 2; // face west (-x), toward the lighthouse
  v.speed = 0;
});
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/7c-lighthouse-night.png` });
// cart's new spot, at night with headlight
await page.evaluate(() => {
  const v = window.__vito.vehicle;
  v.position.set(20, 0, -2);
  v.heading = -Math.PI / 2.5;
  v.speed = 0;
});
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/7b-night-cart.png` });
await page.click('#night-btn'); // back to day
await page.waitForTimeout(400);
// cart in daylight
await page.screenshot({ path: `${OUT}/8-cart-day.png` });

// 6e. breakable prickly pear: ram the first breakable collider
const smash = await page.evaluate(async () => {
  const { vehicle, world } = window.__vito;
  const c = world.colliders.find((k) => k.onHit && !k.dead);
  if (!c) return 'no breakable collider found';
  vehicle.position.set(c.x + 2.5, 0, c.z);
  vehicle.heading = Math.atan2(c.x - vehicle.position.x, c.z - vehicle.position.z);
  vehicle.speed = 14;
  await new Promise((r) => setTimeout(r, 600));
  return c.dead === true ? 'smashed (ok)' : 'still intact (BAD)';
});
console.log('prickly pear:', smash);
if (!smash.includes('ok')) errors.push(`prickly pear: ${smash}`);
await page.screenshot({ path: `${OUT}/9-smash.png` });

// 6. mobile viewport check: loader title wrap + panel above joystick
const mob = await (await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
})).newPage();
mob.on('pageerror', (e) => errors.push(`mobile pageerror: ${e.message}`));
await mob.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
await mob.waitForSelector('#start-btn.ready', { timeout: 30000 });
await mob.screenshot({ path: `${OUT}/5-mobile-loader.png` });
await mob.tap('#start-btn');
await mob.waitForTimeout(2000);
await mob.screenshot({ path: `${OUT}/5-mobile.png` });
// teleport into the About trigger: panel must sit above the joystick
await mob.evaluate(() => {
  const v = window.__vito.vehicle;
  v.position.set(-38, 0, -8);
  v.speed = 0;
});
await mob.waitForSelector('#panel.show', { timeout: 5000 });
await mob.waitForTimeout(700);
const panelBox = await mob.locator('#panel').boundingBox();
const joyBox = await mob.locator('#joystick').boundingBox();
console.log('panel bottom:', panelBox.y + panelBox.height, '| joystick top:', joyBox.y,
  '| overlap:', panelBox.y + panelBox.height > joyBox.y ? 'YES (BAD)' : 'no');
await mob.screenshot({ path: `${OUT}/5b-mobile-panel.png` });

console.log('JS errors:', errors.length ? errors : 'none');
await browser.close();
process.exit(errors.length ? 1 : 0);
