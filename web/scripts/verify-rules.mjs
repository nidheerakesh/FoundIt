// Security-rules deny checks (client SDK). Emulator must be running.
//   node scripts/verify-rules.mjs
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';

const app = initializeApp({ projectId: 'foundit-demo', apiKey: 'demo-key' });
const db = getFirestore(app);
const auth = getAuth(app);
connectFirestoreEmulator(db, '127.0.0.1', 8080);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

const { user } = await signInAnonymously(auth);
const uid = user.uid;

async function denied(label, fn) {
  try { await fn(); console.log('FAIL ❌', label, '— write was ALLOWED'); process.exitCode = 1; }
  catch (e) {
    if (e.code === 'permission-denied') console.log('PASS ✅', label, '— denied');
    else { console.log('FAIL ❌', label, '— unexpected', e.code || e.message); process.exitCode = 1; }
  }
}
async function allowed(label, fn) {
  try { await fn(); console.log('PASS ✅', label, '— allowed'); }
  catch (e) { console.log('FAIL ❌', label, '—', e.code || e.message); process.exitCode = 1; }
}

// Own profile create is allowed…
await allowed('create own user doc', () =>
  setDoc(doc(db, 'users', uid), { name: 'Anon', role: 'user', status: 'active', verified: false, trustScore: 50, createdAt: Date.now() }));

// …but bumping your own trustScore is not (function-only).
await denied('self trustScore write', () => updateDoc(doc(db, 'users', uid), { trustScore: 999 }));

// Writing another user's trust is not.
await denied('cross-user trustScore write', () => setDoc(doc(db, 'users', 'someoneElse'), { trustScore: 999 }, { merge: true }));

// Clients cannot write notifications at all.
await denied('client notification write', () =>
  addDoc(collection(db, 'notifications'), { userId: uid, type: 'x', message: 'y', read: false, createdAt: serverTimestamp() }));

console.log('\nDone.');
process.exit(process.exitCode || 0);
