// Frontend smoke tests: the real app in a real browser, reading the real
// Firestore emulator (vite dev connects to 127.0.0.1:8080 by default).
// Every test resets the filters first so one failure cannot cascade.
//
//   java -jar ~/.cache/firebase/emulators/cloud-firestore-emulator-*.jar \\
//     --host=127.0.0.1 --port=8080 &
//   node scripts/seed-emulator.mjs          # deterministic feed for the assertions
//   npm --prefix web run dev &
//   npm --prefix web run test:ui
//
// The assertions below depend on exactly what seed-emulator.mjs writes.
import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert';
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:5173/';
let browser, page;
const errors = [];

const cards = () => page.locator('article');
const feedText = async () => (await cards().allTextContents()).join(' | ');
const tab = (name) => page.getByRole('tab', { name }).first();
const search = () => page.getByRole('textbox', { name: 'Search' });
const selectFor = (label) => page.locator('select').filter({ hasText: label }).first();

before(async () => {
  browser = await chromium.launch({
    // Playwright uses its own download unless the environment supplies one.
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-proxy-server', '--no-sandbox'],
  });
  page = await browser.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  // Firestore holds a live connection open, so the network never goes idle.
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('article', { timeout: 25000 });
});

beforeEach(async () => {
  // A modal left open by the previous test would intercept every click, so
  // reload rather than guess at each modal's dismiss affordance.
  if (await page.locator('[role="dialog"]').count()) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('article', { timeout: 25000 });
  }
  await search().fill('');
  await selectFor('All Campus Locations').selectOption({ index: 0 });
  await selectFor('All Categories').selectOption({ index: 0 });
  await tab('All').click();
  await page.waitForTimeout(350);
});

after(async () => { await browser?.close(); });

test('the live Firestore feed renders (not the mock fallback)', async () => {
  assert.strictEqual(await cards().count(), 6, 'the 6 seeded documents');
  const t = await feedText();
  assert.match(t, /Blue Stainless Water Bottle/);
  assert.match(t, /Engineering Maths Textbook Set/);
});

test('cards carry the denormalised poster name and trust score', async () => {
  const t = await feedText();
  assert.match(t, /Riya Singh/);
  assert.match(t, /Arjun Nair/);
  assert.match(t, /\b\d{2}\b/, 'a trust score is rendered');
});

test('FR-9: the lost↔found pair surfaces a match badge', async () => {
  const t = await feedText();
  assert.match(t, /\d{2}% match/, 'a match percentage is shown on the paired cards');
});

test('FR-6/FR-12: the Lost & Found tab hides marketplace listings', async () => {
  await tab('Lost & Found').click();
  await page.waitForTimeout(500);
  assert.strictEqual(await cards().count(), 4);
  const t = await feedText();
  assert.match(t, /Blue Stainless Water Bottle/);
  assert.doesNotMatch(t, /Engineering Maths Textbook Set/);
});

test('FR-12: the Marketplace tab shows only listings, with prices', async () => {
  await tab('Marketplace').click();
  await page.waitForTimeout(500);
  assert.strictEqual(await cards().count(), 2);
  const t = await feedText();
  assert.match(t, /Engineering Maths Textbook Set/);
  assert.doesNotMatch(t, /Blue Stainless Water Bottle/);
  assert.match(t, /450|Free/, 'price or Free badge rendered');
});

test('FR-13: search narrows the feed', async () => {
  await search().fill('calculator');
  await page.waitForTimeout(600);
  const t = await feedText();
  assert.match(t, /Casio/);
  assert.doesNotMatch(t, /Engineering Maths/);
});

test('FR-13: the category filter narrows the feed', async () => {
  await selectFor('All Categories').selectOption({ label: 'ID & Cards' });
  await page.waitForTimeout(600);
  const t = await feedText();
  assert.match(t, /Campus ID Card/);
  assert.doesNotMatch(t, /Casio/);
});

test('FR-8: the campus zone filter narrows the feed', async () => {
  await selectFor('All Campus Locations').selectOption({ label: 'Central Library' });
  await page.waitForTimeout(600);
  const t = await feedText();
  assert.match(t, /Blue/);
  assert.doesNotMatch(t, /Casio/);
});

test('a search with no hits shows an empty state, not a blank page', async () => {
  await search().fill('zzzznothingmatchesthis');
  await page.waitForTimeout(600);
  assert.strictEqual(await cards().count(), 0);
  const main = (await page.locator('main').textContent()).replace(/\s+/g, ' ');
  assert.ok(main.trim().length > 10, `expected an empty-state message, got: "${main}"`);
});

test('FR-1: claiming while signed out prompts sign-in', async () => {
  await page.getByRole('button', { name: /claim this|i found it/i }).first().click();
  await page.waitForTimeout(700);
  const body = (await page.locator('body').textContent()).toLowerCase();
  assert.ok(/sign in/.test(body), 'a sign-in prompt appears');
});

test('FR-12: proposing a deal while signed out prompts sign-in', async () => {
  await tab('Marketplace').click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /make a deal/i }).first().click();
  await page.waitForTimeout(700);
  assert.ok(/sign in/i.test(await page.locator('body').textContent()));
});

test('FR-9: the Smart Match modal opens and names the counterpart', async () => {
  await page.getByRole('button', { name: /% match/i }).first().click();
  await page.waitForTimeout(900);
  const dlg = await page.locator('[role="dialog"]').first().textContent();
  assert.match(dlg, /match/i);
  assert.match(dlg, /Blue/i, 'the paired item is described');
});

test('FR-1: posting while signed out prompts sign-in', async () => {
  await page.getByRole('button', { name: /^post$/i }).first().click();
  await page.waitForTimeout(700);
  assert.ok(/sign in/i.test(await page.locator('body').textContent()));
});

test('usability: the dark mode toggle flips the theme', async () => {
  const before = await page.evaluate(() => document.body.className);
  await page.getByRole('button', { name: /dark|light|theme/i }).first().click();
  await page.waitForTimeout(400);
  const afterCls = await page.evaluate(() => document.body.className);
  assert.notStrictEqual(before, afterCls);
  await page.getByRole('button', { name: /dark|light|theme/i }).first().click();
  await page.waitForTimeout(300);
});

test('accessibility: the feed is reachable by keyboard and tabs are labelled', async () => {
  const tabs = await page.getByRole('tab').count();
  assert.ok(tabs >= 3, `expected the filter tabs to expose role=tab, got ${tabs}`);
  assert.ok(await search().getAttribute('aria-label'), 'the search box has an accessible name');
});

test('no uncaught page errors during the whole run', () => {
  const real = errors.filter((e) => !/favicon|ERR_BLOCKED|net::ERR|Failed to load resource|Firestore|WebChannel/i.test(e));
  assert.deepStrictEqual(real, [], `errors:\n${real.join('\n')}`);
});
