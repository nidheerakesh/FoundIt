// FoundIt Cloud Functions. OWNER: Nidhi (matching) + Shanid (trust/roles).
// v2 API. Runs in the Functions emulator locally; deploy for prod.
const { onDocumentWritten, onDocumentCreated } = require('firebase-functions/v2/firestore');
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
// Inputs to the match score. `status` is deliberately absent: this function
// writes it, so including it made every self-write look like a content edit and
// re-triggered a full recompute. Eligibility by status is checked separately.
const MATCH_FIELDS = ['type', 'category', 'zoneId', 'title', 'description'];
const AUTO_HIDE_THRESHOLD = 3; // flags before content auto-hides

// ---------------------------------------------------------------------------
// Internal helpers (server-authoritative — never trusted from the client)
// ---------------------------------------------------------------------------

/** Write a notification doc. Silent no-op if userId missing. */
async function notify(userId, type, message, contextRef = null) {
  if (!userId) return;
  await db.collection('notifications').add({
    userId, type, message, contextRef,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
}

/** Recompute a user's trust score from their profile counters (docs/SCORING.md §1). */
async function recomputeTrust(uid) {
  if (!uid) return null;
  const ref = db.collection('users').doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const u = snap.data();

  const accountAgeDays = u.createdAt?.toMillis ? (Date.now() - u.createdAt.toMillis()) / 86400000 : 0;
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
  return { score, tier };
}

// ---------------------------------------------------------------------------
// suggestMatches — lost <-> found matching (Nidhi, core)
// ---------------------------------------------------------------------------
exports.suggestMatches = onDocumentWritten('lostFoundItems/{itemId}', async (event) => {
  const after = event.data?.after;
  if (!after?.exists) return; // deleted
  const item = after.data();
  const itemId = event.params.itemId;

  if (item.status && !['open', 'matched'].includes(item.status)) return;

  // Loop guard: skip if this write only changed matchedWith/matchScore (our own update).
  const before = event.data?.before;
  if (before?.exists) {
    const b = before.data();
    const unchanged = MATCH_FIELDS.every((f) => JSON.stringify(b[f]) === JSON.stringify(item[f])) &&
      JSON.stringify(b.keywords || []) === JSON.stringify(item.keywords || []);
    if (unchanged) return;
  }

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

  const nextMatched = top.map((s) => s.id);
  const nextScore = top.length ? top[0].score : null;

  // This function writes `status`, which is itself a match input, so its own
  // write re-fires this trigger. Bail out when the recomputed result already
  // matches what is stored: the re-entrant pass becomes a no-op instead of a
  // second write (and, below, a duplicate notification).
  const storedScore = item.matchScore ?? null;
  const settled = JSON.stringify(item.matchedWith || []) === JSON.stringify(nextMatched)
    && storedScore === nextScore;
  if (settled) return;

  await after.ref.set(
    {
      matchedWith: nextMatched,
      matchScore: nextScore,
      status: top.length ? 'matched' : (item.status || 'open'),
    },
    { merge: true }
  );

  // Freshness comes from the doc we just read, not from `before`: on a
  // re-entrant pass `before` still holds the pre-write state, which made this
  // read as a new match twice and sent the poster two notifications.
  const hadMatch = storedScore != null;

  // Notify the poster when a fresh match appears (not on every recompute).
  if (top.length && !hadMatch) {
    await notify(item.postedBy, 'match', `A possible match for "${item.title}" was found (${top[0].score}%).`, itemId);
  }
});

// ---------------------------------------------------------------------------
// onClaimResolved — finder approves/rejects a claim
// ---------------------------------------------------------------------------
exports.onClaimResolved = onDocumentWritten('lostFoundItems/{itemId}/claims/{claimId}', async (event) => {
  const after = event.data?.after;
  if (!after?.exists) return;
  const claim = after.data();
  const before = event.data?.before?.data();
  if (before && before.status === claim.status) return; // status didn't change
  if (!['approved', 'rejected'].includes(claim.status)) return;

  const itemId = event.params.itemId;
  const itemRef = db.collection('lostFoundItems').doc(itemId);
  const itemSnap = await itemRef.get();
  if (!itemSnap.exists) return;
  const finderUid = itemSnap.data().postedBy;
  const claimantUid = claim.claimantUid;

  if (claim.status === 'approved') {
    await itemRef.set({ status: 'resolved', resolvedAt: FieldValue.serverTimestamp() }, { merge: true });
    if (finderUid) await db.collection('users').doc(finderUid).set({ resolvedCount: FieldValue.increment(1) }, { merge: true });
    await recomputeTrust(finderUid);
    await recomputeTrust(claimantUid);
    await notify(claimantUid, 'claim', `Your claim on "${itemSnap.data().title}" was approved. Arrange pickup in chat.`, itemId);
    await notify(finderUid, 'claim', `You approved a claim on "${itemSnap.data().title}". Nice one.`, itemId);
  } else {
    await notify(claimantUid, 'claim', `Your claim on "${itemSnap.data().title}" was declined.`, itemId);
  }
});

// ---------------------------------------------------------------------------
// onReviewCreated — recompute the ratee's rating aggregate + trust
// ---------------------------------------------------------------------------
exports.onReviewCreated = onDocumentCreated('reviews/{reviewId}', async (event) => {
  const review = event.data?.data();
  if (!review?.rateeUid) return;
  const rateeUid = review.rateeUid;

  const reviewsSnap = await db.collection('reviews').where('rateeUid', '==', rateeUid).get();
  let sum = 0;
  reviewsSnap.forEach((d) => { sum += Number(d.data().rating) || 0; });
  const count = reviewsSnap.size;
  const avg = count ? sum / count : 0;

  await db.collection('users').doc(rateeUid).set(
    { ratingAvg: avg, ratingCount: count, resolvedCount: FieldValue.increment(1) },
    { merge: true }
  );
  await recomputeTrust(rateeUid);
  await notify(rateeUid, 'review', `You received a ${review.rating}★ review.`, review.contextRef || null);
});

// ---------------------------------------------------------------------------
// confirmTransaction — two-party marketplace handshake
// ---------------------------------------------------------------------------
exports.confirmTransaction = onCall(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'sign in required');
  const { listingId } = req.data || {};
  if (!listingId) throw new HttpsError('invalid-argument', 'listingId required');

  const ref = db.collection('listings').doc(listingId);
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'listing not found');
    const l = snap.data();
    const sellerUid = l.sellerUid;
    const buyerUid = l.lastOffer?.buyerUid;
    if (!buyerUid) throw new HttpsError('failed-precondition', 'no buyer offer to confirm');
    if (uid !== sellerUid && uid !== buyerUid) throw new HttpsError('permission-denied', 'not a party to this deal');

    const confirmations = { ...(l.confirmations || {}) };
    if (uid === sellerUid) confirmations.seller = true;
    if (uid === buyerUid) confirmations.buyer = true;

    const bothConfirmed = confirmations.seller && confirmations.buyer;
    tx.set(ref, {
      confirmations,
      ...(bothConfirmed
        ? { status: 'sold', soldAt: FieldValue.serverTimestamp(), reviewUnlocked: true, buyerUid }
        : {}),
    }, { merge: true });
    return { sellerUid, buyerUid, bothConfirmed };
  });

  if (result.bothConfirmed) {
    await db.collection('users').doc(result.sellerUid).set({ resolvedCount: FieldValue.increment(1) }, { merge: true });
    await recomputeTrust(result.sellerUid);
    await notify(result.buyerUid, 'deal', 'Deal confirmed by both sides — you can now leave a review.', listingId);
    await notify(result.sellerUid, 'deal', 'Deal confirmed by both sides. Item marked sold.', listingId);
    return { status: 'sold' };
  }
  const other = uid === result.sellerUid ? result.buyerUid : result.sellerUid;
  await notify(other, 'deal', 'The other party confirmed the deal — confirm to finish.', listingId);
  return { status: 'pending' };
});

