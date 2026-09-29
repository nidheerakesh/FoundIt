// Seeds the demo feed into the real Firestore project from web/src/data/mockData.js.
//
// Why this exists: App.jsx only falls back to mock data while the live feed is
// empty, so the first real post would make all 14 demo cards disappear. Writing
// them as real documents keeps the feed populated and makes them claimable.
//
// Requires a service account key (never commit it):
//   Firebase Console → foundit-fcfcc → Project settings → Service accounts
//   → Generate new private key → save OUTSIDE this repo.
//
//   export GOOGLE_APPLICATION_CREDENTIALS=~/foundit-key.json
//   node scripts/seed-production.mjs           # write
//   node scripts/seed-production.mjs --wipe    # remove only seeded docs
//
// Doc IDs are deterministic (seed-item-1, …) so re-running updates in place
// instead of duplicating.
import { INITIAL_ITEMS } from '../web/src/data/mockData.js';

const PROJECT_ID = 'foundit-fcfcc';

const DRY = process.argv.includes('--dry');

if (!DRY) {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.error('FIRESTORE_EMULATOR_HOST is set — refusing to run, this script targets production.');
    process.exit(1);
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service account key path first.');
    process.exit(1);
  }
}

// --dry prints the documents instead of writing them, so the mapping can be
// checked without credentials, without touching the live project, and without
// firebase-admin installed. The SDK is therefore loaded only when writing.
let db = null;
let FieldValue = null;
if (!DRY) {
  const { initializeApp, applicationDefault } = await import('firebase-admin/app');
  const fs = await import('firebase-admin/firestore');
  FieldValue = fs.FieldValue;
  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  db = fs.getFirestore();
}

const write = async (col, id, data) => {
  if (DRY) { console.log(`${col}/${id}`, JSON.stringify(data)); return; }
  await db.collection(col).doc(id).set(data);
};

const PRICE_TYPE = { Sell: 'sale', Giveaway: 'free', Rent: 'rent' };

// Stable synthetic uid per reporter. Distinctness matters: suggestMatches skips
// candidates posted by the same user, so the lost/found pairs must not collide.
const uidFor = (name) => `seed-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

const keywords = (...parts) =>
  [...new Set(parts.join(' ').toLowerCase().match(/[a-z0-9]{3,}/g) || [])].slice(0, 12);

async function wipe() {
  let n = 0;
  for (const col of ['lostFoundItems', 'listings']) {
    const snap = await db.collection(col).get();
    for (const d of snap.docs) {
      if (d.id.startsWith('seed-')) { await d.ref.delete(); n++; }
    }
  }
  console.log(`Removed ${n} seeded docs.`);
}

async function seed() {
  let lf = 0, ls = 0;

  for (const item of INITIAL_ITEMS) {
    const id = `seed-${item.id}`;
    const poster = uidFor(item.reporter);
    const common = {
      title: item.title,
      description: item.description,
      category: item.category,
      keywords: keywords(item.title, item.description, ...(item.tags || [])),
      location: item.location,
      imageURLs: [],
      dept: item.dept || '',
      verified: !!item.verified,
      trustScore: item.trustScore ?? 50,
      createdAt: DRY ? '<serverTimestamp>' : FieldValue.serverTimestamp(),
      seeded: true,
    };

    if (item.type === 'marketplace') {
      await write('listings', id, {
        ...common,
        sellerUid: poster,
        sellerName: item.reporter,
        price: item.price ?? 0,
        priceType: PRICE_TYPE[item.listingType] || 'sale',
        condition: item.condition || '',
        status: 'active',
      });
      ls++;
    } else {
      await write('lostFoundItems', id, {
        ...common,
        type: item.type, // 'lost' | 'found'
        zoneId: item.location,
        postedBy: poster,
        reporterName: item.reporter,
        status: item.matchScore ? 'matched' : 'open',
        // Cloud Functions are not deployed (v2 needs Blaze), so suggestMatches
        // will not compute these live. Carried over from the demo data so the
        // match badges still render.
        matchScore: item.matchScore ?? null,
        matchedWith: [],
      });
      lf++;
    }
  }
  console.log(`Seeded ${lf} lost/found items and ${ls} listings.`);
}

const run = process.argv.includes('--wipe') ? wipe() : seed();
run.then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
