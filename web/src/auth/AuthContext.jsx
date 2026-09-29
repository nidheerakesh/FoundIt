// Auth state provider. OWNER: Shanid.
// Tracks the signed-in user + live users/{uid} profile doc, exposes auth actions.
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { COL } from '../types';
import { ensureUserProfile, completeGoogleRedirect } from './authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // firebase auth user
  const [profile, setProfile] = useState(null); // users/{uid} doc
  const [loading, setLoading] = useState(true);
  const [redirectError, setRedirectError] = useState('');

  // Finish a Google sign-in that fell back to a full-page redirect. No-op on a
  // normal load. Rejects when the returning account is outside the campus
  // domain — enforceCampusAccount has already signed it back out by then.
  useEffect(() => {
    completeGoogleRedirect().catch((err) => setRedirectError(err.message));
  }, []);

  useEffect(() => {
    let unsubProfile = () => {};
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      unsubProfile();
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }
      // Subscribe first, then create the doc in the background. Awaiting the
      // write here would gate the whole signed-in UI on a Firestore round-trip,
      // and an unreachable backend would leave the app stuck on `loading`.
      unsubProfile = onSnapshot(doc(db, COL.users, u.uid), (snap) => {
        setProfile(snap.exists() ? { uid: u.uid, ...snap.data(), verified: u.emailVerified } : null);
        setLoading(false);
      }, () => setLoading(false));
      setLoading(false);
      ensureUserProfile(u).catch(() => {});
    });
    return () => { unsubAuth(); unsubProfile(); };
  }, []);

  const refreshUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      const fresh = auth.currentUser;
      setUser({ ...fresh });
      if (fresh.emailVerified) {
        await ensureUserProfile(fresh).catch(() => {});
      }
    }
  };

  const value = {
    user,
    profile,
    loading,
    isAuthed: !!user,
    isVerified: !!user?.emailVerified,
    redirectError,
    clearRedirectError: () => setRedirectError(''),
    refreshUser,
    // Poster identity used by feed writers.
    poster: profile
      ? { uid: profile.uid, name: profile.name, dept: profile.hostelOrDept, verified: profile.verified, trustScore: profile.trustScore }
      : (user ? { uid: user.uid, name: user.displayName || (user.email || '').split('@')[0] || 'Student', dept: '', verified: !!user.emailVerified, trustScore: 50 } : null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
