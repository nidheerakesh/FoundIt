// Rules-level tests for marketplace offers.
//
//   firebase emulators:start --only auth,firestore --project foundit-fcfcc
//   node web/test/rules-offers.mjs
//
// Offers moved from a single `lastOffer` field to a subcollection so a second
// bidder cannot bury the first. `lastOffer` now means "the offer the seller
// accepted", which makes it the thing worth attacking: a buyer who could write
// it would select themselves, and a seller who could invent one would fabricate
// a counterparty. Both are checked below.
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../functions/package.json', import.meta.url));

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';

const PROJECT = 'foundit-fcfcc';
const PASSWORD = 'Test!1234';
const IDP = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1`;
const REST = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;

initializeApp({ projectId: PROJECT });
const db = getFirestore();
const auth = getAuth();

let pass = 0, fail = 0;
const step = (ok, name, extra = '') => {
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
};

async function user(handle) {
  const email = `${handle}@iiitkottayam.ac.in`;
  let u;
  try { u = await auth.getUserByEmail(email); }
  catch { u = await auth.createUser({ email, password: PASSWORD, emailVerified: true, displayName: handle }); }
  const res = await fetch(`${IDP}/accounts:signInWithPassword?key=demo`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
  });
  return { uid: u.uid, token: (await res.json()).idToken };
}

const LISTING = 'offers-test-listing';

/** Write an offer over REST as `who`, in `inName`'s name (for the forgery case). */
async function offer(who, inName = who, price = 100) {
  const res = await fetch(`${REST}/listings/${LISTING}/offers?documentId=${inName.uid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${who.token}` },
    body: JSON.stringify({ fields: {
      buyerUid: { stringValue: inName.uid },
      buyerName: { stringValue: 'Buyer' },
      buyerDept: { stringValue: 'CSE' },
      buyerVerified: { booleanValue: true },
      price: { integerValue: String(price) },
      meetupSpot: { stringValue: 'Central Library' },
      message: { stringValue: '' },
      createdAt: { timestampValue: new Date().toISOString() },
    } }),
  });
  return res.status;
}

/** Try to set lastOffer (i.e. accept `buyerUid`) as `who`. */
async function accept(who, buyerUid) {
  const res = await fetch(
    `${REST}/listings/${LISTING}?updateMask.fieldPaths=lastOffer`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${who.token}` },
      body: JSON.stringify({ fields: { lastOffer: { mapValue: { fields: {
        buyerUid: { stringValue: buyerUid },
        buyerName: { stringValue: 'Buyer' },
        price: { integerValue: '100' },
        meetupSpot: { stringValue: 'Central Library' },
        message: { stringValue: '' },
        createdAt: { integerValue: String(Date.now()) },
      } } } } }),
    }
  );
  return res.status;
}

const get = (path, who) => fetch(`${REST}/${path}`, {
  headers: who ? { Authorization: `Bearer ${who.token}` } : {},
});

const seller = await user('offers.seller');
const buyerA = await user('offers.buyera');
const buyerB = await user('offers.buyerb');
const nobody = await user('offers.nobody');

await db.doc(`listings/${LISTING}`).set({
  title: 'Test Cycle', description: 'A cycle.', category: 'Vehicles & Cycles',
  keywords: ['cycle'], condition: 'Good Condition', priceType: 'sale', price: 1000,
  location: '', imageURLs: [], status: 'active',
  sellerUid: seller.uid, sellerName: 'Seller', dept: 'CSE', verified: true, trustScore: 60,
  createdAt: FieldValue.serverTimestamp(),
});
for (const u of [buyerA, buyerB, nobody]) {
  await db.doc(`listings/${LISTING}/offers/${u.uid}`).delete().catch(() => {});
}
await db.doc(`listings/${LISTING}`).update({ lastOffer: FieldValue.delete() }).catch(() => {});

console.log('\n[offers]');

step(await offer(buyerA) === 200, 'a buyer may place their own offer');
step(await offer(buyerB, buyerB, 120) === 200, 'a second buyer may bid without burying the first');

step(await offer(buyerA, buyerB) !== 200,
  'a buyer may NOT place an offer in someone else\'s name');
step(await offer(seller) !== 200,
  'the seller may not bid on their own listing');

step((await get(`listings/${LISTING}/offers/${buyerA.uid}`, buyerB)).status !== 200,
  'a rival cannot read another buyer\'s offer and undercut it');
step((await get(`listings/${LISTING}/offers/${buyerA.uid}`, buyerA)).status === 200,
  'a buyer can read their own offer');
step((await get(`listings/${LISTING}/offers/${buyerA.uid}`, seller)).status === 200,
  'the seller can read the offers they are judging');

console.log('\n[accepting]');

step(await accept(buyerA, buyerA.uid) !== 200,
  'a buyer cannot accept themselves');
step(await accept(seller, nobody.uid) !== 200,
  'the seller cannot accept a buyer who never made an offer');
step(await accept(seller, buyerB.uid) === 200,
  'the seller may accept a real offer');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
