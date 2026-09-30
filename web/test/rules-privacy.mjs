// Rules-level tests for the private item description.
//
//   firebase emulators:start --only auth,firestore --project foundit-fcfcc
//   node web/test/rules-privacy.mjs
//
// The threat: a claim is judged on marks only the true owner should know, so if
// the item's own description is publicly readable a fraudster reads it and
// hands it back as proof. Firestore rules are document-level, so the
// description lives in lostFoundItems/{id}/private/detail.
//
// Fixtures use the Admin SDK (bypasses rules). Every assertion is made as a
// signed-in user or anonymously over REST, so the rules are live.
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

const get = (path, who) => fetch(`${REST}/${path}`, {
  headers: who ? { Authorization: `Bearer ${who.token}` } : {},
});

const SECRET = 'MEERA scratched on the back near the solar panel';
const ITEM = 'privacy-test-calc';

const owner = await user('privacy.owner');
const other = await user('privacy.other');

await db.doc(`lostFoundItems/${ITEM}`).set({
  type: 'lost', title: 'Casio Calculator lost in LH-204',
  category: 'Electronics',
  // Coarse only — deliberately no words from SECRET.
  keywords: ['casio', 'calculator', 'lost', '204', 'black'],
  hasDetail: true, zoneId: 'Lecture Halls (LH)', location: 'Lecture Halls (LH)',
  imageURLs: [], status: 'open', postedBy: owner.uid, reporterName: 'Owner',
  dept: 'CSE', verified: true, trustScore: 60,
  matchedWith: [], matchScore: null, createdAt: FieldValue.serverTimestamp(),
});
await db.doc(`lostFoundItems/${ITEM}/private/detail`).set({ description: SECRET });

console.log('\n[private description]');

const publicDoc = await (await get(`lostFoundItems/${ITEM}`)).text();
step(!publicDoc.includes('scratched'),
  'the card document carries no identifying detail, even unauthenticated');

step(!publicDoc.includes('solar'),
  'and no description-derived keyword leaks onto it either');

step((await get(`lostFoundItems/${ITEM}/private/detail`)).status !== 200,
  'the private subdocument is unreadable anonymously');

step((await get(`lostFoundItems/${ITEM}/private/detail`, other)).status !== 200,
  'and unreadable by another signed-in student');

const mine = await get(`lostFoundItems/${ITEM}/private/detail`, owner);
step(mine.status === 200 && (await mine.text()).includes('scratched'),
  'the poster can read their own description');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
