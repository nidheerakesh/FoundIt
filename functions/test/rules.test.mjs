// Security rules tests for the claim workflow (FR-10) and the server-owned
// fields on an item. These run against a real Firestore emulator:
//
//   java -jar ~/.cache/firebase/emulators/cloud-firestore-emulator-*.jar \
//     --host=127.0.0.1 --port=8080 &
//   cd functions && npm install
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node --test test/
//
// `npm test` (node --test) only covers the pure src/*.test.js units, which need
// no emulator; these are kept in test/ so they stay opt-in.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { test, before, after } from 'node:test';
import assert from 'node:assert';
import {
  initializeTestEnvironment, assertFails, assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';

const RULES = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'firestore.rules');

let env;
const OWNER = 'uid-finder';       // posted the found item
const CLAIMANT = 'uid-owner';     // lost it, submitted the claim
const STRANGER = 'uid-stranger';
const ITEM = 'lostFoundItems/item-1';
const CLAIM = 'lostFoundItems/item-1/claims/claim-1';

const verified = (uid) => env.authenticatedContext(uid, { email_verified: true }).firestore();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-foundit',
    firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync(RULES, 'utf8') },
  });
});
after(async () => { await env?.cleanup(); });

async function seed() {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, ITEM), { type: 'found', title: 'Blue bottle', postedBy: OWNER, status: 'open' });
    await setDoc(doc(db, CLAIM), { claimantUid: CLAIMANT, proof: 'dented lid', status: 'pending' });
  });
}

test('the item poster can approve a pending claim (FR-10)', async () => {
  await seed();
  await assertSucceeds(updateDoc(doc(verified(OWNER), CLAIM), { status: 'approved' }));
});

test('the item poster can reject a pending claim', async () => {
  await seed();
  await assertSucceeds(updateDoc(doc(verified(OWNER), CLAIM), { status: 'rejected' }));
});

test('a stranger cannot resolve someone else’s claim', async () => {
  await seed();
  await assertFails(updateDoc(doc(verified(STRANGER), CLAIM), { status: 'approved' }));
});

test('the claimant cannot approve their own claim', async () => {
  await seed();
  await assertFails(updateDoc(doc(verified(CLAIMANT), CLAIM), { status: 'approved' }));
});

test('the resolver cannot rewrite the proof while resolving', async () => {
  await seed();
  await assertFails(updateDoc(doc(verified(OWNER), CLAIM), { status: 'approved', proof: 'tampered' }));
});

test('the resolver cannot reassign the claim to someone else', async () => {
  await seed();
  await assertFails(updateDoc(doc(verified(OWNER), CLAIM), { status: 'approved', claimantUid: STRANGER }));
});

test('status must land on approved or rejected, not an arbitrary value', async () => {
  await seed();
  await assertFails(updateDoc(doc(verified(OWNER), CLAIM), { status: 'resolved' }));
});

test('an already-resolved claim cannot be flipped again', async () => {
  await seed();
  await assertSucceeds(updateDoc(doc(verified(OWNER), CLAIM), { status: 'approved' }));
  await assertFails(updateDoc(doc(verified(OWNER), CLAIM), { status: 'rejected' }));
});

test('a verified student can still submit a claim', async () => {
  await seed();
  await assertSucceeds(setDoc(doc(verified(STRANGER), 'lostFoundItems/item-1/claims/claim-2'),
    { claimantUid: STRANGER, proof: 'scratch on the base', status: 'pending' }));
});

test('the client still cannot write server-owned match fields on the item', async () => {
  await seed();
  await assertFails(updateDoc(doc(verified(OWNER), ITEM), { matchScore: 100 }));
  await assertFails(updateDoc(doc(verified(OWNER), ITEM), { status: 'resolved' }));
});
