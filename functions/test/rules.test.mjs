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

// ===========================================================================
// The rest of the collections. Firestore rules are an architectural layer here
// (ARCHITECTURE.md §8.3), so every server-owned field is checked from the
// client side, where a real attacker would be.
// ===========================================================================
const unverified = (uid) => env.authenticatedContext(uid, { email_verified: false }).firestore();
const mod = (uid) => env.authenticatedContext(uid, { email_verified: true, role: 'moderator' }).firestore();
const anon = () => env.unauthenticatedContext().firestore();

async function seedMarket() {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/uid-seller'), { name: 'Arjun', trustScore: 70, role: 'user', strikes: 0 });
    await setDoc(doc(db, 'listings/l1'), { title: 'Calculator', sellerUid: 'uid-seller', price: 500, status: 'active' });
    await setDoc(doc(db, 'listings/l-sold'), { title: 'Cycle', sellerUid: 'uid-seller', status: 'sold' });
    await setDoc(doc(db, 'notifications/n1'), { userId: 'uid-seller', type: 'match', message: 'hi', read: false });
    await setDoc(doc(db, 'flags/f1'), { reporterUid: 'uid-buyer', targetType: 'item', targetId: 'x', status: 'open' });
  });
}

// --- users -----------------------------------------------------------------
test('users: profile docs are not readable while signed out', async () => {
  await seedMarket();
  await assertFails(getDoc(doc(anon(), 'users/uid-seller')));
});

test('users: you can edit your own profile but not your trust or role', async () => {
  await seedMarket();
  await assertSucceeds(updateDoc(doc(verified('uid-seller'), 'users/uid-seller'), { name: 'Arjun K' }));
  await assertFails(updateDoc(doc(verified('uid-seller'), 'users/uid-seller'), { trustScore: 100 }));
  await assertFails(updateDoc(doc(verified('uid-seller'), 'users/uid-seller'), { role: 'admin' }));
  // keeps() compares values, so re-writing the same value is a legitimate
  // no-op; only an actual change to a server-owned field is rejected.
  await assertSucceeds(updateDoc(doc(verified('uid-seller'), 'users/uid-seller'), { strikes: 0, name: 'x' }));
  await assertFails(updateDoc(doc(verified('uid-seller'), 'users/uid-seller'), { strikes: 5 }));
});

test('users: you cannot edit somebody else’s profile', async () => {
  await seedMarket();
  await assertFails(updateDoc(doc(verified('uid-buyer'), 'users/uid-seller'), { name: 'hacked' }));
});

// --- lost & found ----------------------------------------------------------
test('items: an unverified account cannot post a report', async () => {
  await seedMarket();
  await assertFails(setDoc(doc(unverified('uid-new'), 'lostFoundItems/i9'),
    { type: 'lost', title: 'Bag', postedBy: 'uid-new' }));
});

test('items: you cannot post a report in somebody else’s name', async () => {
  await seedMarket();
  await assertFails(setDoc(doc(verified('uid-buyer'), 'lostFoundItems/i9'),
    { type: 'lost', title: 'Bag', postedBy: 'uid-seller' }));
});

// --- listings --------------------------------------------------------------
test('listings: a verified student can list their own item', async () => {
  await seedMarket();
  await assertSucceeds(setDoc(doc(verified('uid-seller'), 'listings/l2'),
    { title: 'Lab coat', sellerUid: 'uid-seller', price: 200, status: 'active' }));
});

test('listings: you cannot list on somebody else’s behalf', async () => {
  await seedMarket();
  await assertFails(setDoc(doc(verified('uid-buyer'), 'listings/l2'),
    { title: 'Lab coat', sellerUid: 'uid-seller', price: 200 }));
});

test('listings: no client can mark a listing sold — that is the handshake’s job', async () => {
  await seedMarket();
  await assertFails(updateDoc(doc(verified('uid-seller'), 'listings/l1'), { status: 'sold' }));
  await assertFails(updateDoc(doc(verified('uid-buyer'), 'listings/l1'), { reviewUnlocked: true }));
});

test('listings: a buyer may still place an offer', async () => {
  await seedMarket();
  await assertSucceeds(updateDoc(doc(verified('uid-buyer'), 'listings/l1'),
    { lastOffer: { buyerUid: 'uid-buyer', amount: 450 } }));
});

// --- reviews ---------------------------------------------------------------
test('reviews: allowed only after the referenced deal is sold (FR-18)', async () => {
  await seedMarket();
  await assertSucceeds(setDoc(doc(verified('uid-buyer'), 'reviews/rv1'),
    { raterUid: 'uid-buyer', rateeUid: 'uid-seller', rating: 5, contextRef: 'l-sold' }));
  await assertFails(setDoc(doc(verified('uid-buyer'), 'reviews/rv2'),
    { raterUid: 'uid-buyer', rateeUid: 'uid-seller', rating: 5, contextRef: 'l1' }));
});

