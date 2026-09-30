import { doc, setDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import { COL } from '../types';

/** Submit a marketplace deal offer — records the buyer's offer on the listing. */
export async function makeDealOffer(listingId, { offerPrice, meetupSpot, message }, buyer) {
  if (!listingId) throw new Error('Listing ID required.');
  if (!buyer?.uid) throw new Error('Sign in to propose a deal.');

  const listingRef = doc(db, COL.listings, listingId);
  await updateDoc(listingRef, {
    lastOffer: {
      buyerUid: buyer.uid,
      buyerName: buyer.name || 'Student',
      price: offerPrice,
      meetupSpot,
      message,
      createdAt: Date.now(),
    },
  });
}

/**
 * Confirm the deal handshake. Calls the confirmTransaction Cloud Function, which
 * records this party's confirmation and, once BOTH sides confirm, marks the
 * listing sold, unlocks the review, and recomputes seller trust (server-owned).
 * Returns { status: 'pending' | 'sold' }.
 */
export async function confirmDeal(listingId, currentUid) {
  try {
    const call = httpsCallable(functions, 'confirmTransaction');
    const res = await call({ listingId });
    return res.data;
  } catch (err) {
    // Cloud Functions v2 needs the Blaze plan, so on a free-tier project the
    // callable simply is not there. Fall back to doing the handshake from the
    // client — the same graceful-degradation pattern the matching code uses.
    // Security rules still enforce the two-party property: each side may write
    // only its own confirmation, and the flip to sold needs both already
    // stored, so this cannot be short-circuited in one write.
    if (!isMissingFunction(err)) throw err;
    return confirmDealLocally(listingId, currentUid);
  }
}

function isMissingFunction(err) {
  return ['functions/not-found', 'functions/internal', 'functions/unavailable'].includes(err?.code);
}

/** Two writes, deliberately: record my confirmation, then flip if both are in. */
async function confirmDealLocally(listingId, currentUid) {
  if (!currentUid) throw new Error('Sign in to confirm the deal.');
  const ref = doc(db, COL.listings, listingId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Listing not found.');

  const l = snap.data();
  const buyerUid = l.lastOffer?.buyerUid;
  if (!buyerUid) throw new Error('No buyer offer to confirm yet.');
  const isSeller = currentUid === l.sellerUid;
  const isBuyer = currentUid === buyerUid;
  if (!isSeller && !isBuyer) throw new Error('You are not a party to this deal.');

  const confirmations = { ...(l.confirmations || {}) };
  confirmations[isSeller ? 'seller' : 'buyer'] = true;
  await updateDoc(ref, { confirmations });

  if (!(confirmations.seller && confirmations.buyer)) return { status: 'pending' };

  await updateDoc(ref, {
    status: 'sold',
    soldAt: serverTimestamp(),
    reviewUnlocked: true,
    buyerUid,
  });
  return { status: 'sold' };
}

/**
 * Submit a transaction review. Only writes the review doc — the onReviewCreated
 * Cloud Function recomputes the ratee's ratingAvg/ratingCount/resolvedCount and
 * trust score (server-authoritative; no client-side trust math).
 */
export async function submitReview({ listingId, sellerUid, rating, comment }, rater) {
  if (!rater?.uid) throw new Error('Must be signed in to submit a review.');
  if (rater.uid === sellerUid) throw new Error('Cannot review yourself.');

  // One review per buyer per deal: a deterministic id means a second attempt
  // is an update, which the rules refuse (reviews are create-only).
  await setDoc(doc(db, COL.reviews, `${listingId}_${rater.uid}`), {
    raterUid: rater.uid,
    raterName: rater.name || 'Campus Student',
    rateeUid: sellerUid,
    rating: Number(rating) || 5,
    comment: comment?.trim() || '',
    contextRef: listingId,
    createdAt: serverTimestamp(),
  });
}
