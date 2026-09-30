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
step(/No claims yet/.test(await text(card(riya, 'Grey Dell laptop charger'))), 'its poster sees "No claims yet" on it, not a claim button');
step(/How getting something back works/.test(await text(riya.locator('body'))), 'the in-app guide explains the workflow');

console.log('\n── 2b. Every post type lands in the right feed (the reported bug)');
const feedHas = async (p, tabName, t) => { await tab(p, tabName); await p.waitForTimeout(500); return (await text(p.locator('main'))).includes(t); };
const postVia = async (p, { fromTab, pick, title, desc, price }) => {
  await tab(p, fromTab); await p.waitForTimeout(400);
  await p.getByRole('button', { name: /^post$/i }).first().click();
  await p.waitForTimeout(700);
  const d = dlg(p);
  const before = ((await d.locator('[aria-pressed="true"]').textContent().catch(() => '')) || '').trim();
  if (pick) await d.getByRole('button', { name: pick }).click();
  await d.locator('input').first().fill(title);
  if (price) await d.locator('input[type="number"]').fill(price);
  await d.locator('textarea').first().fill(desc);
  const label = ((await d.locator('button[type="submit"]').textContent()) || '').trim();
  await d.locator('button[type="submit"]').click();
  await p.waitForTimeout(2500);
  return { before, label };
};
// 1. From the Marketplace tab, without touching the type chips.
const m1 = await postVia(riya, { fromTab: 'Marketplace', title: 'Casio FX-991ES calculator', desc: 'Works perfectly, selling after exams.', price: '400' });
step(m1.before === 'Sell / Give', 'Post from the Marketplace tab opens on "Sell / Give"', m1.before);
step(/List on Marketplace/.test(m1.label), 'the submit button says where it goes', m1.label);
await reload(riya);
step(await feedHas(riya, 'Marketplace', 'Casio FX-991ES calculator'), 'the listing shows in Marketplace');
step(!(await feedHas(riya, 'Lost & Found', 'Casio FX-991ES calculator')), 'and NOT in Lost & Found');
await tab(riya, 'Marketplace'); await riya.waitForTimeout(400);
const listed = await text(card(riya, 'Casio FX-991ES calculator'));
step(/₹400/.test(listed) && /No offers yet/.test(listed), 'the card shows price and the seller view', listed.slice(0, 120));
// 2. From the All tab, choosing Sell / Give explicitly.
const m2 = await postVia(riya, { fromTab: 'All', pick: /sell \/ give/i, title: 'Study lamp giveaway desk', desc: 'LED desk lamp, free to a good home.', price: '0' });
step(m2.before === 'Lost item' && /List on Marketplace/.test(m2.label), 'All tab: picking Sell / Give switches the button to "List on Marketplace"', `${m2.before} / ${m2.label}`);
await reload(riya);
step(await feedHas(riya, 'Marketplace', 'Study lamp giveaway desk') && !(await feedHas(riya, 'Lost & Found', 'Study lamp giveaway desk')), 'that listing is in Marketplace only');
// 3. A found report from the Lost & Found tab.
const f1 = await postVia(arjun, { fromTab: 'Lost & Found', pick: /found item/i, title: 'Black umbrella near canteen', desc: 'Compact black umbrella with wooden handle, left at the canteen.' });
step(/Post found report/.test(f1.label), 'Found item → "Post found report"', f1.label);
await reload(arjun);
step(await feedHas(arjun, 'Lost & Found', 'Black umbrella near canteen') && !(await feedHas(arjun, 'Marketplace', 'Black umbrella near canteen')), 'the found report is in Lost & Found only');
// 4. Someone else can deal on a freshly posted listing, not just seeded ones.
await reload(arjun); await tab(arjun, 'Marketplace'); await arjun.waitForTimeout(500);
await guard('deal on new listing', () => card(arjun, 'Casio FX-991ES calculator').getByRole('button', { name: /make a deal/i }).click({ timeout: 8000 }));
await arjun.waitForTimeout(800);
await guard('offer on new listing', () => dlg(arjun).locator('button[type="submit"]').click({ timeout: 8000 }));
await arjun.waitForTimeout(2200);
step(/Offer sent to Riya/i.test(await text(dlg(arjun))), 'another student can make an offer on it');
await reload(arjun); await reload(riya);

