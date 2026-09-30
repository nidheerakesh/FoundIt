// Fills the database with a believable campus: lost and found reports that
// pair up, a claim waiting for review, returned items, marketplace listings in
// every state, a chat thread, notifications and a flag in the moderation queue.
//
// Every post is owned by a real demo account (or a background student), so
// each workflow in docs/DEMO-SCRIPT.md can be driven straight after seeding:
//
//   Riya  — sees "Review claims (1)" on her lost water bottle; approve it.
//           Has an offer out on Arjun's cycle; confirm it. Bought Meera's
//           Arduino kit; rate the seller.
//   Meera — her lost calculator matches Riya's found one; claim it.
//           Moderator: one open flag waits in the Moderation queue.
//   Arjun — his lost charger matches Meera's found one. Confirm the cycle sale
//           once Riya has confirmed.
//
// Doc ids all start with "demo-", so re-running resets the demo to this state
// without touching anything real users posted. --reset deletes the demo docs
// (and their claims/messages) without re-seeding.
//
// --wipe-all first deletes EVERY post, claim, chat, notification, flag and
// review — test posts included — so the database holds only the demo data.
// User profiles and sign-in accounts are kept. This cannot be undone.
//
// The demo accounts must exist first (scripts/seed-demo-users.mjs).
//
// Live project (service account key from Firebase console → Project settings
// → Service accounts → Generate new private key):
//   export GOOGLE_APPLICATION_CREDENTIALS=~/foundit-key.json
//   node scripts/seed-demo-data.mjs --project foundit-fcfcc
//
// Emulator:
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
//   node scripts/seed-demo-data.mjs
import { createRequire } from 'node:module';

const arg = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null);
const RESET_ONLY = process.argv.includes('--reset');
const WIPE_ALL = process.argv.includes('--wipe-all');
const EMULATED = !!process.env.FIRESTORE_EMULATOR_HOST;
const PROJECT = arg('--project') || (EMULATED ? (process.env.GCLOUD_PROJECT || 'foundit-demo') : null);

if (!PROJECT) {
  console.error('Refusing to guess a project. Pass --project <id>, or set FIRESTORE_EMULATOR_HOST.');
  process.exit(1);
}
if (!EMULATED && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to a service account key, or target the emulator.');
  process.exit(1);
}
if (EMULATED && !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error('Set FIREBASE_AUTH_EMULATOR_HOST too, so the demo accounts are looked up in the emulator.');
  process.exit(1);
}
process.env.GCLOUD_PROJECT = PROJECT;

const require = createRequire(new URL('../web/package.json', import.meta.url));
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
initializeApp(EMULATED ? { projectId: PROJECT } : { credential: applicationDefault(), projectId: PROJECT });
const db = getFirestore();

// ── Reset: delete demo-* docs (or everything), subcollections included ──────
const CONTENT = ['lostFoundItems', 'listings', 'chats', 'notifications', 'flags', 'reviews'];
async function wipe(all) {
  let n = 0;
  for (const col of CONTENT) {
    const snap = await db.collection(col).get();
    for (const d of snap.docs) {
      if (!all && !d.id.startsWith('demo-') && !d.id.includes('_demo-')) continue;
      await db.recursiveDelete(d.ref);
      n++;
    }
  }
  return n;
}

if (WIPE_ALL && !EMULATED) {
  console.log(`--wipe-all: deleting ALL posts, claims, chats, notifications, flags and reviews in ${PROJECT} in 5s. Ctrl+C to stop.`);
  await new Promise((r) => setTimeout(r, 5000));
}
const removed = await wipe(WIPE_ALL);
if (RESET_ONLY) {
  console.log(`Removed ${removed} demo docs from ${PROJECT}.`);
  process.exit(0);
}

