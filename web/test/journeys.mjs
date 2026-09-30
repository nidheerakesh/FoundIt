// Every signed-in user journey, driven as three demo accounts with the real
// security rules enforced. See docs/TESTING.md §5 for the emulator setup.
//
//   node web/test/journeys.mjs
//
// Exits non-zero if any check fails. Needs a freshly seeded emulator: it posts,
// claims, sells and flags, so a second run against the same data will not match.
import { chromium } from 'playwright';
const B = { executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-proxy-server', '--no-sandbox'] };
const URL = 'http://127.0.0.1:5173/';
let pass = 0, fail = 0;
const errs = [];
const step = (ok, name, extra='') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`); };
const guard = async (name, fn) => { try { return await fn(); } catch (e) { step(false, name, String(e).split('\n')[0].slice(0,140)); return null; } };
const text = async (loc) => ((await loc.textContent({ timeout: 8000 }).catch(() => '')) || '').replace(/\s+/g, ' ');

async function open(browser, who) {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(`${who}: ${e}`));
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('article', { timeout: 30000 });
  await p.getByRole('button', { name: /sign in/i }).first().click();
  await p.waitForTimeout(500);
  await p.locator('button').filter({ hasText: new RegExp(who) }).first().click();
  await p.waitForTimeout(2500);
  return p;
}
const card = (p, t) => p.locator('article').filter({ hasText: t }).first();
const dlg = (p) => p.locator('[role="dialog"]').first();
const reload = async (p) => { await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForSelector('article', { timeout: 30000 }); await p.waitForTimeout(1500); };
const tab = (p, n) => p.getByRole('tab', { name: n }).first().click();

const browser = await chromium.launch(B);

console.log('\n── 1. Demo sign-in');
const riya = await open(browser, 'Riya Singh');
const arjun = await open(browser, 'Arjun Nair');
const meera = await open(browser, 'Meera Das');
for (const [p, n] of [[riya,'Riya'],[arjun,'Arjun'],[meera,'Meera']]) {
  step(!(await p.getByRole('button', { name: /^sign in$/i }).count()), `${n} signs in with a demo account`);
}

console.log('\n── 2. Post a new report (FR-6)');
await riya.getByRole('button', { name: /^post$/i }).first().click();
await riya.waitForTimeout(700);
await guard('fill title', () => dlg(riya).locator('input').first().fill('Grey Dell laptop charger'));
await guard('fill description', () => dlg(riya).locator('textarea').first().fill('65W Dell charger left in LH-102 after the morning lecture.'));
await guard('submit post', () => dlg(riya).locator('button[type="submit"]').click({ timeout: 8000 }));
await riya.waitForTimeout(3000);
await reload(riya);
step(/Grey Dell laptop charger/.test(await text(riya.locator('main'))), 'the new report appears in the live feed');
step(/Review claims/.test(await text(card(riya, 'Grey Dell laptop charger'))), 'its poster gets "Review claims" on it');

console.log('\n── 3. Claim → chat → review → approve (FR-10, FR-17)');
await card(arjun, 'Blue Stainless Water Bottle').getByRole('button', { name: /i found it/i }).click();
await arjun.waitForTimeout(700);
await dlg(arjun).locator('textarea').first().fill('GitHub and React stickers, small dent near the base.');
await dlg(arjun).getByRole('button', { name: /submit claim/i }).click();
await arjun.waitForTimeout(2500);
const claimed = await text(dlg(arjun));
step(/Verification Claim Sent/i.test(claimed), 'claim submits');
step(/attached to/i.test(claimed) && !/has received/i.test(claimed), 'honest confirmation copy');
await dlg(arjun).getByRole('button', { name: /open direct chat/i }).click();
await arjun.waitForTimeout(2500);
step(!/insufficient permissions/i.test(await text(dlg(arjun))), 'chat opens on first contact (the reported bug)');
await arjun.locator('input[placeholder*="Message" i]').first().fill('I have it — library desk at 4?');
await arjun.keyboard.press('Enter');
await arjun.waitForTimeout(2000);
const chat = await text(dlg(arjun));
step(/library desk at 4/.test(chat) && !/insufficient/i.test(chat), 'message sends and shows in the thread');
await reload(riya);
await guard('open Review claims', () => card(riya, 'Blue Stainless Water Bottle').getByRole('button', { name: /review claims/i }).click({ timeout: 8000 }));
await riya.waitForTimeout(2000);
const review = await text(dlg(riya));
step(/Arjun Nair/.test(review) && /GitHub and React stickers/.test(review), 'owner reads the claimant and their proof');
await guard('approve', () => dlg(riya).getByRole('button', { name: /approve/i }).first().click({ timeout: 8000 }));
await riya.waitForTimeout(2500);
step(/Approved/i.test(await text(dlg(riya))), 'claim is approved');
await riya.keyboard.press('Escape');

console.log('\n── 4. Marketplace handshake (FR-12, FR-15, FR-18)');
// Arjun still has the chat dialog open from section 3; it would intercept clicks.
await reload(arjun); await reload(meera);
const BOOK = 'Engineering Maths Textbook Set';
await tab(meera, 'Marketplace'); await meera.waitForTimeout(500);
step(/No offers yet/.test(await text(card(meera, BOOK))), 'seller sees "No offers yet", not "Make a deal"');
await tab(arjun, 'Marketplace'); await arjun.waitForTimeout(500);
await card(arjun, BOOK).getByRole('button', { name: /make a deal/i }).click();
await arjun.waitForTimeout(800);
await guard('offer', () => dlg(arjun).locator('button[type="submit"]').click({ timeout: 8000 }));
await arjun.waitForTimeout(2200);
step(/Offer sent to/i.test(await text(dlg(arjun))), 'buyer offer recorded');
await guard('buyer confirm', () => dlg(arjun).getByRole('button', { name: /confirm deal/i }).click({ timeout: 8000 }));
await arjun.waitForTimeout(2500);
step(/Waiting for/i.test(await text(dlg(arjun))), 'one confirmation alone does not sell it');
await reload(meera); await tab(meera, 'Marketplace'); await meera.waitForTimeout(500);
step(/Confirm sale/.test(await text(card(meera, BOOK))), 'seller card switches to "Confirm sale"');
await card(meera, BOOK).getByRole('button', { name: /confirm sale/i }).click();
await meera.waitForTimeout(900);
step(/Arjun Nair offered ₹450/.test(await text(dlg(meera))), 'seller sees who offered and the price');
await guard('seller confirm', () => dlg(meera).getByRole('button', { name: /confirm sale/i }).click({ timeout: 8000 }));
await meera.waitForTimeout(2800);
step(/Transaction Complete/i.test(await text(dlg(meera))), 'both confirmations mark it sold');
await reload(arjun); await tab(arjun, 'Marketplace'); await arjun.waitForTimeout(500);
const bought = card(arjun, BOOK);
step(/Sold/.test(await text(bought)), 'the card reads "Sold" for everyone');
await guard('reopen as buyer', () => bought.getByRole('button', { name: /sold/i }).click({ timeout: 4000, force: true }));

console.log('\n── 5. Flag + moderation (FR-19, FR-21)');
await tab(arjun, 'All'); await arjun.waitForTimeout(400);
await card(arjun, 'Campus ID Card').getByRole('button', { name: /flag/i }).click();
await arjun.waitForTimeout(700);
await guard('submit flag', () => dlg(arjun).locator('button[type="submit"]').click({ timeout: 8000 }));
await arjun.waitForTimeout(2000);
step(!/insufficient permissions/i.test(await text(arjun.locator('body'))), 'a student can flag content');
await reload(meera);
await meera.getByRole('button', { name: 'Account menu' }).first().click().catch(() => {});
await meera.waitForTimeout(600);
const hasQueue = await meera.getByRole('button', { name: /moderation queue/i }).count();
step(hasQueue > 0, 'the moderator account has a Moderation queue entry');
if (hasQueue) {
  await meera.getByRole('button', { name: /moderation queue/i }).first().click();
  await meera.waitForTimeout(2000);
  step(/Campus ID Card|Spam|flag/i.test(await text(dlg(meera))), 'the moderator sees the new flag in the queue');
}

console.log('\n── 6. Page health');
step(errs.length === 0, 'no uncaught page errors across all three sessions', errs.slice(0,3).join(' | '));

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
