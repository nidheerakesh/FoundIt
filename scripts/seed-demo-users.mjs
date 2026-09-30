// Creates the demo sign-in accounts listed in web/src/auth/demoAccounts.js.
//
// They are ordinary Firebase email/password users with emailVerified forced to
// true (only the Admin SDK can do that), so every security rule treats them
// exactly like a real verified student. Their users/{uid} profile is written
// too, and one of them is given the moderator custom claim.
//
// Against the Auth emulator (no credentials needed):
//   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
//   node scripts/seed-demo-users.mjs
//
// Against the real project (needs a service account key):
//   export GOOGLE_APPLICATION_CREDENTIALS=~/foundit-key.json
//   node scripts/seed-demo-users.mjs --project foundit-fcfcc
//
// Email/password must be enabled as a sign-in provider in the Firebase console.
import { createRequire } from 'node:module';

const argProject = process.argv.includes('--project')
  ? process.argv[process.argv.indexOf('--project') + 1]
  : null;
const EMULATED = !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
// Must match the projectId the web client uses (web/src/lib/firebase.js
// defaults to foundit-demo), or the accounts land under a different project
// and the app cannot sign in to them.
const PROJECT = argProject || (EMULATED ? (process.env.GCLOUD_PROJECT || 'foundit-demo') : null);

if (!EMULATED && !PROJECT) {
  console.error('Refusing to guess a project. Pass --project <id>, or set the emulator host vars.');
  process.exit(1);
}
if (!EMULATED && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to a service account key, or target the emulator.');
  process.exit(1);
}
process.env.GCLOUD_PROJECT = PROJECT;

const require = createRequire(new URL('../web/package.json', import.meta.url));
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp(EMULATED ? { projectId: PROJECT } : { credential: applicationDefault(), projectId: PROJECT });
const auth = getAuth();
const db = getFirestore();

// Kept in step with web/src/auth/demoAccounts.js.
const PASSWORD = 'demo-FoundIt-2026';
const ACCOUNTS = [
  { email: 'riya.demo@iiitkottayam.ac.in',  name: 'Riya Singh', dept: 'CSE', role: 'student' },
  { email: 'arjun.demo@iiitkottayam.ac.in', name: 'Arjun Nair', dept: 'ECE', role: 'student' },
  { email: 'meera.demo@iiitkottayam.ac.in', name: 'Meera Das',  dept: 'CSE', role: 'moderator' },
];

for (const a of ACCOUNTS) {
  let user;
  try {
    user = await auth.getUserByEmail(a.email);
    await auth.updateUser(user.uid, { password: PASSWORD, emailVerified: true, displayName: a.name });
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
    user = await auth.createUser({
      email: a.email, password: PASSWORD, emailVerified: true, displayName: a.name,
    });
  }

  if (a.role !== 'student') await auth.setCustomUserClaims(user.uid, { role: a.role });

  await db.doc(`users/${user.uid}`).set({
    name: a.name,
    email: a.email,
    hostelOrDept: a.dept,
    dept: a.dept,
    verified: true,
    role: a.role === 'student' ? 'user' : a.role,
    trustScore: 70,
    trustTier: 'trusted',
    createdAt: FieldValue.serverTimestamp(),
    demo: true,
  }, { merge: true });

  console.log(`${a.email.padEnd(34)} ${user.uid}  (${a.role})`);
}

console.log(`\n${ACCOUNTS.length} demo accounts ready. Password: ${PASSWORD}`);
console.log('Enable the UI with VITE_DEMO_AUTH=true in web/.env');
