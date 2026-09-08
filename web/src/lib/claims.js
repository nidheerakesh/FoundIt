import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { COL } from '../types';

/** Submit a verification claim for a lost or found item. */
export async function submitClaim(itemId, { message, proof, meetingSpot }, user) {
  if (!itemId) throw new Error('Item ID is required.');
  if (!user?.uid) throw new Error('You must be signed in to submit a claim.');

  const claimsCol = collection(db, COL.lostFoundItems, itemId, 'claims');
  const docRef = await addDoc(claimsCol, {
    claimantUid: user.uid,
    claimantName: user.name || user.displayName || 'Campus Student',
    claimantDept: user.dept || '',
    claimantVerified: !!user.verified,
    message: message?.trim() || '',
    proof: proof?.trim() || '',
    meetingSpot: meetingSpot || 'Library Front Desk',
    status: 'pending', // 'pending' | 'approved' | 'rejected'
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/** Listen to all claims submitted for a specific item. */
export function subscribeClaims(itemId, cb) {
  if (!itemId) return () => {};
  const claimsCol = collection(db, COL.lostFoundItems, itemId, 'claims');
  const q = query(claimsCol, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const claims = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    cb(claims);
  }, (err) => {
    // eslint-disable-next-line no-console
    console.warn('[FoundIt] Failed to listen to claims:', err);
  });
}

/** Resolve a claim (Approve or Reject). */
export async function resolveClaim(itemId, claimId, status) {
  const claimRef = doc(db, COL.lostFoundItems, itemId, 'claims', claimId);
  await updateDoc(claimRef, { status });

  if (status === 'approved') {
    // Mark the lost & found item as claimed/resolved
    const itemRef = doc(db, COL.lostFoundItems, itemId);
    await updateDoc(itemRef, {
      status: 'resolved',
      resolvedAt: serverTimestamp(),
    });
  }
}
