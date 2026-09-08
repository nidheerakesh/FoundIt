// Seed the local Firestore emulator with demo data.
// Run the emulator first, then:  node scripts/seed.mjs
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collection, addDoc } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';
import { INITIAL_ITEMS } from '../src/data/mockData.js';

const app = initializeApp({ projectId: 'foundit-demo', apiKey: 'demo-key' });
const db = getFirestore(app);
const auth = getAuth(app);
connectFirestoreEmulator(db, '127.0.0.1', 8080);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
await signInAnonymously(auth); // rules require a signed-in user for writes

const kw = (...p) => [...new Set(p.join(' ').toLowerCase().match(/[a-z0-9]{3,}/g) || [])].slice(0, 12);
const LISTING_TO_PRICE = { Sell: 'sale', Giveaway: 'free', Rent: 'rent' };

// Space createdAt out so ordering looks natural.
let t = Date.now();
const next = () => (t -= 1000 * 60 * 37);

let lf = 0;
let ls = 0;
for (const it of INITIAL_ITEMS) {
  const base = {
    title: it.title,
    description: it.description,
    category: it.category,
    keywords: kw(it.title, it.description),
    location: it.location,
    imageURLs: [],
    reporterName: it.reporter,
    sellerName: it.reporter,
    dept: it.dept,
    verified: it.verified,
    trustScore: it.trustScore,
    createdAt: next(),
  };

  if (it.type === 'marketplace') {
    await addDoc(collection(db, 'listings'), {
      ...base,
      condition: it.condition || 'Good Condition',
      priceType: LISTING_TO_PRICE[it.listingType] || 'sale',
      price: it.price ?? 0,
      status: 'active',
      sellerUid: 'seed-user',
    });
    ls += 1;
  } else {
    await addDoc(collection(db, 'lostFoundItems'), {
      ...base,
      type: it.type,
      zoneId: it.location,
      status: 'open',
      postedBy: 'seed-user',
      matchedWith: [],
      matchScore: it.matchScore ?? null,
    });
    lf += 1;
  }
}

console.log(`Seeded ${lf} lost/found items + ${ls} listings into the emulator.`);
process.exit(0);
