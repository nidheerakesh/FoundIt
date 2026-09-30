import { useState } from 'react';
import { X, ShieldCheck, Compass } from 'lucide-react';
import { signInWithGoogle, campusDomainHint, login } from './authApi';
import { DEMO_ACCOUNTS, DEMO_AUTH_ENABLED } from './demoAccounts';
import { useAuth } from './AuthContext';

const FRIENDLY = {
  'auth/not-campus-email': null, // message is already friendly
  'auth/popup-closed-by-user': 'Sign-in window closed before finishing.',
  'auth/cancelled-popup-request': 'Sign-in window closed before finishing.',
  'auth/popup-blocked':
    'Your browser blocked the Google sign-in window. Click the blocked-popup icon at the right of the address bar, allow popups for this site, then try again.',
  'auth/account-exists-with-different-credential':
    'This email is already registered with a different sign-in method.',
  'auth/operation-not-allowed': 'Google sign-in is turned off for this project.',
  'auth/unauthorized-domain': 'This domain is not authorised in Firebase Auth settings.',
  'auth/network-request-failed': 'Network problem reaching Google. Check your connection and retry.',
};

function msgFor(err) {
  return FRIENDLY[err.code] ?? err.message ?? 'Something went wrong. Try again.';
}

export default function AuthModal({ isOpen, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { redirectError, clearRedirectError } = useAuth();

  if (!isOpen) return null;

  const google = async () => {
    setError('');
    clearRedirectError();
    setBusy(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      setError(msgFor(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Sign in">
      <div className="surface modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(420px, 100%)', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--accent)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center' }}>
              <Compass size={17} />
            </div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>Sign in to FoundIt</h2>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-icon" aria-label="Close"><X size={16} /></button>
        </div>

        <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)', color: 'var(--ink-muted)', marginBottom: 20 }}>
          <ShieldCheck size={14} color="var(--accent)" /> Verified campus accounts only. {campusDomainHint()}
        </p>

        <button
          type="button"
          onClick={google}
          disabled={busy}
          className="btn"
          style={{
            width: '100%', gap: 10,
            background: 'var(--surface)', color: 'var(--ink)',
            border: '1px solid var(--border)', fontWeight: 600,
          }}
        >
          <GoogleIcon /> {busy ? 'Opening Google…' : 'Continue with Google'}
        </button>

        {DEMO_AUTH_ENABLED && (
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--ink-secondary)', marginBottom: 4 }}>
              DEMO ACCOUNTS
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', marginBottom: 10 }}>
              Pre-verified test users. Enabled by VITE_DEMO_AUTH — never switch this on in a real deployment.
            </p>
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                disabled={busy}
                className="btn btn-ghost btn-sm"
                style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 6 }}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    await login({ email: a.email, password: a.password });
                    onClose?.();
                  } catch (err) {
                    setError(`${err.message} — run: node scripts/seed-demo-users.mjs`);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {a.name} · {a.role}
              </button>
            ))}
          </div>
        )}

        {(error || redirectError) && <Banner>{error || redirectError}</Banner>}

        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', marginTop: 16, textAlign: 'center' }}>
          Your campus Google account is used to verify you are a student. We never see your password.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.3z" />
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.2 15.5 46 24 46z" />
      <path fill="#FBBC05" d="M11.8 28.3c-.4-1.3-.7-2.7-.7-4.3s.2-2.9.7-4.3v-5.7H4.5C2.9 17.2 2 20.5 2 24s.9 6.8 2.5 9.7l7.3-5.4z" />
      <path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.2 29.9 2 24 2 15.5 2 8.1 6.8 4.5 14.3l7.3 5.7c1.7-5.2 6.5-9.2 12.2-9.2z" />
    </svg>
  );
}

function Banner({ children }) {
  const c = 'var(--lost)';
  return (
    <div style={{ fontSize: 'var(--text-sm)', color: c, background: `${c}14`, border: `1px solid ${c}44`, borderRadius: 'var(--radius-md)', padding: '8px 12px', marginTop: 14 }}>
      {children}
    </div>
  );
}