// ---------------------------------------------------------------------------
// onFlagCreated — auto-hide over threshold + notify moderators
// ---------------------------------------------------------------------------
const TARGET_COLLECTION = { item: 'lostFoundItems', listing: 'listings', user: 'users', chat: 'chats' };

exports.onFlagCreated = onDocumentCreated('flags/{flagId}', async (event) => {
  const flag = event.data?.data();
  if (!flag?.targetId || !flag?.targetType) return;
  const col = TARGET_COLLECTION[flag.targetType];
  if (!col) return;

  const targetRef = db.collection(col).doc(flag.targetId);
  const targetSnap = await targetRef.get();
  if (!targetSnap.exists) return;
  const newCount = (targetSnap.data().flagCount || 0) + 1;

  const patch = { flagCount: FieldValue.increment(1) };
  if (newCount >= AUTO_HIDE_THRESHOLD && col !== 'users') patch.status = 'hidden';
  await targetRef.set(patch, { merge: true });

  // Notify moderators + admins.
  const mods = await db.collection('users').where('role', 'in', ['moderator', 'admin']).get();
  await Promise.all(mods.docs.map((m) =>
    notify(m.id, 'flag', `Content flagged (${flag.reason}). ${newCount} report(s).`, flag.targetId)
  ));
});

// ---------------------------------------------------------------------------
// Callables: recomputeTrustScore, setUserRole, resolveFlag
// ---------------------------------------------------------------------------
exports.recomputeTrustScore = onCall(async (req) => {
  const uid = req.data?.uid || req.auth?.uid;
  if (!uid) throw new HttpsError('invalid-argument', 'uid required');
  const res = await recomputeTrust(uid);
  if (!res) throw new HttpsError('not-found', 'user not found');
  return { trustScore: res.score, trustTier: res.tier };
});

