import {
  collection,
  collectionGroup,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { COL } from '../types';

/**
 * Submit a claim on someone else's report.
 * - On a FOUND post it says "that's mine" and carries proof of ownership.
 * - On a LOST post it says "I found it" and carries where/when it was found.
 * The item title is copied onto the claim so "My claims" can show it without
 * reading every item.
 */
export async function submitClaim(item, { message, proof, meetingSpot }, user) {
  const itemId = item?.id;
  if (!itemId) throw new Error('Item ID is required.');
  if (!user?.uid) throw new Error('You must be signed in to submit a claim.');

  const claimsCol = collection(db, COL.lostFoundItems, itemId, 'claims');
  const docRef = await addDoc(claimsCol, {
    claimantUid: user.uid,
    claimantName: user.name || user.displayName || 'Campus Student',
    claimantDept: user.dept || '',
    claimantVerified: !!user.verified,
    itemTitle: item.title || '',
    itemType: item.type || '',
    message: message?.trim() || '',
    proof: proof?.trim() || '',
    meetingSpot: meetingSpot || 'Library Front Desk',
    status: 'pending', // 'pending' | 'approved' | 'rejected'
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/** Listen to all claims on an item. Only its poster (or a moderator) may. */
export function subscribeClaims(itemId, cb) {
  if (!itemId) return () => {};
  const claimsCol = collection(db, COL.lostFoundItems, itemId, 'claims');
  const q = query(claimsCol, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, (err) => {
    // eslint-disable-next-line no-console
    console.warn('[FoundIt] Failed to listen to claims:', err);
  });
}

/** Live count of claims still waiting on the poster — drives "Review claims (N)". */
export function subscribePendingCount(itemId, cb) {
  if (!itemId) return () => {};
  const q = query(
    collection(db, COL.lostFoundItems, itemId, 'claims'),
    where('status', '==', 'pending')
  );
  return onSnapshot(q, (snap) => cb(snap.size), () => cb(0));
}

/**
 * Every claim the signed-in student has made, across all items, newest first.
 * A collection-group query; needs the claims.claimantUid index in
 * firestore.indexes.json on a live project.
 */
export function subscribeMyClaims(uid, cb, onError = () => {}) {
  if (!uid) return () => {};
  const q = query(collectionGroup(db, 'claims'), where('claimantUid', '==', uid));
  return onSnapshot(q, (snap) => {
    const ms = (c) => (c.createdAt?.toMillis ? c.createdAt.toMillis() : 0);
    cb(
      snap.docs
        .map((d) => ({ id: d.id, itemId: d.ref.parent.parent.id, ...d.data() }))
        .sort((a, b) => ms(b) - ms(a))
    );
  }, onError);
}

/**
 * Approve or decline a claim.
 *
 * Declining writes only the claim. Approving ALSO marks the item returned, in
 * the same atomic batch, so the two can never disagree — and it works without
 * Cloud Functions. The rules only allow the item to go to 'resolved' if the
 * claim named in resolvedClaimId is approved once this batch lands.
 *
 * If onClaimResolved is deployed it will also run; it sets the same status and
 * additionally updates resolvedCount and trust, so there is no conflict.
 */
export async function resolveClaim(itemId, claimId, status) {
  const claimRef = doc(db, COL.lostFoundItems, itemId, 'claims', claimId);
  if (status !== 'approved') {
    await updateDoc(claimRef, { status });
    return;
  }
  const batch = writeBatch(db);
  batch.update(claimRef, { status: 'approved' });
  batch.update(doc(db, COL.lostFoundItems, itemId), {
    status: 'resolved',
    resolvedClaimId: claimId,
    resolvedAt: serverTimestamp(),
  });
  await batch.commit();
}
