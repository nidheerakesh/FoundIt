// FoundIt Cloud Functions. OWNER: Nidhi (matching) + Shanid (trust/roles).
// v2 API. Runs in the Functions emulator locally; deploy for prod.
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { matchScore, trustScore } = require('./src/scoring');

initializeApp();
setGlobalOptions({ region: 'us-central1', maxInstances: 10 });
const db = getFirestore();

const MATCH_THRESHOLD = 50; // surface candidates at/above this (tuned to seed data; see SCORING.md)
const MATCH_FIELDS = ['type', 'category', 'zoneId', 'status', 'title', 'description'];

/**
 * suggestMatches — on any lostFoundItems write, recompute this item's best
 * lost<->found matches and write matchedWith + matchScore back onto it.
 * OWNER: Nidhi (core, hand-written).
 */
exports.suggestMatches = onDocumentWritten('lostFoundItems/{itemId}', async (event) => {
  const after = event.data?.after;
  if (!after?.exists) return; // deleted
  const item = after.data();
  const itemId = event.params.itemId;

  // Skip resolved/claimed items — no longer looking for matches.
  if (item.status && !['open', 'matched'].includes(item.status)) return;

  // Loop guard: if this write only changed matchedWith/matchScore (i.e. our own
  // previous update), the matching-relevant fields are unchanged — bail out.
  const before = event.data?.before;
  if (before?.exists) {
    const b = before.data();
    const unchanged = MATCH_FIELDS.every((f) => JSON.stringify(b[f]) === JSON.stringify(item[f])) &&
      JSON.stringify(b.keywords || []) === JSON.stringify(item.keywords || []);
    if (unchanged) return;
  }

  // Candidates: opposite type, still active, not by the same poster.
  const oppositeType = item.type === 'lost' ? 'found' : 'lost';
  const snap = await db.collection('lostFoundItems')
    .where('type', '==', oppositeType)
    .where('status', 'in', ['open', 'matched'])
    .get();

  const scored = [];
  for (const doc of snap.docs) {
    if (doc.id === itemId) continue;
    const cand = doc.data();
    if (cand.postedBy && cand.postedBy === item.postedBy) continue;
    const score = matchScore(item, cand);
    if (score >= MATCH_THRESHOLD) scored.push({ id: doc.id, score });
  }
  scored.sort((a, b) => b.score - a.score);

  const top = scored.slice(0, 5);
  await after.ref.set(
    {
      matchedWith: top.map((s) => s.id),
      matchScore: top.length ? top[0].score : null,
      status: top.length ? 'matched' : (item.status || 'open'),
    },
    { merge: true }
  );
});

/**
 * recomputeTrustScore — callable helper to recompute a user's trust score from
 * their profile counters. OWNER: Shanid. (Wire to review/claim triggers later.)
 */
exports.recomputeTrustScore = onCall(async (req) => {
  const uid = req.data?.uid || req.auth?.uid;
  if (!uid) throw new HttpsError('invalid-argument', 'uid required');

  const ref = db.collection('users').doc(uid);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'user not found');
  const u = snap.data();

  const accountAgeDays = u.createdAt?.toMillis
    ? (Date.now() - u.createdAt.toMillis()) / 86400000
    : 0;

  const { score, tier, breakdown } = trustScore({
    ratingAvg: u.ratingAvg,
    ratingCount: u.ratingCount,
    resolvedCount: u.resolvedCount,
    verified: u.verified,
    medianReplyMins: u.medianReplyMins,
    accountAgeDays,
    strikes: u.strikes,
    suspended: u.status === 'suspended' || u.status === 'banned',
  });

  await ref.set({ trustScore: score, trustTier: tier, trustBreakdown: breakdown }, { merge: true });
  return { trustScore: score, trustTier: tier };
});

/**
 * setUserRole — admin-only callable that promotes/demotes a user.
 * Sets a custom claim (used by security rules) AND the users doc role.
 * OWNER: Shanid.
 */
exports.setUserRole = onCall(async (req) => {
  const callerRole = req.auth?.token?.role;
  if (callerRole !== 'admin') throw new HttpsError('permission-denied', 'admin only');

  const { uid, role } = req.data || {};
  if (!uid || !['user', 'moderator', 'admin'].includes(role)) {
    throw new HttpsError('invalid-argument', 'uid and valid role required');
  }

  await getAuth().setCustomUserClaims(uid, { role });
  await db.collection('users').doc(uid).set({ role }, { merge: true });
  return { uid, role };
});
