import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { COL } from '../types';

export const FLAG_REASONS = [
  'Prohibited or restricted item',
  'Suspected scam or fake report',
  'Offensive or inappropriate content',
  'Wrong campus zone or category',
  'Duplicate or spam listing',
  'Other campus policy violation',
];

/** Submit a content or user flag for moderator review. */
export async function submitFlag({ targetType, targetId, targetTitle, reason, details }, reporter) {
  if (!targetId) throw new Error('Target ID is required.');
  if (!reporter?.uid) throw new Error('You must be signed in to flag content.');

  const flagsCol = collection(db, COL.flags);
  const docRef = await addDoc(flagsCol, {
    reporterUid: reporter.uid,
    reporterName: reporter.name || 'Campus Student',
    targetType: targetType || 'item',
    targetId,
    targetTitle: targetTitle || 'Untitled Item',
    reason: reason || FLAG_REASONS[0],
    details: details?.trim() || '',
    status: 'open',
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}
