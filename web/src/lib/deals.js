import {
  doc,
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import { COL } from '../types';

/** Submit a marketplace deal handshake / offer. */
export async function makeDealOffer(listingId, { offerPrice, meetupSpot, message }, buyer) {
  if (!listingId) throw new Error('Listing ID required.');
  if (!buyer?.uid) throw new Error('Sign in to propose a deal.');

  // Create an entry in chats or directly notify seller
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

/** Mark listing as sold and completed. */
export async function markListingSold(listingId) {
  const listingRef = doc(db, COL.listings, listingId);
  await updateDoc(listingRef, {
    status: 'sold',
    soldAt: serverTimestamp(),
  });
}

/** Submit a transaction review for a student seller. */
export async function submitReview({ listingId, sellerUid, rating, comment }, rater) {
  if (!rater?.uid) throw new Error('Must be signed in to submit a review.');
  if (rater.uid === sellerUid) throw new Error('Cannot review yourself.');

  // Write review doc
  const reviewsCol = collection(db, COL.reviews);
  await addDoc(reviewsCol, {
    raterUid: rater.uid,
    raterName: rater.name || 'Campus Student',
    rateeUid: sellerUid,
    rating: Number(rating) || 5,
    comment: comment?.trim() || '',
    contextRef: listingId,
    createdAt: serverTimestamp(),
  });

  // Increment seller rating count and resolved count on profile
  try {
    const sellerRef = doc(db, COL.users, sellerUid);
    await updateDoc(sellerRef, {
      ratingCount: increment(1),
      resolvedCount: increment(1),
      trustScore: increment(2), // Successful trade bonus
    });
  } catch (err) {
    // If user doc doesn't exist or permissions prevent update, don't fail review submission
    // eslint-disable-next-line no-console
    console.warn('[FoundIt] Note: user trust increment bypassed:', err);
  }
}
