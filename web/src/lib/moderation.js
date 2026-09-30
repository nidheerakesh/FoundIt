// Moderation data layer — the flag queue and the resolve action.
// Reads are gated by firestore.rules (`allow read: if isMod()`), so a normal
// user subscribing here simply gets a permission error rather than data.
// The resolve action prefers the resolveFlag Cloud Function, which also owns
// strikes and trust (clients never write those). Without Blaze it falls back to
// what the rules let a moderator do directly: close the flag and, for a
// strike, remove the offending post.
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
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

const TARGET_COLLECTION = { item: COL.lostFoundItems, listing: COL.listings };

/**
 * Resolve a flag. 'dismiss' closes it. 'strike' also removes the flagged post
 * and, when Cloud Functions are deployed, adds a strike to its owner and
 * recomputes their trust. Returns { struck } — false when only the post could
 * be removed because the function is not deployed.
 */
export async function resolveFlag(flag, action = 'dismiss', moderatorUid = null) {
  let struck = false;
  try {
    await httpsCallable(functions, 'resolveFlag')({ flagId: flag.id, action });
    struck = action === 'strike';
  } catch (err) {
    if (!['functions/not-found', 'functions/internal', 'functions/unavailable'].includes(err?.code)) throw err;
    await updateDoc(doc(db, COL.flags, flag.id), {
      status: 'resolved', action, resolvedBy: moderatorUid, resolvedAt: serverTimestamp(),
    });
  }
  const col = TARGET_COLLECTION[flag.targetType];
  if (action === 'strike' && col && flag.targetId) {
    await deleteDoc(doc(db, col, flag.targetId));
  }
  return { struck };
}
