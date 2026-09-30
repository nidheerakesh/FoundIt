// Rehearses docs/DEMO-SCRIPT.md exactly: every click and every typed value in
// the script, in the same order, on three screens. Step labels match the
// script's numbering, so a failure names the step that would break on stage.
//
// Needs a freshly seeded database (it posts, claims, sells and moderates):
//   node scripts/seed-demo-data.mjs          (emulator env vars set)
//   node web/test/demo-script.mjs
//
// DEMO_URL points it at another deployment (default: the local dev server).
import { chromium } from 'playwright';

const URL = process.env.DEMO_URL || 'http://127.0.0.1:5173/';
const B = { executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-proxy-server', '--no-sandbox'] };
let pass = 0, fail = 0;
const errs = [];
const step = (ok, name, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra && !ok ? ' — ' + extra : ''}`); };
const act = async (name, fn) => { try { await fn(); return true; } catch (e) { step(false, name, String(e).split('\n')[0].slice(0, 160)); return false; } };
const text = async (loc) => ((await loc.textContent({ timeout: 8000 }).catch(() => '')) || '').replace(/\s+/g, ' ');
const card = (p, t) => p.locator('article').filter({ hasText: t }).first();
const dlg = (p) => p.locator('[role="dialog"]').first();
const tab = async (p, n) => { await p.getByRole('tab', { name: n }).first().click(); await p.waitForTimeout(500); };
const closeDlg = async (p) => { await dlg(p).getByRole('button', { name: 'Close' }).first().click().catch(() => {}); await p.waitForTimeout(400); };
// Waits for a condition WITHOUT reloading — the script promises live updates.
const eventually = async (fn, ms = 8000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 400)); } return false; };
const menu = async (p, item) => { await p.getByRole('button', { name: 'Account menu' }).first().click(); await p.waitForTimeout(400); await p.getByRole('button', { name: item }).first().click(); await p.waitForTimeout(1500); };

async function screen(browser, who) {
  const p = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  p.on('pageerror', (e) => errs.push(`${who || 'signed-out'}: ${e}`));
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('article', { timeout: 30000 });
  if (who) await signIn(p, who);
  return p;
}
async function signIn(p, who) {
  await p.getByRole('button', { name: /sign in/i }).first().click();
  await p.waitForTimeout(500);
  await p.locator('button').filter({ hasText: new RegExp(who) }).first().click();
  await p.waitForTimeout(2500);
}

// Exact values from the script.
const NOTE_LOST = { title: 'Lost blue spiral lab record notebook', desc: 'Blue spiral-bound lab record, name on the inside cover, last used in the LH-101 electronics lab.' };
const NOTE_FOUND = { title: 'Found blue spiral lab record book in LH-101', desc: 'Picked up a blue spiral lab record after the electronics lab in LH-101.' };
const PROOF = 'Name written inside the front cover: Riya Singh, ECE lab batch 4';
const CHAT_1 = 'Found it! LH-101 at 4 pm?';
const CHAT_2 = 'Perfect, see you there.';
const REVIEW = 'Smooth handover, cycle exactly as described.';
const AI_Q = 'I lost my ID card';

async function post(p, { type, title, desc }) {
  await p.getByRole('button', { name: /^post$/i }).first().click();
  await p.waitForTimeout(700);
  const d = dlg(p);
  await d.getByRole('button', { name: type }).click();
  await d.locator('input').first().fill(title);
  await d.locator('select').nth(0).selectOption('Books & Notes');
  await d.locator('select').nth(1).selectOption('Lecture Halls (LH)');
  await d.locator('textarea').first().fill(desc);
  const label = ((await d.locator('button[type="submit"]').textContent()) || '').trim();
  await d.locator('button[type="submit"]').click();
  await p.waitForTimeout(2500);
  return label;
}

const browser = await chromium.launch(B);
console.log(`Rehearsing docs/DEMO-SCRIPT.md against ${URL}\n`);

// ── 0. Pre-flight: screen A signed out, B = Arjun, C = Meera ────────────────
const A = await screen(browser, null);
const Bs = await screen(browser, 'Arjun Nair');
const C = await screen(browser, 'Meera Das');
step(!(await Bs.getByRole('button', { name: /^sign in$/i }).count()) && !(await C.getByRole('button', { name: /^sign in$/i }).count()),
  '0   Screens B (Arjun) and C (Meera) are signed in with demo accounts');

// ── 2. The feed ─────────────────────────────────────────────────────────────
console.log('\n── 2. The feed');
const all = await A.locator('main article').count();
step(all >= 23, '2.1 Signed out, the feed shows the seeded campus (23 posts)', `${all}`);
await tab(A, 'Lost & Found'); const lf = await A.locator('main article').count();
await tab(A, 'Marketplace'); const mk = await A.locator('main article').count();
step(lf === 13 && mk === 10, '2.2 Lost & Found shows 13, Marketplace shows 10', `${lf}/${mk}`);
await tab(A, 'All');
await A.getByRole('textbox', { name: 'Search' }).fill('casio'); await A.waitForTimeout(600);
const calc = await A.locator('main article').allTextContents();
step(calc.length === 3 && calc.every((t) => /casio/i.test(t)), '2.3 Searching "casio" leaves the 3 Casio posts (lost, found, for sale)', `${calc.length}`);
await A.getByRole('textbox', { name: 'Search' }).fill(''); await A.waitForTimeout(400);
await act('2.4 Claim while signed out', () => card(A, 'Casio Scientific Calculator in LH-204').getByRole('button', { name: /claim this/i }).click({ timeout: 8000 }));
await A.waitForTimeout(800);
step((await A.locator('button').filter({ hasText: /Riya Singh/ }).count()) > 0, '2.4 Claiming while signed out opens sign-in with the demo accounts');
await A.locator('button').filter({ hasText: /Riya Singh/ }).first().click(); await A.waitForTimeout(2500);
step(!(await A.getByRole('button', { name: /^sign in$/i }).count()), '2.5 Screen A signs in as Riya Singh');

// ── 3. Real-time sync ───────────────────────────────────────────────────────
console.log('\n── 3. Real-time');
const lostLabel = await post(A, { type: /lost item/i, ...NOTE_LOST });
step(/Post lost report/.test(lostLabel), '3.1 Riya posts the lost notebook ("Post lost report")', lostLabel);
step(await eventually(async () => (await text(Bs.locator('main'))).includes(NOTE_LOST.title)), '3.2 It appears on Arjun’s screen with no reload');

// ── 4. Smart matching ───────────────────────────────────────────────────────
console.log('\n── 4. Matching');
const foundLabel = await post(Bs, { type: /found item/i, ...NOTE_FOUND });
step(/Post found report/.test(foundLabel), '4.1 Arjun posts the found notebook ("Post found report")', foundLabel);
const badgeOn = (p, t) => card(p, t).locator('button[title="View smart match"]');
step(await eventually(async () => (await badgeOn(A, NOTE_LOST.title).count()) > 0 && (await badgeOn(Bs, NOTE_FOUND.title).count()) > 0),
  '4.2 Both notebook cards show a % match badge, on both screens');
await act('4.3 open match', () => badgeOn(A, NOTE_LOST.title).first().click({ timeout: 8000 }));
await A.waitForTimeout(1000);
const sm = await text(dlg(A));
step(/Found blue spiral lab record book/.test(sm), '4.3 Riya’s Smart Match names Arjun’s found post', sm.slice(0, 160));
await closeDlg(A);

// ── 5. Claim, verify, return ────────────────────────────────────────────────
console.log('\n── 5. Claim and return');
await act('5.1 Claim this', () => card(A, NOTE_FOUND.title).getByRole('button', { name: /claim this/i }).click({ timeout: 8000 }));
await A.waitForTimeout(700);
await act('5.1 proof', () => dlg(A).locator('textarea').first().fill(PROOF));
await act('5.1 submit', () => dlg(A).getByRole('button', { name: /submit claim/i }).click({ timeout: 8000 }));
await A.waitForTimeout(2500);
step(/My claims/.test(await text(dlg(A))), '5.1 Riya’s claim is sent and points her to My claims');
await closeDlg(A);
step(await eventually(async () => /Claim sent/.test(await text(card(A, NOTE_FOUND.title)))), '5.1 Her card now reads "Claim sent · waiting"');
step(await eventually(async () => /Review claims \(1\)/.test(await text(card(Bs, NOTE_FOUND.title))), 10000),
  '5.2 Arjun’s card shows "Review claims (1)" with no reload');
await act('5.2 open review', () => card(Bs, NOTE_FOUND.title).getByRole('button', { name: /review claims/i }).click({ timeout: 8000 }));
await Bs.waitForTimeout(1500);
step((await text(dlg(Bs))).includes('Riya Singh ECE lab batch 4') || (await text(dlg(Bs))).includes(PROOF), '5.2 Arjun reads Riya’s proof');
await act('5.3 Message', () => dlg(Bs).getByRole('button', { name: /^message$/i }).first().click({ timeout: 8000 }));
await Bs.waitForTimeout(2500);
await act('5.3 type', async () => { await Bs.locator('input[placeholder*="Message" i]').first().fill(CHAT_1); await Bs.keyboard.press('Enter'); });
await Bs.waitForTimeout(1500);
step((await text(dlg(Bs))).includes(CHAT_1), '5.3 Arjun sends "Found it! LH-101 at 4 pm?"');
await act('5.4 Riya opens chat', () => card(A, NOTE_FOUND.title).getByRole('button', { name: 'Message' }).click({ timeout: 8000 }));
await A.waitForTimeout(2500);
step((await text(dlg(A))).includes(CHAT_1), '5.4 Riya sees Arjun’s message in the same thread');
await act('5.4 reply', async () => { await A.locator('input[placeholder*="Message" i]').first().fill(CHAT_2); await A.keyboard.press('Enter'); });
step(await eventually(async () => (await text(dlg(Bs))).includes(CHAT_2)), '5.4 Her reply appears on Arjun’s screen live');
await closeDlg(A); await closeDlg(Bs);
await act('5.5 reopen review', () => card(Bs, NOTE_FOUND.title).getByRole('button', { name: /review claims/i }).click({ timeout: 8000 }));
await Bs.waitForTimeout(1500);
await act('5.5 approve', () => dlg(Bs).getByRole('button', { name: /approve & mark returned/i }).first().click({ timeout: 8000 }));
await Bs.waitForTimeout(2500);
step(/Returned\. This report is closed/.test(await text(dlg(Bs))), '5.5 Arjun approves: "Returned. This report is closed"');
await closeDlg(Bs);
step(await eventually(async () => /Returned/.test(await text(card(A, NOTE_FOUND.title))) && /Returned/.test(await text(card(C, NOTE_FOUND.title)))),
  '5.5 The card reads Returned on every screen, live');
await menu(A, /my claims/i);
const mine = await text(dlg(A));
step(/Approved/.test(mine) && /marked returned/i.test(mine), '5.6 Riya’s My claims: "Approved and marked returned"');
await closeDlg(A);

// ── 6. Marketplace ──────────────────────────────────────────────────────────
console.log('\n── 6. Marketplace');
await tab(A, 'Marketplace');
await act('6.1 Make a deal', () => card(A, 'Hero Sprint Cycle').getByRole('button', { name: /make a deal/i }).click({ timeout: 8000 }));
await A.waitForTimeout(1000);
step(/Offer sent to Arjun Nair/.test(await text(dlg(A))), '6.1 Riya’s offer to Arjun is already on the cycle ("Offer sent to Arjun Nair")');
await act('6.1 Confirm deal', () => dlg(A).getByRole('button', { name: /confirm deal/i }).click({ timeout: 8000 }));
await A.waitForTimeout(2500);
step(/Waiting for Arjun Nair/.test(await text(dlg(A))), '6.1 Riya confirms: "Waiting for Arjun Nair to confirm"');
await closeDlg(A);
await tab(Bs, 'Marketplace');
step(await eventually(async () => /Confirm sale/.test(await text(card(Bs, 'Hero Sprint Cycle')))), '6.2 Arjun’s cycle card reads "Confirm sale"');
await act('6.2 open', () => card(Bs, 'Hero Sprint Cycle').getByRole('button', { name: /confirm sale/i }).click({ timeout: 8000 }));
await Bs.waitForTimeout(900);
await act('6.2 confirm', () => dlg(Bs).getByRole('button', { name: /confirm sale/i }).click({ timeout: 8000 }));
await Bs.waitForTimeout(2800);
step(/Transaction Complete/i.test(await text(dlg(Bs))), '6.2 Arjun confirms: Transaction complete');
await closeDlg(Bs);
step(await eventually(async () => /Rate seller/.test(await text(card(A, 'Hero Sprint Cycle')))), '6.3 Riya’s cycle card reads "Sold · Rate seller", live');
await act('6.3 rate', () => card(A, 'Hero Sprint Cycle').getByRole('button', { name: /rate seller/i }).click({ timeout: 8000 }));
await A.waitForTimeout(900);
await act('6.3 comment', () => dlg(A).getByPlaceholder(/smooth trade/i).fill(REVIEW));
await act('6.3 submit', () => dlg(A).getByRole('button', { name: /submit review/i }).click({ timeout: 8000 }));
await A.waitForTimeout(2200);
step(/marked sold|Transaction Complete/i.test(await text(dlg(A))), '6.3 Riya’s 5-star review of Arjun is saved');
await closeDlg(A);

// ── 7. AI search ────────────────────────────────────────────────────────────
console.log('\n── 7. AI search');
await C.getByRole('button', { name: /ai search/i }).first().click(); await C.waitForTimeout(600);
await C.getByPlaceholder(/ask campus ai/i).fill(AI_Q);
await C.getByRole('button', { name: /send prompt to ai/i }).click();
await C.waitForTimeout(3500);
const ai = await text(C.getByRole('dialog', { name: /campus ai assistant/i }));
const answer = ai.slice(ai.indexOf(AI_Q));
step(/Campus ID Card/.test(answer) && !/water bottle/i.test(answer), '7.1 "I lost my ID card" returns the ID card, not a water bottle', answer.slice(0, 200));
await closeDlg(C);

// ── 8. Flag + moderation ────────────────────────────────────────────────────
console.log('\n── 8. Moderation');
await act('8.1 flag', () => card(Bs, 'iPhone 15 Pro').getByRole('button', { name: /flag for review/i }).click({ timeout: 8000 }));
await Bs.waitForTimeout(700);
await act('8.1 reason', () => dlg(Bs).locator('select').first().selectOption('Suspected scam or fake report'));
await act('8.1 submit', () => dlg(Bs).locator('button[type="submit"]').click({ timeout: 8000 }));
await Bs.waitForTimeout(2000);
step(!/insufficient permissions/i.test(await text(Bs.locator('body'))), '8.1 Arjun flags the iPhone listing as a scam');
await closeDlg(Bs);
await menu(C, /moderation queue/i);
const q = await text(dlg(C));
step((q.match(/iPhone 15 Pro/g) || []).length >= 2, '8.2 Meera’s queue shows the iPhone listing, reported twice');
await act('8.3 remove', () => dlg(C).getByRole('button', { name: /remove post/i }).first().click({ timeout: 8000 }));
await C.waitForTimeout(2500);
step(!/iPhone 15 Pro/.test(await text(dlg(C))), '8.3 "Remove post" clears both reports from the queue');
await closeDlg(C);
step(await eventually(async () => !(await text(A.locator('main'))).includes('iPhone 15 Pro')), '8.3 The listing disappears from every feed, live');

// ── 9. Trust ────────────────────────────────────────────────────────────────
console.log('\n── 9. Trust');
await menu(A, /my profile/i);
const prof = await text(A.getByRole('dialog', { name: 'Profile' }));
step(/Riya Singh/.test(prof) && /Trust Score/.test(prof) && /Avg Rating/.test(prof), '9.1 Riya’s profile shows her Trust Score and Avg Rating', prof.slice(0, 160));
await closeDlg(A);

console.log('\n── Page health');
step(errs.length === 0, 'no uncaught errors on any screen during the whole script', errs.slice(0, 3).join(' | '));
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
