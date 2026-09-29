// Auth operations. OWNER: Shanid.
// Email/password + email verification + the users/{uid} profile doc.
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  applyActionCode,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { COL } from '../types';

// Restrict signups to a campus domain when configured (SRS: valid campus email).
// Empty = allow any domain (dev default).
const CAMPUS_DOMAIN = (import.meta.env.VITE_CAMPUS_DOMAIN || '').toLowerCase();

export function isCampusEmail(email) {
  if (!CAMPUS_DOMAIN) return true;
  return email.toLowerCase().trim().endsWith(`@${CAMPUS_DOMAIN}`);
}

export function campusDomainHint() {
  return CAMPUS_DOMAIN ? `Use your @${CAMPUS_DOMAIN} email.` : '';
}

/** Create (or return) the users/{uid} profile doc with sane defaults. */
export async function ensureUserProfile(user, extra = {}) {
  const ref = doc(db, COL.users, user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    // keep verified in sync with the auth record
    if (snap.data().verified !== user.emailVerified) {
      await setDoc(ref, { verified: user.emailVerified }, { merge: true });
    }
    return { uid: user.uid, ...snap.data(), verified: user.emailVerified };
  }
  const profile = {
    name: extra.name || user.displayName || (user.email || '').split('@')[0],
    email: user.email,
    hostelOrDept: extra.dept || '',
    photoURL: user.photoURL || '',
    role: 'user',
    status: 'active',
    verified: user.emailVerified,
    ratingAvg: 0,
    ratingCount: 0,
    resolvedCount: 0,
    trustScore: 50,
    trustTier: 'neutral',
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, profile);
  return { uid: user.uid, ...profile };
}

export async function register({ name, email, password, dept }) {
  if (!isCampusEmail(email)) {
    const err = new Error(`Not a campus email. ${campusDomainHint()}`.trim());
    err.code = 'auth/not-campus-email';
    throw err;
  }
  const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (name) await updateProfile(user, { displayName: name });
  await ensureUserProfile(user, { name, dept });
  try {
    await sendEmailVerification(user);
  } catch (verifyErr) {
    // eslint-disable-next-line no-console
    console.warn('[FoundIt] Failed to send verification email:', verifyErr);
  }
  return user;
}

export async function login({ email, password }) {
  const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
  await ensureUserProfile(user);
  return user;
}

function googleProvider() {
  const provider = new GoogleAuthProvider();
  // `hd` only pre-filters Google's account chooser — it is a UI hint the client
  // controls, not a guarantee, so the domain is re-checked by enforceCampusAccount
  // on every path before we keep the session.
  if (CAMPUS_DOMAIN) provider.setCustomParameters({ hd: CAMPUS_DOMAIN });
  return provider;
}

/** Drop any session whose email is outside the campus domain. */
async function enforceCampusAccount(user) {
  if (isCampusEmail(user.email || '')) return user;
  await signOut(auth);
  const err = new Error(`That Google account isn't a campus account. ${campusDomainHint()}`.trim());
  err.code = 'auth/not-campus-email';
  throw err;
}

// Popup is the nicer flow, but browsers block it when the click isn't trusted
// (and some block it outright). These are the codes worth a redirect retry.
const POPUP_UNAVAILABLE = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
]);

/**
 * Google sign-in, restricted to the campus Workspace domain.
 * Google accounts arrive with emailVerified already true, so these users skip
 * the email verification step entirely.
 *
 * Falls back to a full-page redirect when the popup is blocked; in that case the
 * browser navigates away and completeGoogleRedirect() finishes the job on return.
 */
export async function signInWithGoogle() {
  try {
    const { user } = await signInWithPopup(auth, googleProvider());
    await enforceCampusAccount(user);
    await ensureUserProfile(user);
    return user;
  } catch (err) {
    if (!POPUP_UNAVAILABLE.has(err.code)) throw err;
    await signInWithRedirect(auth, googleProvider());
    return null; // unreachable in practice — the page navigates away
  }
}

/**
 * Finish a redirect-based Google sign-in. Safe to call on every app load: it
 * resolves to null when the user did not just come back from a redirect.
 */
export async function completeGoogleRedirect() {
  const result = await getRedirectResult(auth);
  if (!result) return null;
  await enforceCampusAccount(result.user);
  await ensureUserProfile(result.user);
  return result.user;
}

export function logout() {
  return signOut(auth);
}

export function resendVerification() {
  if (auth.currentUser) return sendEmailVerification(auth.currentUser);
  return Promise.resolve();
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email.trim());
}

/** Dev helper to automatically verify email when running against local Auth emulator. */
export async function devAutoVerify(email) {
  if (!email) return false;
  try {
    const res = await fetch('http://127.0.0.1:9099/emulator/v1/projects/foundit-demo/oobCodes');
    if (!res.ok) return false;
    const data = await res.json();
    const codes = data.oobCodes || [];
    const match = [...codes].reverse().find(
      (c) => c.email?.toLowerCase() === email.toLowerCase() && c.requestType === 'VERIFY_EMAIL'
    );
    if (match?.oobCode) {
      await applyActionCode(auth, match.oobCode);
      if (auth.currentUser) {
        await auth.currentUser.reload();
        await ensureUserProfile(auth.currentUser);
      }
      return true;
    }
    if (match?.oobLink) {
      await fetch(match.oobLink, { mode: 'no-cors' });
      if (auth.currentUser) {
        await auth.currentUser.reload();
        await ensureUserProfile(auth.currentUser);
      }
      return true;
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[FoundIt] devAutoVerify failed:', e);
  }
  return false;
}

