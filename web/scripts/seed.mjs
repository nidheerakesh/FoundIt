// Seed the local emulator with demo data — uses the ADMIN SDK, which bypasses
// security rules (the correct way to seed). Start the emulator first, then:
//   node scripts/seed.mjs
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { INITIAL_ITEMS } from '../src/data/mockData.js';

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';

initializeApp({ projectId: 'foundit-demo' });
const db = getFirestore();
const auth = getAuth();

// Verified demo student account for instant testing.
let demoUid = 'seed-user';
try {
  const rec = await auth.createUser({ email: 'demo@campus.edu', password: 'password123', emailVerified: true, displayName: 'Nidhi Rakesh' });
  demoUid = rec.uid;
  console.log('Seeded demo account: demo@campus.edu / password123');
} catch (e) {
  try {
    demoUid = (await auth.getUserByEmail('demo@campus.edu')).uid;
    await auth.updateUser(demoUid, { emailVerified: true });
  } catch { /* ignore */ }
  console.log('Demo user already exists:', e.code || e.message);
}

await db.collection('users').doc(demoUid).set({
  name: 'Nidhi Rakesh', email: 'demo@campus.edu', hostelOrDept: 'CSE', photoURL: '',
  role: 'user', status: 'active', verified: true,
  ratingAvg: 4.9, ratingCount: 14, resolvedCount: 7, trustScore: 82, trustTier: 'reliable',
  createdAt: Date.now(),
});

const kw = (...p) => [...new Set(p.join(' ').toLowerCase().match(/[a-z0-9]{3,}/g) || [])].slice(0, 12);
const LISTING_TO_PRICE = { Sell: 'sale', Giveaway: 'free', Rent: 'rent' };

let t = Date.now();
const next = () => (t -= 1000 * 60 * 37);

let lf = 0;
let ls = 0;
for (const it of INITIAL_ITEMS) {
  const base = {
    title: it.title, description: it.description, category: it.category,
    keywords: kw(it.title, it.description), location: it.location, imageURLs: [],
    reporterName: it.reporter, sellerName: it.reporter, dept: it.dept,
    verified: it.verified, trustScore: it.trustScore, createdAt: next(),
  };

  if (it.type === 'marketplace') {
    await db.collection('listings').add({
      ...base, condition: it.condition || 'Good Condition',
      priceType: LISTING_TO_PRICE[it.listingType] || 'sale', price: it.price ?? 0,
      status: 'active', sellerUid: demoUid,
    });
    ls += 1;
  } else {
    await db.collection('lostFoundItems').add({
      ...base, type: it.type, zoneId: it.location, status: 'open',
      postedBy: demoUid, matchedWith: [], matchScore: it.matchScore ?? null,
    });
    lf += 1;
  }
}

console.log(`Seeded ${lf} lost/found items + ${ls} listings into the emulator.`);
process.exit(0);
