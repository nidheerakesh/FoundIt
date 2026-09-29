// Seeds the running Firestore emulator with the deterministic feed that
// web/test/ui.test.mjs asserts against. Emulator only — it refuses to run
// without FIRESTORE_EMULATOR_HOST pointing at localhost.
//
//   node scripts/seed-emulator.mjs
//
// There is no package.json at the repo root, so firebase-admin is resolved
// from web/, which already carries it as a devDependency.
import { createRequire } from 'node:module';

process.env.GCLOUD_PROJECT = 'foundit-demo';
process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
if (!/^(127\.0\.0\.1|localhost|\[::1\]):/.test(process.env.FIRESTORE_EMULATOR_HOST)) {
  console.error('FIRESTORE_EMULATOR_HOST must point at a local emulator; refusing to run.');
  process.exit(1);
}

const require = createRequire(new URL('../web/package.json', import.meta.url));
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
initializeApp({ projectId: 'foundit-demo' });
const db = getFirestore();

const now = Date.now();
const kw = (...p) => [...new Set(p.join(' ').toLowerCase().match(/[a-z0-9]{3,}/g) || [])].slice(0, 12);

const items = [
  ['lost',  'Blue Stainless Water Bottle', 'Dark blue bottle covered in tech stickers, left near study desk 14.', 'Accessories', 'Central Library', 'uid-riya',  'Riya Singh', 'CSE', 82],
  ['found', 'Blue Metal Bottle with Stickers', 'Found a blue steel bottle with stickers at the library desk.',    'Accessories', 'Central Library', 'uid-arjun', 'Arjun Nair', 'ECE', 74],
  ['lost',  'Casio fx-991EX Calculator',   'Black Casio scientific calculator, name written on the back.',        'Electronics', 'Lecture Halls (LH)', 'uid-meera', 'Meera Das', 'CSE', 68],
  ['found', 'Campus ID Card',              'Student ID card found near the mess counter after lunch.',            'ID & Cards',  'Central Mess & Canteen', 'uid-arjun', 'Arjun Nair', 'ECE', 74],
];
const listings = [
  ['Engineering Maths Textbook Set', 'Three semesters of maths textbooks, lightly used.', 'Books & Notes', 450, 'sale', 'Good', 'uid-meera', 'Meera Das'],
  ['Hostel Study Lamp',              'LED desk lamp, works perfectly. Giving away on move-out.', 'Clothing & Gear', 0, 'free', 'Fair', 'uid-riya', 'Riya Singh'],
];

for (const [uid, name, dept, trust] of [['uid-riya','Riya Singh','CSE',82],['uid-arjun','Arjun Nair','ECE',74],['uid-meera','Meera Das','CSE',68]]) {
  await db.doc(`users/${uid}`).set({ name, dept, trustScore: trust, trustTier: 'trusted', verified: true, createdAt: new Date(now - 90*86400000) });
}

let i = 0;
for (const [type, title, description, category, zone, uid, reporter, dept, trust] of items) {
  await db.doc(`lostFoundItems/ui-${++i}`).set({
    type, title, description, category, keywords: kw(title, description),
    zoneId: zone, location: zone, imageURLs: [], status: 'open',
    postedBy: uid, reporterName: reporter, dept, verified: true, trustScore: trust,
    createdAt: new Date(now - i * 3600000),
  });
}
let j = 0;
for (const [title, description, category, price, priceType, condition, uid, seller] of listings) {
  await db.doc(`listings/ui-l${++j}`).set({
    title, description, category, price, priceType, condition,
    keywords: kw(title, description), location: 'Hostel Complex', imageURLs: [],
    status: 'active', sellerUid: uid, sellerName: seller, dept: 'CSE', verified: true, trustScore: 70,
    createdAt: new Date(now - j * 7200000),
  });
}
console.log(`seeded ${items.length} reports + ${listings.length} listings`);
