import { doc, collection, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
export async function confirmDeal(listingId) {
  const call = httpsCallable(functions, 'confirmTransaction');
  const res = await call({ listingId });
  return res.data;
}

/**
 * Submit a transaction review. Only writes the review doc — the onReviewCreated
 * Cloud Function recomputes the ratee's ratingAvg/ratingCount/resolvedCount and
 * trust score (server-authoritative; no client-side trust math).
 */
export async function submitReview({ listingId, sellerUid, rating, comment }, rater) {
  if (!rater?.uid) throw new Error('Must be signed in to submit a review.');
  if (rater.uid === sellerUid) throw new Error('Cannot review yourself.');

  await addDoc(collection(db, COL.reviews), {
    raterUid: rater.uid,
    raterName: rater.name || 'Campus Student',
    rateeUid: sellerUid,
    rating: Number(rating) || 5,
    comment: comment?.trim() || '',
    contextRef: listingId,
    createdAt: serverTimestamp(),
  });
}
