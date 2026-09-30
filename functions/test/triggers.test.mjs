// Integration tests for every Cloud Function, run against a real Firestore
// emulator. The Functions emulator is not used: each handler is invoked
// directly through its `.run()` entry point with the event shape Firebase
// would deliver, so the trigger bodies execute against real Firestore reads
// and writes rather than mocks.
//
//   java -jar ~/.cache/firebase/emulators/cloud-firestore-emulator-*.jar \
//     --host=127.0.0.1 --port=8080 &
//   cd functions && npm install && npm run test:triggers
//
// Event shapes (firebase-functions v2):
//   onDocumentWritten → event.data = { before, after }   (Change)
//   onDocumentCreated → event.data = snapshot
//   onCall            → request    = { data, auth }
import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const PROJECT = 'demo-foundit';
process.env.GCLOUD_PROJECT = PROJECT;
process.env.FIREBASE_CONFIG = JSON.stringify({ projectId: PROJECT });
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

const fns = require('../index.js');
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();

const REST = `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`;

async function wipe() {
  const res = await fetch(REST, { method: 'DELETE' });
  if (!res.ok) throw new Error(`wipe failed: ${res.status}`);
}

// --- event builders --------------------------------------------------------
const snap = (path) => db.doc(path).get();
const missing = () => db.doc('lostFoundItems/absent-placeholder').get();
const written = async (path, params) => ({ data: { before: await missing(), after: await snap(path) }, params });
const changed = async (path, beforeData, params) => {
  const after = await snap(path);
  // A Change's `before` only needs .exists and .data() for these handlers.
  return { data: { before: { exists: true, data: () => beforeData }, after }, params };
};
const created = async (path, params) => ({ data: await snap(path), params });
const caller = (uid, role) => ({ uid, token: role ? { role } : {} });

// --- query helpers ---------------------------------------------------------
async function notificationsFor(uid, type) {
  let q = db.collection('notifications').where('userId', '==', uid);
  if (type) q = q.where('type', '==', type);
  return (await q.get()).docs.map((d) => d.data());
}
const itemData = async (id) => (await db.doc(`lostFoundItems/${id}`).get()).data();
const userData = async (uid) => (await db.doc(`users/${uid}`).get()).data();

async function seedUsers() {
  await db.doc('users/uid-owner').set({ name: 'Riya', verified: true, createdAt: new Date('2026-01-01') });
  await db.doc('users/uid-finder').set({ name: 'Arjun', verified: true, createdAt: new Date('2026-01-01') });
  await db.doc('users/uid-mod').set({ name: 'Mod', role: 'moderator', verified: true });
}

/** A lost/found pair that scores well above MATCH_THRESHOLD. */
async function seedPair({ zoneB = 'Central Library' } = {}) {
  const now = new Date();
  await db.doc('lostFoundItems/lost-1').set({
    type: 'lost', title: 'Blue steel water bottle', description: 'blue bottle with stickers',
    category: 'Accessories', keywords: ['blue', 'bottle', 'stickers'],
    zoneId: 'Central Library', status: 'open', postedBy: 'uid-owner', createdAt: now,
  });
  await db.doc('lostFoundItems/found-1').set({
    type: 'found', title: 'Blue bottle found', description: 'blue bottle with stickers',
    category: 'Accessories', keywords: ['blue', 'bottle', 'stickers'],
    zoneId: zoneB, status: 'open', postedBy: 'uid-finder', createdAt: now,
  });
}

before(async () => { await wipe(); });
beforeEach(async () => { await wipe(); await seedUsers(); });
after(async () => { await wipe(); });

// ===========================================================================
// FR-9 / FR-20 — smart matching and its notifications
// ===========================================================================
test('FR-9: a lone lost report matches nothing and notifies nobody', async () => {
  await seedPair();
  await db.doc('lostFoundItems/found-1').delete();
  await fns.suggestMatches.run(await written('lostFoundItems/lost-1', { itemId: 'lost-1' }));

  const lost = await itemData('lost-1');
  assert.strictEqual(lost.status, 'open');
  assert.strictEqual(lost.matchScore ?? null, null);
  assert.strictEqual((await notificationsFor('uid-owner')).length, 0);
});

