import { useState } from 'react';
import { X, ShieldCheck, Compass } from 'lucide-react';
import { register, login, resetPassword, campusDomainHint } from './authApi';

const FRIENDLY = {
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/invalid-email': 'That email address looks invalid.',
  'auth/email-already-in-use': 'An account with this email already exists — try signing in.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/missing-password': 'Enter a password.',
  'auth/not-campus-email': null, // message is already friendly
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