// ── People ──────────────────────────────────────────────────────────────────
const DEMO = {
  riya:  { email: 'riya.demo@iiitkottayam.ac.in',  role: 'user',      name: 'Riya Singh', dept: 'CSE', trust: 82, rating: 4.8, ratings: 6, resolved: 4 },
  arjun: { email: 'arjun.demo@iiitkottayam.ac.in', role: 'user',      name: 'Arjun Nair', dept: 'ECE', trust: 74, rating: 4.5, ratings: 4, resolved: 3 },
  meera: { email: 'meera.demo@iiitkottayam.ac.in', role: 'moderator', name: 'Meera Das',  dept: 'CSE', trust: 88, rating: 4.9, ratings: 9, resolved: 6 },
};
const missing = [];
for (const p of Object.values(DEMO)) {
  try { p.uid = (await getAuth().getUserByEmail(p.email)).uid; } catch { missing.push(p.email); }
}
if (missing.length) {
  console.error(`Demo accounts missing in ${PROJECT}: ${missing.join(', ')}`);
  console.error('Create them first: DEMO_PASSWORD=… node scripts/seed-demo-users.mjs' + (EMULATED ? '' : ` --project ${PROJECT}`));
  process.exit(1);
}
// Background students: they make the feed look lived-in. They have no login.
const BG = {
  kabir:  { uid: 'demo-user-kabir',  name: 'Kabir Menon',  dept: 'ME',       trust: 66, rating: 4.2, ratings: 3, resolved: 2 },
  ananya: { uid: 'demo-user-ananya', name: 'Ananya Rao',   dept: 'BioTech',  trust: 71, rating: 4.6, ratings: 5, resolved: 2 },
  rahul:  { uid: 'demo-user-rahul',  name: 'Rahul Verma',  dept: 'CSE',      trust: 58, rating: 4.0, ratings: 2, resolved: 1 },
};
const P = { ...DEMO, ...BG };
const tier = (t) => (t >= 85 ? 'star' : t >= 75 ? 'reliable' : t >= 60 ? 'trusted' : 'neutral');