test('FR-9: the found report is scored, linked and its poster notified', async () => {
  await seedPair();
  await fns.suggestMatches.run(await written('lostFoundItems/found-1', { itemId: 'found-1' }));

  const found = await itemData('found-1');
  assert.deepStrictEqual(found.matchedWith, ['lost-1']);
  assert.ok(found.matchScore >= 50, `score ${found.matchScore} should clear the threshold`);
  assert.strictEqual(found.status, 'matched');

  const notes = await notificationsFor('uid-finder', 'match');
  assert.strictEqual(notes.length, 1);
  assert.match(notes[0].message, /possible match/i);
});

test('ARCHITECTURE §4.8: the other poster is notified too, and their report is linked back', async () => {
  await seedPair();
  await fns.suggestMatches.run(await written('lostFoundItems/found-1', { itemId: 'found-1' }));

  // This is the bug the fix was for: before mirroring, lost-1 was untouched.
  const lost = await itemData('lost-1');
  assert.deepStrictEqual(lost.matchedWith, ['found-1']);
  assert.strictEqual(lost.status, 'matched');
  assert.strictEqual(lost.matchScore, (await itemData('found-1')).matchScore, 'score is symmetric');

  assert.strictEqual((await notificationsFor('uid-owner', 'match')).length, 1);
  assert.strictEqual((await notificationsFor('uid-finder', 'match')).length, 1);
});

test('FR-9: re-running the trigger does not notify either side twice', async () => {
  await seedPair();
  const ev = await written('lostFoundItems/found-1', { itemId: 'found-1' });
  await fns.suggestMatches.run(ev);
  await fns.suggestMatches.run(await written('lostFoundItems/found-1', { itemId: 'found-1' }));

  assert.strictEqual((await notificationsFor('uid-owner', 'match')).length, 1);
  assert.strictEqual((await notificationsFor('uid-finder', 'match')).length, 1);
});

test('FR-9: a self-write that changes no match input is a no-op', async () => {
  await seedPair();
  await fns.suggestMatches.run(await written('lostFoundItems/found-1', { itemId: 'found-1' }));
  const before = (await itemData('found-1'));

  // Same MATCH_FIELDS on both sides → the loop guard must bail out.
  await fns.suggestMatches.run(await changed('lostFoundItems/found-1', before, { itemId: 'found-1' }));
  assert.strictEqual((await notificationsFor('uid-finder', 'match')).length, 1);
});

test('FR-9: two reports from the same student never match each other', async () => {
  await seedPair();
  await db.doc('lostFoundItems/found-1').set({ postedBy: 'uid-owner' }, { merge: true });
  await fns.suggestMatches.run(await written('lostFoundItems/found-1', { itemId: 'found-1' }));

  const found = await itemData('found-1');
  assert.strictEqual(found.matchScore ?? null, null);
  assert.strictEqual((await notificationsFor('uid-owner')).length, 0);
});

test('SCORING §2.1: an adjacent campus zone scores between exact and unrelated', async () => {
  const score = async (zoneB, zones) => {
    await wipe(); await seedUsers();
    for (const z of zones) await db.doc(`campusZones/${z.id}`).set(z);
    await seedPair({ zoneB });
    await fns.suggestMatches.run(await written('lostFoundItems/found-1', { itemId: 'found-1' }));
    return (await itemData('found-1')).matchScore ?? 0;
  };
  const zones = [
    { id: 'lib', name: 'Central Library', adjacent: ['Innovation & Computer Lab'] },
    { id: 'lab', name: 'Innovation & Computer Lab', adjacent: ['Central Library'] },
  ];
  const exact = await score('Central Library', zones);
  const adjacent = await score('Innovation & Computer Lab', zones);
  const unrelated = await score('Sports Complex', zones);

  assert.ok(exact > adjacent, `exact ${exact} > adjacent ${adjacent}`);
  assert.ok(adjacent > unrelated, `adjacent ${adjacent} > unrelated ${unrelated}`);
  assert.strictEqual(exact - adjacent, adjacent - unrelated, 'adjacency is worth exactly half the zone weight');
});