console.log('\n── 3. Direction A: finder answers a LOST post (FR-10, FR-11, FR-17)');
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
step(/Review claims \(1\)/.test(await text(card(riya, 'Blue Stainless Water Bottle'))),
  'the owner sees "Review claims (1)" on their card — no notification needed');
await guard('open Review claims', () => card(riya, 'Blue Stainless Water Bottle').getByRole('button', { name: /review claims/i }).click({ timeout: 8000 }));
await riya.waitForTimeout(2000);
const review = await text(dlg(riya));
step(/Arjun Nair/.test(review) && /GitHub and React stickers/.test(review), 'owner reads the claimant and their proof');
step(/Who says they found it/.test(review), 'wording fits a lost post ("Who says they found it")');
await guard('approve', () => dlg(riya).getByRole('button', { name: /approve & mark returned/i }).first().click({ timeout: 8000 }));
await riya.waitForTimeout(2500);
const approved = await text(dlg(riya));
step(/Approved/i.test(approved), 'claim is approved');
step(/Returned\. This report is closed/i.test(approved), 'the review screen flips to Returned at once');
await reload(riya);
step(/Returned/.test(await text(card(riya, 'Blue Stainless Water Bottle'))), 'the card reads Returned for the owner');
await reload(arjun);
step(/Returned to owner/.test(await text(card(arjun, 'Blue Stainless Water Bottle'))), 'and for everyone else — no more claims');
await arjun.getByRole('button', { name: 'Account menu' }).first().click();
await arjun.waitForTimeout(500);
await guard('open My claims', () => arjun.getByRole('button', { name: /my claims/i }).first().click({ timeout: 8000 }));
await arjun.waitForTimeout(2000);
const mine = await text(dlg(arjun));
step(/Blue Stainless Water Bottle/.test(mine) && /Approved/.test(mine), 'the finder sees the outcome under My claims');
step(/marked returned/i.test(mine), 'My claims shows it is returned');
await reload(arjun);

console.log('\n── 3b. Direction B: owner claims a FOUND post');
await reload(meera);
await card(meera, 'Campus ID Card').getByRole('button', { name: /claim this/i }).click();
await meera.waitForTimeout(700);
await dlg(meera).locator('textarea').first().fill('Name on it is Meera Das, CSE 2024 batch, blue lanyard.');
await dlg(meera).getByRole('button', { name: /submit claim/i }).click();
await meera.waitForTimeout(2500);
step(/My claims/.test(await text(dlg(meera))), 'confirmation tells the claimant where to track it');
await reload(meera);
await meera.getByRole('button', { name: 'Account menu' }).first().click();
await meera.waitForTimeout(500);
await guard('open My claims (Meera)', () => meera.getByRole('button', { name: /my claims/i }).first().click({ timeout: 8000 }));
await meera.waitForTimeout(2000);
step(/Campus ID Card/.test(await text(dlg(meera))) && /Waiting for them/.test(await text(dlg(meera))), 'a new claim shows as "Waiting for them"');
await reload(meera);
await reload(arjun);
step(/Review claims \(1\)/.test(await text(card(arjun, 'Campus ID Card'))), 'the finder sees the claim count on their found post');
await guard('open Review (Arjun)', () => card(arjun, 'Campus ID Card').getByRole('button', { name: /review claims/i }).click({ timeout: 8000 }));
await arjun.waitForTimeout(2000);
const idReview = await text(dlg(arjun));
step(/Who says this is theirs/.test(idReview) && /blue lanyard/.test(idReview), 'the finder reads the owner’s proof');
await guard('approve ID', () => dlg(arjun).getByRole('button', { name: /approve & mark returned/i }).first().click({ timeout: 8000 }));
await arjun.waitForTimeout(2500);
await reload(arjun);
step(/Returned/.test(await text(card(arjun, 'Campus ID Card'))), 'the found post is marked Returned');

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
step(/Rate seller/.test(await text(bought)), 'the buyer is offered "Rate seller" even though the seller confirmed last');
await guard('open review', () => bought.getByRole('button', { name: /rate seller/i }).click({ timeout: 8000 }));
await arjun.waitForTimeout(900);
await guard('submit review', () => dlg(arjun).getByRole('button', { name: /submit review/i }).click({ timeout: 8000 }));
await arjun.waitForTimeout(2200);
step(/marked sold|Transaction Complete/i.test(await text(dlg(arjun))), 'the buyer leaves a review of the seller (FR-18)');
await reload(arjun); await tab(arjun, 'Marketplace'); await arjun.waitForTimeout(500);
await guard('reopen review', () => card(arjun, BOOK).getByRole('button', { name: /rate seller/i }).click({ timeout: 8000 }));
await arjun.waitForTimeout(900);
await guard('second review', () => dlg(arjun).getByRole('button', { name: /submit review/i }).click({ timeout: 8000 }));
await arjun.waitForTimeout(2000);
step(/already reviewed/i.test(await text(dlg(arjun))), 'a second review of the same deal is refused');
await reload(arjun);

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

