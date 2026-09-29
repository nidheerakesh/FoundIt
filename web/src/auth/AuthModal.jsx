import { useState } from 'react';
import { X, ShieldCheck, Compass } from 'lucide-react';
import { register, login, resetPassword, signInWithGoogle, campusDomainHint } from './authApi';

const FRIENDLY = {
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/invalid-email': 'That email address looks invalid.',
  'auth/email-already-in-use': 'An account with this email already exists — try signing in.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/missing-password': 'Enter a password.',
  'auth/not-campus-email': null, // message is already friendly
  'auth/popup-closed-by-user': 'Sign-in window closed before finishing.',
  'auth/cancelled-popup-request': 'Sign-in window closed before finishing.',
  'auth/popup-blocked': 'Your browser blocked the sign-in window. Allow popups and try again.',
  'auth/account-exists-with-different-credential':
    'This email is already registered with a password. Sign in with your password instead.',
  'auth/operation-not-allowed': 'This sign-in method is turned off for the project.',
  'auth/unauthorized-domain': 'This domain is not authorised in Firebase Auth settings.',
};

function msgFor(err) {
  return FRIENDLY[err.code] ?? err.message ?? 'Something went wrong. Try again.';
}

export default function AuthModal({ isOpen, onClose }) {
  const [mode, setMode] = useState('login'); // login | register
  const [form, setForm] = useState({ name: '', email: '', password: '', dept: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  if (!isOpen) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isRegister = mode === 'register';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (isRegister) {
        await register(form);
        setNotice('Account created successfully! Check your email to verify.');
        setTimeout(() => onClose(), 1500);
      } else {
        await login(form);
        onClose();
      }
    } catch (err) {
      setError(msgFor(err));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError('');
    setNotice('');
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

  const forgot = async () => {
    if (!form.email) return setError('Enter your email first, then tap "Forgot password".');
    setError('');
    try {
      await resetPassword(form.email);
      setNotice('Password reset email sent.');
    } catch (err) {
      setError(msgFor(err));
    }
  };

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Sign in">
      <form className="surface modal" onClick={(e) => e.stopPropagation()} onSubmit={submit} style={{ width: 'min(420px, 100%)', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--accent)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center' }}>
              <Compass size={17} />
            </div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>{isRegister ? 'Join FoundIt' : 'Welcome back'}</h2>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-icon" aria-label="Close"><X size={16} /></button>
        </div>
        <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)', color: 'var(--ink-muted)', marginBottom: 18 }}>
          <ShieldCheck size={14} color="var(--accent)" /> Verified campus accounts only. {campusDomainHint()}
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--surface-raised)', padding: 3, borderRadius: 'var(--radius-full)', border: '1px solid var(--border)', marginBottom: 18 }}>
          {['login', 'register'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(''); setNotice(''); }}
              style={{
                flex: 1, border: 'none', cursor: 'pointer', padding: '7px 0', borderRadius: 'var(--radius-full)',
                fontSize: 'var(--text-sm)', fontWeight: 600, fontFamily: 'inherit',
                color: mode === m ? 'var(--accent-ink)' : 'var(--ink-secondary)',
                background: mode === m ? 'var(--accent)' : 'transparent',
              }}
            >
              {m === 'login' ? 'Sign in' : 'Register'}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={google}
          disabled={busy}
          className="btn"
          style={{
            width: '100%', gap: 10, marginBottom: 16,
            background: 'var(--surface)', color: 'var(--ink)',
            border: '1px solid var(--border)', fontWeight: 600,
          }}
        >
          <GoogleIcon /> Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>or use email</span>
          <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {isRegister && (
          <>
            <Field label="Full name">
              <input className="input" value={form.name} onChange={set('name')} placeholder="Nidhi Rakesh" autoComplete="name" />
            </Field>
            <Field label="Department / hostel">
              <input className="input" value={form.dept} onChange={set('dept')} placeholder="CSE" />
            </Field>
          </>
        )}
        <Field label="Campus email">
          <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="you@campus.edu" autoComplete="email" required />
        </Field>
        <Field label="Password">
          <input className="input" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" autoComplete={isRegister ? 'new-password' : 'current-password'} required />
        </Field>

        {!isRegister && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <button type="button" onClick={forgot} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 'var(--text-xs)', fontWeight: 600, cursor: 'pointer' }}>
              Forgot password?
            </button>
            <button
              type="button"
              onClick={() => setForm({ email: 'demo@campus.edu', password: 'password123', name: '', dept: '' })}
              style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', fontSize: 'var(--text-xs)', textDecoration: 'underline', cursor: 'pointer' }}
              title="Fill demo credentials"
            >
              Prefill demo account
            </button>
          </div>
        )}

        {error && <Banner tone="error">{error}</Banner>}
        {notice && <Banner tone="ok">{notice}</Banner>}

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 6 }} disabled={busy}>
          {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
        </button>
      </form>
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

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <span style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}

function Banner({ tone, children }) {
  const c = tone === 'error' ? 'var(--lost)' : 'var(--found)';
  return (
    <div style={{ fontSize: 'var(--text-sm)', color: c, background: `${c}14`, border: `1px solid ${c}44`, borderRadius: 'var(--radius-md)', padding: '8px 12px', marginBottom: 12 }}>
      {children}
    </div>
  );
}