// ===========================================================================
// FR-10 / FR-11 — the claim workflow
// ===========================================================================
async function seedClaim(status = 'pending') {
  await seedPair();
  await db.doc('lostFoundItems/found-1/claims/claim-1').set({
    claimantUid: 'uid-owner', claimantName: 'Riya', proof: 'dented lid', status,
  });
}

test('FR-20: submitting a claim notifies the student who posted the item', async () => {
  await seedClaim();
  await fns.onClaimCreated.run(await created('lostFoundItems/found-1/claims/claim-1', { itemId: 'found-1', claimId: 'claim-1' }));

  const notes = await notificationsFor('uid-finder', 'claim');
  assert.strictEqual(notes.length, 1);
  assert.match(notes[0].message, /Riya claimed/);
  assert.strictEqual(notes[0].contextRef, 'found-1');
});

test('FR-20: claiming your own post notifies nobody', async () => {
  await seedPair();
  await db.doc('lostFoundItems/found-1/claims/claim-1').set({ claimantUid: 'uid-finder', status: 'pending' });
  await fns.onClaimCreated.run(await created('lostFoundItems/found-1/claims/claim-1', { itemId: 'found-1', claimId: 'claim-1' }));
  assert.strictEqual((await notificationsFor('uid-finder', 'claim')).length, 0);
});

test('FR-10/FR-11: approving a claim resolves the item and credits the finder', async () => {
  await seedClaim('approved');
  await fns.onClaimResolved.run(await changed(
    'lostFoundItems/found-1/claims/claim-1', { status: 'pending' }, { itemId: 'found-1', claimId: 'claim-1' }));

  assert.strictEqual((await itemData('found-1')).status, 'resolved');
  const finder = await userData('uid-finder');
  assert.strictEqual(finder.resolvedCount, 1);
  assert.ok(typeof finder.trustScore === 'number', 'trust recomputed for the finder');
  assert.ok(typeof (await userData('uid-owner')).trustScore === 'number', 'trust recomputed for the claimant');

  assert.match((await notificationsFor('uid-owner', 'claim'))[0].message, /approved/i);
  assert.match((await notificationsFor('uid-finder', 'claim'))[0].message, /You approved/i);
});

test('FR-10: rejecting a claim notifies the claimant and leaves the item open', async () => {
  await seedClaim('rejected');
  await fns.onClaimResolved.run(await changed(
    'lostFoundItems/found-1/claims/claim-1', { status: 'pending' }, { itemId: 'found-1', claimId: 'claim-1' }));

  assert.notStrictEqual((await itemData('found-1')).status, 'resolved');
  assert.match((await notificationsFor('uid-owner', 'claim'))[0].message, /declined/i);
  assert.strictEqual((await userData('uid-finder')).resolvedCount ?? 0, 0);
});

test('FR-10: a write that does not change the claim status is ignored', async () => {
  await seedClaim('approved');
  await fns.onClaimResolved.run(await changed(
    'lostFoundItems/found-1/claims/claim-1', { status: 'approved' }, { itemId: 'found-1', claimId: 'claim-1' }));
  assert.notStrictEqual((await itemData('found-1')).status, 'resolved');
});

// ===========================================================================
// FR-18 — reviews and trust
// ===========================================================================
test('FR-18: a review aggregates the ratee rating and recomputes their trust', async () => {
  await db.doc('reviews/r1').set({ raterUid: 'uid-owner', rateeUid: 'uid-finder', rating: 5, comment: 'quick' });
  await fns.onReviewCreated.run(await created('reviews/r1', { reviewId: 'r1' }));

  const u = await userData('uid-finder');
  assert.strictEqual(u.ratingCount, 1);
  assert.strictEqual(u.ratingAvg, 5);
  assert.ok(u.trustScore > 50, `trust ${u.trustScore} should rise above the neutral baseline`);
  assert.ok(u.trustTier);
  assert.match((await notificationsFor('uid-finder', 'review'))[0].message, /5★/);
});

