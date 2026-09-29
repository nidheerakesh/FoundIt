// Moderation data layer — the flag queue and the resolve action.
// Reads are gated by firestore.rules (`allow read: if isMod()`), so a normal
// user subscribing here simply gets a permission error rather than data.
// The resolve action is a Cloud Function: clients must never write flag
// outcomes, strikes or trust directly.
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import { COL } from '../types';

/** Human labels for the targetType values onFlagCreated understands. */
export const TARGET_LABEL = {
  item: 'Lost & found report',
  listing: 'Marketplace listing',
  user: 'User profile',
  chat: 'Chat message',
  review: 'Review',
};

/**
 * Live-subscribe to unresolved flags, newest first.
 * @returns unsubscribe function
 */
export function subscribeOpenFlags(cb, onError = () => {}) {
  const q = query(
    collection(db, COL.flags),
    where('status', '==', 'open'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => {
      // eslint-disable-next-line no-console
      console.warn('[FoundIt] flag queue listen failed:', err.code || err.message);
      onError(err);
    }
  );
}

/**
 * Resolve a flag. `action: 'strike'` also increments the offender's strike
 * count and recomputes their trust score, server-side.
 */
export async function resolveFlag(flagId, action = 'dismiss') {
  const call = httpsCallable(functions, 'resolveFlag');
  const res = await call({ flagId, action });
  return res.data;
}