test('reviews: no self-reviews and no out-of-range ratings', async () => {
  await seedMarket();
  await assertFails(setDoc(doc(verified('uid-seller'), 'reviews/rv3'),
    { raterUid: 'uid-seller', rateeUid: 'uid-seller', rating: 5, contextRef: 'l-sold' }));
  await assertFails(setDoc(doc(verified('uid-buyer'), 'reviews/rv4'),
    { raterUid: 'uid-buyer', rateeUid: 'uid-seller', rating: 9, contextRef: 'l-sold' }));
});

test('reviews: cannot be edited or deleted once written', async () => {
  await seedMarket();
  await assertSucceeds(setDoc(doc(verified('uid-buyer'), 'reviews/rv1'),
    { raterUid: 'uid-buyer', rateeUid: 'uid-seller', rating: 5, contextRef: 'l-sold' }));
  await assertFails(updateDoc(doc(verified('uid-buyer'), 'reviews/rv1'), { rating: 1 }));
});

// --- flags -----------------------------------------------------------------
test('flags: a student can report content but cannot read the queue', async () => {
  await seedMarket();
  await assertSucceeds(setDoc(doc(verified('uid-buyer'), 'flags/f2'),
    { reporterUid: 'uid-buyer', targetType: 'item', targetId: 'x', status: 'open' }));
  await assertFails(getDoc(doc(verified('uid-buyer'), 'flags/f1')));
});

test('flags: a moderator can read and resolve the queue', async () => {
  await seedMarket();
  await assertSucceeds(getDoc(doc(mod('uid-mod'), 'flags/f1')));
  await assertSucceeds(updateDoc(doc(mod('uid-mod'), 'flags/f1'), { status: 'resolved' }));
});

// --- notifications ---------------------------------------------------------
test('notifications: you read only your own, and no client can write them', async () => {
  await seedMarket();
  await assertSucceeds(getDoc(doc(verified('uid-seller'), 'notifications/n1')));
  await assertFails(getDoc(doc(verified('uid-buyer'), 'notifications/n1')));
  await assertFails(setDoc(doc(verified('uid-seller'), 'notifications/n2'),
    { userId: 'uid-seller', type: 'match', message: 'fake' }));
});

// --- reference data --------------------------------------------------------
test('campusZones: readable by anyone, writable by no client (FR-24)', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'campusZones/lib'), { name: 'Central Library', adjacent: [] });
  });
  await assertSucceeds(getDoc(doc(anon(), 'campusZones/lib')));
  await assertFails(setDoc(doc(mod('uid-mod'), 'campusZones/evil'), { name: 'x', adjacent: [] }));
});

// --- chats (FR-17) ---------------------------------------------------------
async function seedChat() {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'chats/c1'), { participants: ['uid-a', 'uid-b'], itemRef: 'item-1' });
    await setDoc(doc(db, 'chats/c1/messages/m1'), { senderUid: 'uid-a', text: 'is this mine?' });
  });
}

test('chats: a participant can read the thread', async () => {
  await seedChat();
  await assertSucceeds(getDoc(doc(verified('uid-a'), 'chats/c1')));
  await assertSucceeds(getDoc(doc(verified('uid-b'), 'chats/c1')));
});

test('chats: an outsider cannot read the thread', async () => {
  await seedChat();
  await assertFails(getDoc(doc(verified('uid-c'), 'chats/c1')));
});

test('chats: you cannot open a thread you are not part of', async () => {
  await seedChat();
  await assertFails(setDoc(doc(verified('uid-c'), 'chats/c2'), { participants: ['uid-a', 'uid-b'] }));
  await assertSucceeds(setDoc(doc(verified('uid-c'), 'chats/c3'), { participants: ['uid-c', 'uid-a'] }));
});

test('chats: you cannot post a message under somebody else’s name', async () => {
  await seedChat();
  await assertFails(setDoc(doc(verified('uid-b'), 'chats/c1/messages/m2'),
    { senderUid: 'uid-a', text: 'spoofed' }));
  await assertSucceeds(setDoc(doc(verified('uid-b'), 'chats/c1/messages/m2'),
    { senderUid: 'uid-b', text: 'yes, describe the lid' }));
});

test('chats: an outsider cannot read the messages either (privacy)', async () => {
  await seedChat();
  // Regression: subcollection rules do not inherit the parent chat's gate, so
  // this was readable by any signed-in account until the check was repeated.
  await assertFails(getDoc(doc(verified('uid-outsider'), 'chats/c1/messages/m1')));
  await assertSucceeds(getDoc(doc(verified('uid-a'), 'chats/c1/messages/m1')));
});

test('chats: an outsider cannot post into a thread', async () => {
  await seedChat();
  await assertFails(setDoc(doc(verified('uid-outsider'), 'chats/c1/messages/m3'),
    { senderUid: 'uid-outsider', text: 'butting in' }));
});

test('chats: messages are immutable once sent', async () => {
  await seedChat();
  await assertFails(updateDoc(doc(verified('uid-a'), 'chats/c1/messages/m1'), { text: 'edited' }));
});
