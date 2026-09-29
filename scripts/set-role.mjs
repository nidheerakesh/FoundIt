// Grants a role to a user account. This exists because setUserRole (the
// in-app callable) is admin-gated, so there is no way to create the *first*
// admin from inside the app — a bootstrap outside the security rules is
// required. Uses the Admin SDK, which bypasses rules by design.
//
// Requires a service account key (never commit it):
//   Firebase Console → foundit-fcfcc → Project settings → Service accounts
//   → Generate new private key → save OUTSIDE this repo.
//
//   export GOOGLE_APPLICATION_CREDENTIALS=~/foundit-key.json
//   node scripts/set-role.mjs someone@iiitkottayam.ac.in admin
//   node scripts/set-role.mjs someone@iiitkottayam.ac.in moderator
//   node scripts/set-role.mjs someone@iiitkottayam.ac.in user     # demote
//   node scripts/set-role.mjs --list                              # show roles
//
// The account must have signed in at least once — Google creates the auth
// record on first sign-in, and there is nothing to grant a role to before that.
//
// Custom claims land in the ID token, which is what firestore.rules reads via
// request.auth.token.role. The users/{uid}.role mirror is for the UI only.
// A signed-in user must refresh their token before a new role takes effect:
// sign out and back in, or wait for the hourly refresh.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'foundit-fcfcc';
const ROLES = ['user', 'moderator', 'admin'];

if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error('An emulator host is set. Unset it, or run this knowingly against the emulator.');
}
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service account key path first.');
  process.exit(1);
}

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const auth = getAuth();
const db = getFirestore();

async function list() {
  const { users } = await auth.listUsers(1000);
  if (!users.length) return console.log('No accounts yet — nobody has signed in.');
  console.log('email'.padEnd(42), 'role');
  for (const u of users) {
    console.log((u.email || u.uid).padEnd(42), u.customClaims?.role || 'user');
  }
}

async function setRole(email, role) {
  if (!ROLES.includes(role)) {
    console.error(`Role must be one of: ${ROLES.join(', ')}`);
    process.exit(1);
  }

  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch {
    console.error(`No account for ${email}. They must sign in once first.`);
    process.exit(1);
  }

  // 'user' is the absence of elevation — clear the claim rather than storing it,
  // so the token carries no role at all.
  await auth.setCustomUserClaims(user.uid, role === 'user' ? null : { role });
  await db.collection('users').doc(user.uid).set({ role }, { merge: true });

  console.log(`${email} → ${role}`);
  console.log('They must sign out and back in for the new token to take effect.');
}

const [a, b] = process.argv.slice(2);
const run = a === '--list' ? list() : (a && b ? setRole(a, b) : Promise.reject(
  new Error('Usage: node scripts/set-role.mjs <email> <user|moderator|admin>  |  --list')
));

run.then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
