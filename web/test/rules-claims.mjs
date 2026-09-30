// Rules-level tests for the claim link (`viaItemId`).
//
//   firebase emulators:start --only auth,firestore --project foundit-fcfcc
//   node web/test/rules-claims.mjs
//
// These cannot be UI tests: the point is what happens when a client writes a
// claim the UI would never offer — citing somebody else's report as evidence.
// So they go through the REST API with a real ID token, which is exactly what
// an attacker with the browser console has.
//
// Fixtures are written with the Admin SDK, which bypasses rules by design.
// Every assertion below is made as a signed-in user, so the rules are live.
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../functions/package.json', import.meta.url));

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';

const PROJECT = 'foundit-fcfcc';
const PASSWORD = 'Test!1234';
const IDP = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1`;
const REST = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;

initializeApp({ credential: applicationDefault?.() ?? undefined, projectId: PROJECT });
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
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
  });
  const body = await res.json();
  if (!body.idToken) throw new Error(`sign-in failed for ${email}: ${JSON.stringify(body)}`);
  return { uid: u.uid, token: body.idToken };
}

async function report(id, type, title, postedBy) {
  await db.collection('lostFoundItems').doc(id).set({
    type, title, description: `${title} description`, category: 'Electronics',
    keywords: title.toLowerCase().split(' '), zoneId: 'Lecture Halls (LH)',
    location: 'Lecture Halls (LH)', imageURLs: [], status: 'open',
    postedBy, reporterName: postedBy, dept: 'CSE', verified: true, trustScore: 60,
    matchedWith: [], matchScore: null, createdAt: FieldValue.serverTimestamp(),
  });
  return id;
}

/** Create a claim over REST as `who`. Returns the HTTP status. */
async function claim(itemId, who, viaItemId) {
  const fields = {
    claimantUid: { stringValue: who.uid },
    claimantName: { stringValue: 'Tester' },
    claimantDept: { stringValue: 'CSE' },
    claimantVerified: { booleanValue: true },
    itemTitle: { stringValue: 'x' },
    itemType: { stringValue: 'found' },
    message: { stringValue: '' },
    proof: { stringValue: 'scratched initials on the back' },
    meetingSpot: { stringValue: 'Central Library' },
    status: { stringValue: 'pending' },
    createdAt: { timestampValue: new Date().toISOString() },
    viaItemId: viaItemId ? { stringValue: viaItemId } : { nullValue: 'NULL_VALUE' },
  };
  const res = await fetch(
    `${REST}/lostFoundItems/${itemId}/claims?documentId=${who.uid}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${who.token}` },
      body: JSON.stringify({ fields }),
    }
  );
  return res.status;
}

// ── fixtures ────────────────────────────────────────────────────────────────
const finder = await user('rules.finder');   // posts the found calculator
const owner = await user('rules.owner');     // posts a matching lost calculator
const stranger = await user('rules.stranger'); // posts nothing of their own

const foundId = await report('rules-found-calc', 'found', 'Casio Calculator found in LH', finder.uid);
const lostId = await report('rules-lost-calc', 'lost', 'Casio Calculator lost in LH', owner.uid);
// A found report by the finder — same type as the target, so it must not
// qualify as corroboration even though the finder does own it.
const sameTypeId = await report('rules-found-other', 'found', 'Umbrella found', owner.uid);

// Clear any claims left by an earlier run.
for (const id of [foundId, lostId, sameTypeId]) {
  const snap = await db.collection('lostFoundItems').doc(id).collection('claims').get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
}

// ── assertions ──────────────────────────────────────────────────────────────
console.log('\n[claim link]');

step(await claim(foundId, owner, lostId) === 200,
  'owner may cite their own lost report');

step(await claim(foundId, stranger, lostId) !== 200,
  'stranger may NOT cite the owner\'s report as their own evidence');

step(await claim(foundId, stranger, undefined) === 200,
  'an unlinked claim is still allowed — nobody is locked out');

step(await claim(sameTypeId, finder, foundId) !== 200,
  'a same-type report does not qualify as corroboration');

step(await claim(lostId, owner, foundId) !== 200,
  'still cannot claim your own report');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