exports.setUserRole = onCall(async (req) => {
  if (req.auth?.token?.role !== 'admin') throw new HttpsError('permission-denied', 'admin only');
  const { uid, role } = req.data || {};
  if (!uid || !['user', 'moderator', 'admin'].includes(role)) {
    throw new HttpsError('invalid-argument', 'uid and valid role required');
  }
  await getAuth().setCustomUserClaims(uid, { role });
  await db.collection('users').doc(uid).set({ role }, { merge: true });
  return { uid, role };
});

exports.resolveFlag = onCall(async (req) => {
  const role = req.auth?.token?.role;
  if (role !== 'moderator' && role !== 'admin') throw new HttpsError('permission-denied', 'moderator only');
  const { flagId, action } = req.data || {};
  if (!flagId) throw new HttpsError('invalid-argument', 'flagId required');

  const flagRef = db.collection('flags').doc(flagId);
  const flagSnap = await flagRef.get();
  if (!flagSnap.exists) throw new HttpsError('not-found', 'flag not found');
  const flag = flagSnap.data();

  await flagRef.set({ status: 'resolved', resolvedBy: req.auth.uid, resolvedAt: FieldValue.serverTimestamp() }, { merge: true });

  if (action === 'strike') {
    // Find the offender = owner of the flagged target.
    const col = TARGET_COLLECTION[flag.targetType];
    if (col && col !== 'users') {
      const t = await db.collection(col).doc(flag.targetId).get();
      const owner = t.exists ? (t.data().postedBy || t.data().sellerUid) : null;
      if (owner) {
        await db.collection('users').doc(owner).set({ strikes: FieldValue.increment(1) }, { merge: true });
        await recomputeTrust(owner);
        await notify(owner, 'strike', 'You received a moderation strike. Repeated strikes suspend your account.', flag.targetId);
      }
    } else if (flag.targetType === 'user') {
      await db.collection('users').doc(flag.targetId).set({ strikes: FieldValue.increment(1) }, { merge: true });
      await recomputeTrust(flag.targetId);
    }
  }
  return { flagId, status: 'resolved' };
});
