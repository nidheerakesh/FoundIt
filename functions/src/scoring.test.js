// Unit tests for the pure scoring logic. Run: cd functions && node --test
const { test } = require('node:test');
const assert = require('node:assert');
const { jaccard, matchScore, trustScore, tierFor } = require('./scoring');

test('jaccard overlap', () => {
  assert.strictEqual(jaccard(['a', 'b'], ['a', 'b']), 1);
  assert.strictEqual(jaccard(['a'], ['b']), 0);
  assert.strictEqual(jaccard(['a', 'b'], ['b', 'c']), 1 / 3);
  assert.strictEqual(jaccard([], []), 0);
});

test('matchScore: identical lost/found pair scores high', () => {
  const now = Date.now();
  const lost = { type: 'lost', category: 'Accessories', keywords: ['blue', 'bottle', 'sticker'], zoneId: 'library', createdAt: now };
  const found = { type: 'found', category: 'Accessories', keywords: ['blue', 'bottle', 'sticker'], zoneId: 'library', createdAt: now };
  // category .30 + keywords .30 + zone .20 + recency .10 + complementarity .10 = 100
  assert.strictEqual(matchScore(lost, found), 100);
});

test('matchScore: same type never complements, different category/zone lowers score', () => {
  const now = Date.now();
  const a = { type: 'lost', category: 'Books', keywords: ['math'], zoneId: 'hostel', createdAt: now };
  const b = { type: 'lost', category: 'Electronics', keywords: ['phone'], zoneId: 'library', createdAt: now };
  // only recency contributes (.10) → 10
  assert.strictEqual(matchScore(a, b), 10);
});

test('matchScore: an adjacent zone scores half of an exact zone', () => {
  const now = Date.now();
  // SCORING.md §2.1 — zoneProximity: same zone 1.0, adjacent 0.5, else 0.
  // The adjacency map comes from campusZones (see scripts/seed-zones.mjs).
  const adjacency = { library: ['study-block'], 'study-block': ['library'] };
  const lost = { type: 'lost', category: 'Books', keywords: ['notes'], zoneId: 'library', createdAt: now };
  const base = { type: 'found', category: 'Books', keywords: ['notes'], createdAt: now };

  const same = matchScore(lost, { ...base, zoneId: 'library' }, adjacency);
  const adjacent = matchScore(lost, { ...base, zoneId: 'study-block' }, adjacency);
  const unrelated = matchScore(lost, { ...base, zoneId: 'sports-ground' }, adjacency);

  assert.strictEqual(same, 100);      // .30 + .30 + .20 + .10 + .10
  assert.strictEqual(adjacent, 90);   // zone term halved: .20 → .10
  assert.strictEqual(unrelated, 80);  // zone term drops out entirely

  // Without the map, an adjacent zone is indistinguishable from an unrelated one.
  assert.strictEqual(matchScore(lost, { ...base, zoneId: 'study-block' }), unrelated);
});

test('trustScore: new verified user sits near neutral', () => {
  const r = trustScore({ verified: true, ratingCount: 0, resolvedCount: 0, accountAgeDays: 0 });
  // 50 baseline + 10 verification, rating damped to prior (~+10) → ~70
  assert.ok(r.score >= 60 && r.score <= 75, `got ${r.score}`);
  assert.strictEqual(r.tier, tierFor(r.score));
});

test('trustScore: strikes drop the score', () => {
  const clean = trustScore({ verified: true, ratingAvg: 5, ratingCount: 20, resolvedCount: 20, accountAgeDays: 200 });
  const struck = trustScore({ verified: true, ratingAvg: 5, ratingCount: 20, resolvedCount: 20, accountAgeDays: 200, strikes: 2 });
  assert.ok(struck.score < clean.score);
});

test('trustScore: bounded 0..100', () => {
  const hi = trustScore({ verified: true, ratingAvg: 5, ratingCount: 999, resolvedCount: 9999, accountAgeDays: 9999, medianReplyMins: 1 });
  const lo = trustScore({ verified: false, ratingAvg: 1, ratingCount: 999, resolvedCount: 0, strikes: 10, suspended: true });
  assert.ok(hi.score <= 100 && lo.score >= 0);
});