test('FR-18: a second review averages across both', async () => {
  await db.doc('reviews/r1').set({ raterUid: 'uid-owner', rateeUid: 'uid-finder', rating: 5 });
  await fns.onReviewCreated.run(await created('reviews/r1', { reviewId: 'r1' }));
  await db.doc('reviews/r2').set({ raterUid: 'uid-mod', rateeUid: 'uid-finder', rating: 3 });
  await fns.onReviewCreated.run(await created('reviews/r2', { reviewId: 'r2' }));

  const u = await userData('uid-finder');
  assert.strictEqual(u.ratingCount, 2);
  assert.strictEqual(u.ratingAvg, 4);
});

// ===========================================================================
// FR-15 — the two-party marketplace handshake (Saga)
// ===========================================================================
async function seedListing() {
  await db.doc('listings/l1').set({
    title: 'Casio calculator', sellerUid: 'uid-finder', price: 500,
    status: 'active', lastOffer: { buyerUid: 'uid-owner' },
  });
}
const listing = async () => (await db.doc('listings/l1').get()).data();

test('FR-15: an unauthenticated caller is rejected', async () => {
  await seedListing();
  await assert.rejects(() => fns.confirmTransaction.run({ data: { listingId: 'l1' } }), /sign in required/);
});

test('FR-15: someone who is not a party to the deal is rejected', async () => {
  await seedListing();
  await assert.rejects(
    () => fns.confirmTransaction.run({ data: { listingId: 'l1' }, auth: caller('uid-mod') }),
    /not a party/);
});

test('FR-15: a listing with no offer cannot be confirmed', async () => {
  await seedListing();
  await db.doc('listings/l1').set({ lastOffer: null }, { merge: true });
  await assert.rejects(
    () => fns.confirmTransaction.run({ data: { listingId: 'l1' }, auth: caller('uid-owner') }),
    /no buyer offer/);
});

test('FR-15: one confirmation is not enough to sell', async () => {
  await seedListing();
  const res = await fns.confirmTransaction.run({ data: { listingId: 'l1' }, auth: caller('uid-owner') });

  assert.strictEqual(res.status, 'pending');
  const l = await listing();
  assert.strictEqual(l.status, 'active');
  assert.strictEqual(l.confirmations.buyer, true);
  assert.strictEqual(l.confirmations.seller ?? false, false);
  // the other side is nudged
  assert.strictEqual((await notificationsFor('uid-finder', 'deal')).length, 1);
});

test('FR-15: both confirmations mark it sold, unlock reviews and notify both', async () => {
  await seedListing();
  await fns.confirmTransaction.run({ data: { listingId: 'l1' }, auth: caller('uid-owner') });
  const res = await fns.confirmTransaction.run({ data: { listingId: 'l1' }, auth: caller('uid-finder') });

  assert.strictEqual(res.status, 'sold');
  const l = await listing();
  assert.strictEqual(l.status, 'sold');
  assert.strictEqual(l.reviewUnlocked, true);
  assert.strictEqual(l.buyerUid, 'uid-owner');
  assert.strictEqual((await userData('uid-finder')).resolvedCount, 1);
  assert.ok((await notificationsFor('uid-owner', 'deal')).some((n) => /both sides/.test(n.message)));
  assert.ok((await notificationsFor('uid-finder', 'deal')).some((n) => /both sides/.test(n.message)));
});

// ===========================================================================
// FR-19 / FR-21 — flagging, auto-hide and moderation
// ===========================================================================
const flagDoc = (n) => ({ reporterUid: `uid-r${n}`, targetType: 'item', targetId: 'found-1', reason: 'Spam', status: 'open' });

test('FR-19: one flag counts but does not hide the post', async () => {
  await seedPair();
  await db.doc('flags/f1').set(flagDoc(1));
  await fns.onFlagCreated.run(await created('flags/f1', { flagId: 'f1' }));

  const it = await itemData('found-1');
  assert.strictEqual(it.flagCount, 1);
  assert.notStrictEqual(it.status, 'hidden');
  assert.strictEqual((await notificationsFor('uid-mod', 'flag')).length, 1, 'moderators are told');
});