console.log('\n── 5b. Search, AI search, Smart Match, profile, notifications, sign-out');
await reload(riya); await tab(riya, 'All'); await riya.waitForTimeout(400);
await riya.getByRole('textbox', { name: 'Search' }).fill('calculator');
await riya.waitForTimeout(600);
const searched = await riya.locator('main article').allTextContents();
step(searched.length > 0 && searched.every((t) => /calculator/i.test(t)), 'search narrows the feed', `${searched.length} cards`);
await riya.getByRole('textbox', { name: 'Search' }).fill('');
await riya.waitForTimeout(400);
await riya.getByRole('button', { name: /ai search/i }).first().click();
await riya.waitForTimeout(600);
await riya.getByPlaceholder(/ask campus ai/i).fill('Did anyone find an umbrella?');
await riya.getByRole('button', { name: /send prompt to ai/i }).click();
await riya.waitForTimeout(3500);
const ai = await text(riya.getByRole('dialog', { name: /campus ai assistant/i }));
step(/Black umbrella near canteen/.test(ai) && !/ran into an error/i.test(ai), 'AI search answers and links the umbrella report', ai.slice(-160));
await reload(riya);
const badge = riya.locator('button[title="View smart match"]').first();
step((await badge.count()) > 0, 'a Smart Match badge is shown on paired reports');
if (await badge.count()) {
  await badge.click(); await riya.waitForTimeout(1000);
  step(/match/i.test(await text(dlg(riya))), 'the Smart Match breakdown opens');
  await reload(riya);
}
await riya.getByRole('button', { name: 'Account menu' }).first().click(); await riya.waitForTimeout(400);
await riya.getByRole('button', { name: /my profile/i }).first().click(); await riya.waitForTimeout(1200);
const prof = riya.getByRole('dialog', { name: 'Profile' });
step(/Riya Singh/.test(await text(prof)), 'profile opens with the user’s name');
await guard('edit profile', async () => {
  await prof.getByRole('button', { name: /edit/i }).first().click({ timeout: 5000 });
  await prof.getByPlaceholder('Dept / Hostel').fill('ECE · Hostel B');
  await prof.getByRole('button', { name: /save/i }).first().click({ timeout: 5000 });
});
await riya.waitForTimeout(1800);
await reload(riya);
await riya.getByRole('button', { name: 'Account menu' }).first().click(); await riya.waitForTimeout(400);
await riya.getByRole('button', { name: /my profile/i }).first().click(); await riya.waitForTimeout(1200);
step(/ECE · Hostel B/.test(await text(riya.getByRole('dialog', { name: 'Profile' }))), 'profile edits save and survive a reload');
await reload(riya);
const bell = riya.getByRole('button', { name: /^Notifications/ }).first();
step((await bell.count()) > 0, 'the notification bell is present');
if (await bell.count()) {
  await bell.click(); await riya.waitForTimeout(1200);
  step(!/insufficient permissions|failed-precondition/i.test(await text(riya.locator('body'))), 'opening notifications raises no permission or index error');
}
await reload(meera);
await meera.getByRole('button', { name: 'Account menu' }).first().click(); await meera.waitForTimeout(400);
await meera.getByRole('button', { name: /sign out/i }).first().click(); await meera.waitForTimeout(1500);
step((await meera.getByRole('button', { name: /^sign in$/i }).count()) > 0, 'sign out returns to the signed-out view');
await meera.getByRole('button', { name: /sign in/i }).first().click(); await meera.waitForTimeout(500);
await meera.locator('button').filter({ hasText: /Meera Das/ }).first().click(); await meera.waitForTimeout(2500);
step(!(await meera.getByRole('button', { name: /^sign in$/i }).count()), 'and a demo account can sign straight back in');

console.log('\n── 6. Page health');
step(errs.length === 0, 'no uncaught page errors across all three sessions', errs.slice(0,3).join(' | '));

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
