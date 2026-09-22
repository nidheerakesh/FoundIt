// Notifications data layer — reads the user's notifications (written server-side
// by Cloud Functions on match / claim / message / deal / review / flag events).
// OWNER: Hadi (comms). Clients can read their own + mark read; they cannot create.
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { COL } from '../types';

/** Live-subscribe to a user's notifications (newest first). Returns unsubscribe. */
export function subscribeNotifications(uid, cb) {
  if (!uid) return () => {};
  const q = query(
    collection(db, COL.notifications),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => {
      // eslint-disable-next-line no-console
      console.warn('[FoundIt] notifications listen failed:', err);
    }
  );
}

/** Mark a single notification read. */
export function markRead(notifId) {
  return updateDoc(doc(db, COL.notifications, notifId), { read: true });
}
