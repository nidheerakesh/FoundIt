import {
  doc,
  collection,
  setDoc,
  addDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import { COL } from '../types';

/** Generate consistent unique chatId for 2 users discussing a specific item/listing. */
export function getChatId(uidA, uidB, contextId = 'general') {
  const sorted = [uidA, uidB].sort().join('_');
  return `${sorted}_${contextId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/** Get or create a chat thread. */
export async function getOrCreateChat({ targetUid, targetName, contextItem, currentUser }) {
  if (!currentUser?.uid) throw new Error('Sign in to send a message.');
  if (currentUser.uid === targetUid) {
    throw new Error('You cannot chat with yourself.');
  }

  const chatId = getChatId(currentUser.uid, targetUid, contextItem?.id || 'campus');
  const chatRef = doc(db, COL.chats, chatId);
  const snap = await getDoc(chatRef);

  if (!snap.exists()) {
    await setDoc(chatRef, {
      participants: [currentUser.uid, targetUid],
      participantNames: {
        [currentUser.uid]: currentUser.name || currentUser.displayName || 'You',
        [targetUid]: targetName || 'Student',
      },
      contextType: contextItem?.type === 'marketplace' ? 'listing' : 'item',
      contextId: contextItem?.id || '',
      contextTitle: contextItem?.title || '',
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      lastSenderUid: '',
      unreadCounts: { [currentUser.uid]: 0, [targetUid]: 0 },
      createdAt: serverTimestamp(),
    });
  }

  return chatId;
}

/** Send a message in a chat thread. otherUid increments their unread count. */
export async function sendMessage(chatId, text, currentUser, otherUid = null) {
  if (!text.trim()) return;
  const messagesCol = collection(db, COL.chats, chatId, 'messages');
  const chatRef = doc(db, COL.chats, chatId);

  const cleanText = text.trim();

  await addDoc(messagesCol, {
    senderUid: currentUser.uid,
    senderName: currentUser.name || currentUser.displayName || 'You',
    text: cleanText,
    sentAt: serverTimestamp(),
  });

  const update = {
    lastMessage: cleanText,
    lastMessageAt: serverTimestamp(),
    lastSenderUid: currentUser.uid,
  };
  if (otherUid) {
    update[`unreadCounts.${otherUid}`] = increment(1);
  }

  await setDoc(chatRef, update, { merge: true });
}

/** Listen to real-time messages in a chat thread. */
export function subscribeMessages(chatId, cb) {
  if (!chatId) return () => {};
  const messagesCol = collection(db, COL.chats, chatId, 'messages');
  const q = query(messagesCol, orderBy('sentAt', 'asc'));

  return onSnapshot(
    q,
    (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      cb(msgs);
    },
    (err) => {
      // eslint-disable-next-line no-console
      console.warn('[FoundIt] Failed to listen to chat messages:', err);
    }
  );
}

/** Subscribe to all chats the user participates in, sorted by latest message. */
export function subscribeMyChats(uid, cb) {
  if (!uid) return () => {};
  const q = query(
    collection(db, COL.chats),
    where('participants', 'array-contains', uid),
    orderBy('lastMessageAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      const chats = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      cb(chats);
    },
    (err) => {
      console.warn('[FoundIt] Failed to load chats:', err);
      cb([]);
    }
  );
}

/** Mark a chat as read for uid — resets their unread counter. */
export async function markChatRead(chatId, uid) {
  if (!chatId || !uid) return;
  await updateDoc(doc(db, COL.chats, chatId), {
    [`unreadCounts.${uid}`]: 0,
  });
}
