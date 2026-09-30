// Plays every story scripts/seed-demo-data.mjs sets up, as the three demo
// accounts, against the emulator. Run on a freshly seeded database:
//
//   node scripts/seed-demo-data.mjs     (emulator env vars set)
//   node web/test/demo-data.mjs
import { chromium } from 'playwright';
const B = { executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-proxy-server', '--no-sandbox'] };
const URL = 'http://127.0.0.1:5173/';
let pass = 0, fail = 0;
const errs = [];
const step = (ok, name, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`); };
const guard = async (name, fn) => { try { return await fn(); } catch (e) { step(false, name, String(e).split('\n')[0].slice(0, 140)); return null; } };
const text = async (loc) => ((await loc.textContent({ timeout: 8000 }).catch(() => '')) || '').replace(/\s+/g, ' ');
const card = (p, t) => p.locator('article').filter({ hasText: t }).first();
const dlg = (p) => p.locator('[role="dialog"]').first();
const tab = async (p, n) => { await p.getByRole('tab', { name: n }).first().click(); await p.waitForTimeout(500); };
const reload = async (p) => { await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForSelector('article', { timeout: 30000 }); await p.waitForTimeout(1500); };
async function open(browser, who) {
  const p = await (await browser.newContext()).newPage();
  p.on('pageerror', (e) => errs.push(`${who}: ${e}`));
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('article', { timeout: 30000 });
  await p.getByRole('button', { name: /sign in/i }).first().click();
  await p.waitForTimeout(500);
  await p.locator('button').filter({ hasText: new RegExp(who) }).first().click();
  await p.waitForTimeout(2500);
  return p;
}

const browser = await chromium.launch(B);
const riya = await open(browser, 'Riya Singh');
const arjun = await open(browser, 'Arjun Nair');
const meera = await open(browser, 'Meera Das');

console.log('\n── The seeded feed');
await tab(riya, 'Lost & Found');
const lf = await riya.locator('main article').count();
await tab(riya, 'Marketplace');
const mk = await riya.locator('main article').count();
step(lf >= 13 && mk >= 10, 'Lost & Found and Marketplace are populated', `${lf} reports, ${mk} listings`);
step(!/Blue Stainless Water Bottle/.test(await text(riya.locator('main'))), 'no report leaks into Marketplace');
await tab(riya, 'All');
const badges = await riya.locator('button[title="View smart match"]').count();
step(badges >= 6, 'the three seeded pairs show match badges', `${badges} badges`);
step(/Returned/.test(await text(card(riya, 'Black Leather Wallet'))) && /Returned/.test(await text(card(riya, 'AirPods Pro Case'))), 'the two success stories read Returned');

console.log('\n── Riya: review the pending claim, chat, approve');
await reload(arjun);
await guard('open chat', () => card(arjun, 'Blue Stainless Water Bottle').getByRole('button', { name: /message|chat/i }).first().click({ timeout: 8000 }));
await arjun.waitForTimeout(2500);
step(/library front desk at 4/i.test(await text(dlg(arjun))), 'Arjun opens the seeded chat thread with its history');
await reload(arjun);

step(/Review claims \(1\)/.test(await text(card(riya, 'Blue Stainless Water Bottle'))), 'Riya sees "Review claims (1)" on her bottle');
await guard('open review', () => card(riya, 'Blue Stainless Water Bottle').getByRole('button', { name: /review claims/i }).click({ timeout: 8000 }));
await riya.waitForTimeout(1500);
step(/Arjun Nair/.test(await text(dlg(riya))) && /small dent/.test(await text(dlg(riya))), 'she reads Arjun’s proof');
await guard('approve', () => dlg(riya).getByRole('button', { name: /approve & mark returned/i }).first().click({ timeout: 8000 }));
await riya.waitForTimeout(2500);
await reload(riya);
step(/Returned/.test(await text(card(riya, 'Blue Stainless Water Bottle'))), 'approving marks the bottle Returned');
const bell = riya.getByRole('button', { name: /^Notifications/ }).first();
step(/unread/.test((await bell.getAttribute('aria-label').catch(() => '')) || ''), 'Riya’s bell shows unread notifications');

console.log('\n── Meera: claim her calculator from Riya’s found post');
await reload(meera);
await guard('claim calc', () => card(meera, 'Casio Scientific Calculator in LH-204').getByRole('button', { name: /claim this/i }).click({ timeout: 8000 }));
await meera.waitForTimeout(700);
await guard('fill proof', () => dlg(meera).locator('textarea').first().fill('MEERA scratched on the back, black fx-991EX.'));
await guard('submit claim', () => dlg(meera).getByRole('button', { name: /submit claim/i }).click({ timeout: 8000 }));
await meera.waitForTimeout(2500);
step(/Verification Claim Sent/i.test(await text(dlg(meera))), 'Meera’s claim is sent');
await reload(riya);
step(/Review claims \(1\)/.test(await text(card(riya, 'Casio Scientific Calculator in LH-204'))), 'Riya sees it on her found post');

console.log('\n── Marketplace: the open offer and the sold kit');
await tab(riya, 'Marketplace');
await guard('open cycle', () => card(riya, 'Hero Sprint Cycle').getByRole('button').filter({ hasText: /deal|confirm/i }).first().click({ timeout: 8000 }));
await riya.waitForTimeout(1000);
const cyc = await text(dlg(riya));
const confirmBtn = dlg(riya).getByRole('button', { name: /confirm deal/i });
if (!(await confirmBtn.count())) { await guard('re-offer', () => dlg(riya).locator('button[type="submit"]').click({ timeout: 8000 })); await riya.waitForTimeout(2000); }
await guard('buyer confirms', () => dlg(riya).getByRole('button', { name: /confirm deal/i }).click({ timeout: 8000 }));
await riya.waitForTimeout(2500);
step(/Waiting for/i.test(await text(dlg(riya))), 'Riya confirms her offer on the cycle', cyc.slice(0, 80));
await reload(arjun); await tab(arjun, 'Marketplace');
await guard('seller opens', () => card(arjun, 'Hero Sprint Cycle').getByRole('button', { name: /confirm sale/i }).click({ timeout: 8000 }));
await arjun.waitForTimeout(900);
step(/Riya Singh offered ₹3000/.test(await text(dlg(arjun))), 'Arjun sees Riya’s ₹3000 offer');
await guard('seller confirms', () => dlg(arjun).getByRole('button', { name: /confirm sale/i }).click({ timeout: 8000 }));
await arjun.waitForTimeout(2800);
step(/Transaction Complete/i.test(await text(dlg(arjun))), 'both confirmations sell the cycle');
await reload(riya); await tab(riya, 'Marketplace');
const kit = card(riya, 'Arduino Uno Starter Kit');
step(/Rate seller/.test(await text(kit)), 'Riya can rate Meera for the Arduino kit she bought');
await guard('rate', () => kit.getByRole('button', { name: /rate seller/i }).click({ timeout: 8000 }));
await riya.waitForTimeout(900);
await guard('submit review', () => dlg(riya).getByRole('button', { name: /submit review/i }).click({ timeout: 8000 }));
await riya.waitForTimeout(2200);
step(/marked sold|Transaction Complete/i.test(await text(dlg(riya))), 'the review is accepted');

console.log('\n── Meera: moderation queue');
await reload(meera);
await meera.getByRole('button', { name: 'Account menu' }).first().click(); await meera.waitForTimeout(500);
await guard('open queue', () => meera.getByRole('button', { name: /moderation queue/i }).first().click({ timeout: 8000 }));
await meera.waitForTimeout(2000);
step(/iPhone 15 Pro/.test(await text(dlg(meera))), 'the flagged iPhone listing waits in the queue');

console.log('\n── Page health');
step(errs.length === 0, 'no uncaught page errors', errs.slice(0, 3).join(' | '));
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