test('FR-21: the third flag auto-hides the post', async () => {
  await seedPair();
  for (const n of [1, 2, 3]) {
    await db.doc(`flags/f${n}`).set(flagDoc(n));
    await fns.onFlagCreated.run(await created(`flags/f${n}`, { flagId: `f${n}` }));
  }
  const it = await itemData('found-1');
  assert.strictEqual(it.flagCount, 3);
  assert.strictEqual(it.status, 'hidden');
  assert.strictEqual((await notificationsFor('uid-mod', 'flag')).length, 3);
});

test('FR-21: only a moderator or admin may resolve a flag', async () => {
  await seedPair();
  await db.doc('flags/f1').set(flagDoc(1));
  await assert.rejects(
    () => fns.resolveFlag.run({ data: { flagId: 'f1', action: 'dismiss' }, auth: caller('uid-owner') }),
    /moderator only/);
});

test('FR-21: a strike lands on the content owner and drops their trust', async () => {
  await seedPair();
  await db.doc('flags/f1').set(flagDoc(1));
  await fns.recomputeTrustScore.run({ data: { uid: 'uid-finder' } });
  const before = (await userData('uid-finder')).trustScore;

  await fns.resolveFlag.run({ data: { flagId: 'f1', action: 'strike' }, auth: caller('uid-mod', 'moderator') });

  const u = await userData('uid-finder');
  assert.strictEqual(u.strikes, 1);
  assert.ok(u.trustScore < before, `trust should fall from ${before}, got ${u.trustScore}`);
  assert.strictEqual((await db.doc('flags/f1').get()).data().status, 'resolved');
  assert.strictEqual((await notificationsFor('uid-finder', 'strike')).length, 1);
});

test('FR-21: dismissing a flag resolves it without a strike', async () => {
  await seedPair();
  await db.doc('flags/f1').set(flagDoc(1));
  await fns.resolveFlag.run({ data: { flagId: 'f1', action: 'dismiss' }, auth: caller('uid-mod', 'moderator') });

  assert.strictEqual((await db.doc('flags/f1').get()).data().status, 'resolved');
  assert.strictEqual((await userData('uid-finder')).strikes ?? 0, 0);
});

// ===========================================================================
// FR-22 / SCORING §1 — roles and trust recomputation
// ===========================================================================
test('FR-22: a non-admin cannot set roles', async () => {
  await assert.rejects(
    () => fns.setUserRole.run({ data: { uid: 'uid-owner', role: 'admin' }, auth: caller('uid-owner') }),
    /admin only/);
  await assert.rejects(
    () => fns.setUserRole.run({ data: { uid: 'uid-owner', role: 'admin' }, auth: caller('uid-mod', 'moderator') }),
    /admin only/);
});

test('FR-22: an admin cannot set a role outside the allowed set', async () => {
  await assert.rejects(
    () => fns.setUserRole.run({ data: { uid: 'uid-owner', role: 'superuser' }, auth: caller('uid-admin', 'admin') }),
    /valid role required/);
});

test('SCORING §1: recomputeTrustScore writes the score, tier and breakdown', async () => {
  await db.doc('users/uid-finder').set(
    { ratingAvg: 5, ratingCount: 20, resolvedCount: 12, verified: true, createdAt: new Date('2025-01-01') },
    { merge: true });
  const res = await fns.recomputeTrustScore.run({ data: { uid: 'uid-finder' } });

  const u = await userData('uid-finder');
  assert.strictEqual(u.trustScore, res.trustScore);
  assert.ok(u.trustScore > 80, `a long clean record should score high, got ${u.trustScore}`);
  assert.strictEqual(u.trustTier, res.trustTier);
  assert.ok(u.trustBreakdown.rating > 0 && u.trustBreakdown.verification === 10);
});

test('SCORING §1: recomputing an unknown user is an error, not a silent write', async () => {
  await assert.rejects(() => fns.recomputeTrustScore.run({ data: { uid: 'nobody' } }), /user not found/);
});