for (const [key, p] of Object.entries(P)) {
  const isDemo = key in DEMO;
  await db.doc(`users/${p.uid}`).set({
    name: p.name,
    dept: p.dept,
    hostelOrDept: p.dept,
    verified: true,
    trustScore: p.trust,
    trustTier: tier(p.trust),
    ratingAvg: p.rating,
    ratingCount: p.ratings,
    resolvedCount: p.resolved,
    // The UI reads the role from this profile; the rules read the token claim
    // that seed-demo-users.mjs sets. Both must say moderator for Meera.
    ...(isDemo ? { role: p.role, email: p.email, status: 'active' } : { role: 'user', status: 'active', email: `${key}.bg@iiitkottayam.ac.in`, createdAt: Timestamp.fromMillis(Date.now() - 120 * 86400000) }),
  }, { merge: true });
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const H = 3600000;
const ago = (hours) => Timestamp.fromMillis(Date.now() - hours * H);
const kw = (...parts) => [...new Set(parts.join(' ').toLowerCase().match(/[a-z0-9]{3,}/g) || [])].slice(0, 12);
const poster = (p) => ({ postedBy: p.uid, reporterName: p.name, dept: p.dept, verified: true, trustScore: p.trust });
const seller = (p) => ({ sellerUid: p.uid, sellerName: p.name, dept: p.dept, verified: true, trustScore: p.trust });

// ── Lost & found ────────────────────────────────────────────────────────────
// Location strings must match CAMPUS_LOCATIONS in web/src/data/mockData.js.
const reports = [
  // Pair 1 — Arjun found Riya's bottle and has claimed it: Riya reviews.
  ['demo-lf-bottle-lost',  'lost',  'Blue Stainless Water Bottle', 'Dark blue Milton bottle covered in GitHub and React stickers, left at study desk 14 on the first floor.', 'Accessories', 'Central Library', P.riya, 5],
  ['demo-lf-bottle-found', 'found', 'Blue Metal Bottle with Stickers', 'Found a blue steel bottle with coding stickers at the library first-floor desks. Handed nowhere yet, I have it.', 'Accessories', 'Central Library', P.arjun, 3],
  // Pair 2 — Riya found Meera's calculator: Meera claims it.
  ['demo-lf-calc-lost',    'lost',  'Casio fx-991EX Calculator', 'Black Casio scientific calculator, "MEERA" scratched on the back. Probably left in LH-204 after the maths quiz.', 'Electronics', 'Lecture Halls (LH)', P.meera, 20],
  ['demo-lf-calc-found',   'found', 'Casio Scientific Calculator in LH-204', 'Found a black Casio calculator under a bench in LH-204. Name scratched on the back.', 'Electronics', 'Lecture Halls (LH)', P.riya, 18],
  // Pair 3 — adjacent zones: Meera found Arjun's charger in the library.
  ['demo-lf-charger-lost', 'lost',  'Grey Dell Laptop Charger', '65W Dell charger with a frayed sticker on the brick. Left in the Innovation Lab during the hackathon.', 'Electronics', 'Innovation & Computer Lab', P.arjun, 30],
  ['demo-lf-charger-found','found', 'Dell 65W Charger', 'Grey Dell laptop charger plugged in at a library charging point, nobody came back for it.', 'Electronics', 'Central Library', P.meera, 26],
  // Singles.
  ['demo-lf-idcard',       'found', 'Campus ID Card — Ananya R.', 'Student ID found near the mess counter after lunch. BioTech 2nd year.', 'ID & Cards', 'Central Mess & Canteen', P.kabir, 8],
  ['demo-lf-bracelet',     'lost',  'Silver Bracelet', 'Thin silver chain bracelet with a small star charm. Lost around the basketball court in the evening.', 'Accessories', 'Sports Complex', P.ananya, 40],
  ['demo-lf-hoodie',       'lost',  'Navy Decathlon Hoodie', 'Navy blue Decathlon hoodie, size M, left on a chair in the hostel common room.', 'Clothing & Gear', 'Hostel Complex', P.rahul, 52],
  ['demo-lf-specs',        'found', 'Spectacles in Brown Case', 'Black-framed glasses in a brown Titan case, found on a desk in LH-101.', 'Accessories', 'Lecture Halls (LH)', P.ananya, 12],
  ['demo-lf-cyclekey',     'lost',  'Cycle Lock Key with Red Tag', 'Small key on a red plastic tag, for a Hero cycle lock. Dropped somewhere between the hostel and the sports complex.', 'Vehicles & Cycles', 'Hostel Complex', P.kabir, 70],
  // Already returned — the success stories.
  ['demo-lf-wallet',       'lost',  'Black Leather Wallet', 'Black Woodland wallet with college ID and some cash. Lost near the mess.', 'Accessories', 'Central Mess & Canteen', P.rahul, 96, 'resolved'],
  ['demo-lf-airpods',      'found', 'AirPods Pro Case', 'White AirPods Pro case found in the Innovation Lab.', 'Electronics', 'Innovation & Computer Lab', P.meera, 120, 'resolved'],
];
for (const [id, type, title, description, category, zone, who, hours, status = 'open'] of reports) {
  await db.doc(`lostFoundItems/${id}`).set({
    type, title, description, category, keywords: kw(title, description),
    zoneId: zone, location: zone, imageURLs: [], status,
    ...poster(who),
    // Left empty on purpose: the client computes match scores when the
    // suggestMatches function is not deployed, and prefers it when it is.
    matchedWith: [], matchScore: null,
    createdAt: ago(hours),
    ...(status === 'resolved' ? { resolvedClaimId: 'demo-claim', resolvedAt: ago(hours - 20) } : {}),
  });
}

const claim = (itemId, who, item, proof, meetingSpot, status, hours) =>
  db.doc(`lostFoundItems/${itemId}/claims/demo-claim`).set({
    claimantUid: who.uid, claimantName: who.name, claimantDept: who.dept, claimantVerified: true,
    itemTitle: item.title, itemType: item.type,
    message: '', proof, meetingSpot, status, createdAt: ago(hours),
  });
await claim('demo-lf-bottle-lost', P.arjun, { title: 'Blue Stainless Water Bottle', type: 'lost' },
  'GitHub and React stickers, small dent near the base, Milton logo. Found it at desk 14.', 'Library Front Desk', 'pending', 2);
await claim('demo-lf-wallet', P.kabir, { title: 'Black Leather Wallet', type: 'lost' },
  'Woodland wallet, college ID inside says Rahul Verma. Found under a mess table.', 'Central Mess & Canteen', 'approved', 90);
await claim('demo-lf-airpods', P.kabir, { title: 'AirPods Pro Case', type: 'found' },
  'Serial ends in 7QX, engraved "KM" on the case lid.', 'Innovation Lab entrance', 'approved', 110);

// ── Marketplace ─────────────────────────────────────────────────────────────
const listings = [
  ['demo-ls-textbooks', 'Engineering Maths Textbook Set', 'Three semesters of B.S. Grewal and Kreyszig, lightly highlighted.', 'Books & Notes', 450, 'sale', 'Good Condition', 'Central Library', P.meera, 6],
  ['demo-ls-lamp',      'Hostel Study Lamp', 'LED desk lamp with three brightness levels. Giving away on move-out.', 'Clothing & Gear', 0, 'free', 'Used - Works Fine', 'Hostel Complex', P.riya, 10],
  ['demo-ls-cycle',     'Hero Sprint Cycle', '21-gear Hero Sprint, new tyres last semester, lock included.', 'Vehicles & Cycles', 3200, 'sale', 'Good Condition', 'Hostel Complex', P.arjun, 28,
    { lastOffer: { buyerUid: P.riya.uid, buyerName: P.riya.name, price: 3000, meetupSpot: 'Hostel Complex gate', message: 'Can pick it up this evening.', createdAt: Date.now() - 4 * H } }],
  ['demo-ls-casio',     'Casio FX-991ES Plus', 'Barely used, box and manual included. Allowed in all exams.', 'Electronics', 600, 'sale', 'Like New', 'Lecture Halls (LH)', P.kabir, 15],
  ['demo-ls-labcoat',   'Lab Coat (Size M)', 'White cotton lab coat, washed and ironed. Used for one semester.', 'Clothing & Gear', 150, 'sale', 'Good Condition', 'Innovation & Computer Lab', P.ananya, 34],
  ['demo-ls-fridge',    'Mini Fridge for Rent', '45L mini fridge, rent per month. Perfect for a hostel room.', 'Electronics', 300, 'rent', 'Used - Works Fine', 'Hostel Complex', P.rahul, 48],
  ['demo-ls-dsnotes',   'Data Structures Handwritten Notes', 'Complete DSA notes with solved previous-year questions.', 'Books & Notes', 100, 'sale', 'Good Condition', 'Central Library', P.riya, 60],
  ['demo-ls-racket',    'Yonex Badminton Racket', 'Yonex Muscle Power 29, with cover. Grip replaced last month.', 'Clothing & Gear', 900, 'sale', 'Good Condition', 'Sports Complex', P.kabir, 75],
  // Sold to Riya, both sides confirmed, review not left yet: Riya can "Rate seller".
  ['demo-ls-arduino',   'Arduino Uno Starter Kit', 'Uno R3 with breadboard, jumper wires, sensors and a servo.', 'Electronics', 800, 'sale', 'Like New', 'Innovation & Computer Lab', P.meera, 100,
    { status: 'sold', soldAt: ago(70), reviewUnlocked: true, buyerUid: P.riya.uid, confirmations: { buyer: true, seller: true },
      lastOffer: { buyerUid: P.riya.uid, buyerName: P.riya.name, price: 750, meetupSpot: 'Innovation Lab', message: '', createdAt: Date.now() - 80 * H } }],
  // Suspicious listing, flagged below for the moderation queue.
  ['demo-ls-iphone',    'iPhone 15 Pro — ₹5000 urgent', 'Brand new sealed, no bill. Pay advance on UPI and I will deliver.', 'Electronics', 5000, 'sale', 'Like New', 'Hostel Complex', P.rahul, 3],
];
const PRICE = { sale: 'sale', free: 'free', rent: 'rent' };
for (const [id, title, description, category, price, priceType, condition, location, who, hours, extra = {}] of listings) {
  await db.doc(`listings/${id}`).set({
    title, description, category, keywords: kw(title, description),
    condition, priceType: PRICE[priceType], price, location, imageURLs: [],
    status: 'active', ...seller(who), createdAt: ago(hours),
    ...extra,
  });
}

// ── Chat: Arjun and Riya about the bottle ────────────────────────────────────
const chatId = `${[P.arjun.uid, P.riya.uid].sort().join('_')}_demo-lf-bottle-lost`.replace(/[^a-zA-Z0-9_-]/g, '_');
const thread = [
  [P.arjun, 'Hi! I think I found your bottle at desk 14 — lots of GitHub stickers?', 2],
  [P.riya, 'Yes!! That is mine. Does it have a small dent at the bottom?', 1.8],
  [P.arjun, 'It does. I can bring it to the library front desk at 4.', 1.6],
];
await db.doc(`chats/${chatId}`).set({
  participants: [P.arjun.uid, P.riya.uid],
  participantNames: { [P.arjun.uid]: P.arjun.name, [P.riya.uid]: P.riya.name },
  contextType: 'item', contextId: 'demo-lf-bottle-lost', contextTitle: 'Blue Stainless Water Bottle',
  lastMessage: thread.at(-1)[1], lastMessageAt: ago(thread.at(-1)[2]), createdAt: ago(2),
});
for (const [i, [who, text, hours]] of thread.entries()) {
  await db.doc(`chats/${chatId}/messages/demo-msg-${i + 1}`).set({
    senderUid: who.uid, senderName: who.name, text, sentAt: ago(hours),
  });
}

// ── Notifications (what the functions would have sent) ───────────────────────
const notes = [
  ['demo-n-1', P.riya,  'claim', 'Arjun Nair says they found your "Blue Stainless Water Bottle". Review the claim.', 'demo-lf-bottle-lost', 2],
  ['demo-n-2', P.meera, 'match', 'A possible match for "Casio fx-991EX Calculator" was found (90%).', 'demo-lf-calc-lost', 18],
  ['demo-n-3', P.arjun, 'match', 'A possible match for "Grey Dell Laptop Charger" was found.', 'demo-lf-charger-lost', 26],
  ['demo-n-4', P.arjun, 'deal',  'Riya Singh offered ₹3000 for your Hero Sprint Cycle.', 'demo-ls-cycle', 4],
  ['demo-n-5', P.meera, 'flag',  'Content flagged (Scam or fraud). 1 report(s).', 'demo-ls-iphone', 1],
];
for (const [id, who, type, message, contextRef, hours] of notes) {
  await db.doc(`notifications/${id}`).set({ userId: who.uid, type, message, contextRef, read: false, createdAt: ago(hours) });
}

// ── Moderation queue ────────────────────────────────────────────────────────
await db.doc('flags/demo-flag-iphone').set({
  reporterUid: P.arjun.uid, reporterName: P.arjun.name,
  targetType: 'listing', targetId: 'demo-ls-iphone', targetTitle: 'iPhone 15 Pro — ₹5000 urgent',
  reason: 'Suspected scam or fake report', details: 'Asks for UPI advance, price is far too low, no bill.',
  status: 'open', createdAt: ago(1),
});

// ── Campus zones (the adjacency the match score uses) ────────────────────────
const ZONES = [
  ['central-library', 'Central Library',           ['Lecture Halls (LH)', 'Innovation & Computer Lab']],
  ['lecture-halls',   'Lecture Halls (LH)',        ['Central Library', 'Central Mess & Canteen', 'Innovation & Computer Lab']],
  ['mess-canteen',    'Central Mess & Canteen',    ['Lecture Halls (LH)', 'Hostel Complex']],
  ['hostel-complex',  'Hostel Complex',            ['Central Mess & Canteen', 'Sports Complex']],
  ['sports-complex',  'Sports Complex',            ['Hostel Complex']],
  ['innovation-lab',  'Innovation & Computer Lab', ['Central Library', 'Lecture Halls (LH)']],
];
for (const [id, name, adjacent] of ZONES) await db.doc(`campusZones/${id}`).set({ name, adjacent });

console.log(`Seeded ${PROJECT}${removed ? ` (deleted ${removed} ${WIPE_ALL ? '' : 'old demo '}docs first)` : ''}:`);
console.log(`  ${reports.length} lost & found reports (3 matching pairs, 2 returned), 3 claims`);
console.log(`  ${listings.length} marketplace listings (1 open offer, 1 sold, 1 flagged)`);
console.log(`  1 chat thread, ${notes.length} notifications, 1 open flag, ${ZONES.length} campus zones`);
console.log(`  ${Object.keys(BG).length} background students + the 3 demo accounts' profiles`);
