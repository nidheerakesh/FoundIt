// Seeds the campusZones reference collection.
//
// Why this exists: docs/SCORING.md §2.1 defines zoneProximity as "same zone 1.0,
// adjacent 0.5" using "an admin-defined adjacency map of campusZones". The
// collection was declared in firestore.rules and types.js but never populated,
// so suggestMatches only ever scored exact-zone matches and the 0.5 branch was
// dead. These are the six zones PostModal offers (CAMPUS_LOCATIONS), which is
// what real posts write into `zoneId`.
//
// campusZones is read-public / write-false in the rules, so it can only be
// written with the Admin SDK — that is what makes it "admin-defined" (FR-24).
//
//   export GOOGLE_APPLICATION_CREDENTIALS=~/foundit-key.json
//   node scripts/seed-zones.mjs --dry     # print, no credentials needed
//   node scripts/seed-zones.mjs           # write

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

// `name` must match the CAMPUS_LOCATIONS strings in web/src/data/mockData.js
// exactly: items store that label in `zoneId`, and loadZoneAdjacency keys the
// map by name. Adjacency is walking distance and must be symmetric — a pair
// listed on one side only would score 0.5 in one direction and 0 in the other.
const ZONES = [
  { id: 'central-library',   name: 'Central Library',           adjacent: ['Lecture Halls (LH)', 'Innovation & Computer Lab'] },
  { id: 'lecture-halls',     name: 'Lecture Halls (LH)',        adjacent: ['Central Library', 'Central Mess & Canteen', 'Innovation & Computer Lab'] },
  { id: 'mess-canteen',      name: 'Central Mess & Canteen',    adjacent: ['Lecture Halls (LH)', 'Hostel Complex'] },
  { id: 'hostel-complex',    name: 'Hostel Complex',            adjacent: ['Central Mess & Canteen', 'Sports Complex'] },
  { id: 'sports-complex',    name: 'Sports Complex',            adjacent: ['Hostel Complex'] },
  { id: 'innovation-lab',    name: 'Innovation & Computer Lab', adjacent: ['Central Library', 'Lecture Halls (LH)'] },
];

// Catch a one-sided edge here rather than as a puzzling asymmetric match score.
const byName = new Map(ZONES.map((z) => [z.name, z]));
let broken = 0;
for (const z of ZONES) {
  for (const other of z.adjacent) {
    const peer = byName.get(other);
    if (!peer) { console.error(`✗ ${z.name} → unknown zone "${other}"`); broken++; }
    else if (!peer.adjacent.includes(z.name)) { console.error(`✗ ${z.name} → ${other} is not mutual`); broken++; }
  }
}
if (broken) { console.error(`${broken} adjacency problem(s); nothing written.`); process.exit(1); }

let db = null;
if (!DRY) {
  const { initializeApp, applicationDefault } = await import('firebase-admin/app');
  const fs = await import('firebase-admin/firestore');
  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  db = fs.getFirestore();
}

for (const { id, name, adjacent } of ZONES) {
  const data = { name, adjacent };
  if (DRY) console.log(`campusZones/${id}`, JSON.stringify(data));
  else await db.collection('campusZones').doc(id).set(data);
}

console.log(`${DRY ? 'Would seed' : 'Seeded'} ${ZONES.length} campus zones.`);
