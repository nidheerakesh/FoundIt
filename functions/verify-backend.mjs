// End-to-end checks for the backend triggers/callables against the emulator (admin SDK).
// Run the emulator (functions,firestore,auth) first, then:  node verify-backend.mjs
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
initializeApp({ projectId: 'foundit-demo' });
const db = getFirestore();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const pass = (m) => console.log('PASS ✅', m);
const fail = (m) => { console.log('FAIL ❌', m); process.exitCode = 1; };

async function until(fn, tries = 15, ms = 400) {
  for (let i = 0; i < tries; i++) { if (await fn()) return true; await wait(ms); }
  return false;
}

// --- 1. onReviewCreated: review -> ratee ratingAvg/count + trust recompute ---
{
  const seller = 'e2e-seller';
  await db.collection('users').doc(seller).set({
    name: 'Seller', email: 's@campus.edu', role: 'user', status: 'active', verified: true,
    ratingAvg: 0, ratingCount: 0, resolvedCount: 0, trustScore: 50, createdAt: Date.now(),
  });
  // a sold listing so contextRef is valid (rules also require this on the client path)
  const listing = await db.collection('listings').add({ sellerUid: seller, status: 'sold', title: 'X' });
  await db.collection('reviews').add({ raterUid: 'buyerA', rateeUid: seller, rating: 5, comment: 'great', contextRef: listing.id, createdAt: FieldValue.serverTimestamp() });
  const ok = await until(async () => {
    const u = (await db.collection('users').doc(seller).get()).data();
    return u.ratingCount === 1 && u.ratingAvg === 5 && u.trustScore !== 50;
  });
  const u = (await db.collection('users').doc(seller).get()).data();
  ok ? pass(`onReviewCreated: ratingAvg=${u.ratingAvg} count=${u.ratingCount} trust=${u.trustScore}`)
     : fail(`onReviewCreated did not update seller (ratingCount=${u.ratingCount} trust=${u.trustScore})`);
}

// --- 2. onClaimResolved: approve -> item resolved + finder resolvedCount++ + notifs ---
{
  const finder = 'e2e-finder';
  await db.collection('users').doc(finder).set({ name: 'Finder', role: 'user', status: 'active', verified: true, resolvedCount: 0, trustScore: 50, createdAt: Date.now() });
  const item = await db.collection('lostFoundItems').add({ type: 'found', title: 'Found keys', category: 'Misc', keywords: ['keys'], zoneId: 'z', status: 'open', postedBy: finder, matchedWith: [], matchScore: null, createdAt: Date.now() });
  const claim = await item.collection('claims').add({ claimantUid: 'e2e-claimant', message: 'mine', status: 'pending', createdAt: FieldValue.serverTimestamp() });
  await claim.update({ status: 'approved' });
  const ok = await until(async () => {
    const it = (await item.get()).data();
    const f = (await db.collection('users').doc(finder).get()).data();
    return it.status === 'resolved' && f.resolvedCount === 1;
  });
  const notifs = await db.collection('notifications').where('type', '==', 'claim').get();
  ok && notifs.size >= 2 ? pass(`onClaimResolved: item resolved, finder resolvedCount++, ${notifs.size} claim notifs`)
     : fail(`onClaimResolved incomplete (notifs=${notifs.size})`);
}

// --- 3. onFlagCreated: 3 flags -> target hidden + mod notified ---
{
  await db.collection('users').doc('e2e-mod').set({ name: 'Mod', role: 'moderator', status: 'active', verified: true, createdAt: Date.now() });
  const target = await db.collection('listings').add({ sellerUid: 'x', status: 'active', title: 'Spam', flagCount: 0 });
  for (let i = 0; i < 3; i++) {
    await db.collection('flags').add({ reporterUid: `rep${i}`, targetType: 'listing', targetId: target.id, reason: 'spam', status: 'open', createdAt: FieldValue.serverTimestamp() });
    await wait(300);
  }
  const ok = await until(async () => (await target.get()).data().status === 'hidden');
  const modNotifs = await db.collection('notifications').where('type', '==', 'flag').get();
  ok && modNotifs.size >= 1 ? pass(`onFlagCreated: target hidden after 3 flags, ${modNotifs.size} mod notifs`)
     : fail(`onFlagCreated did not hide (status=${(await target.get()).data().status})`);
}

console.log('\nDone.');
process.exit(process.exitCode || 0);
