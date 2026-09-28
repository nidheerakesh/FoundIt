import { useState } from 'react';
import { X, Shield, Award, Star, MessageCircle, Flag, Package } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import TrustBadge from './TrustBadge';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COL } from '../types';

export default function ProfileModal({ isOpen, onClose }) {
  const { profile, user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', hostelOrDept: '' });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isOpen || !profile) return null;

  const startEdit = () => {
    setForm({ name: profile.name || '', hostelOrDept: profile.hostelOrDept || '' });
    setEditing(true);
    setSaved(false);
  };

  const saveProfile = async () => {
    setBusy(true);
    try {
      await updateDoc(doc(db, COL.users, profile.uid), {
        name: form.name.trim(),
        hostelOrDept: form.hostelOrDept.trim(),
      });
      setSaved(true);
      setEditing(false);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Profile save failed:', err);
    } finally {
      setBusy(false);
    }
  };

  const stats = [
    { icon: Package, label: 'Resolved', value: profile.resolvedCount || 0 },
    { icon: Star, label: 'Avg Rating', value: profile.ratingAvg ? profile.ratingAvg.toFixed(1) : '—' },
    { icon: MessageCircle, label: 'Reviews', value: profile.ratingCount || 0 },
    { icon: Flag, label: 'Strikes', value: profile.strikes || 0 },
  ];

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Profile">
      <div className="surface modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(440px, 100%)', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={20} color="var(--accent)" /> Your Profile
          </h2>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-icon" aria-label="Close"><X size={16} /></button>
        </div>

        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 'var(--radius-lg)',
            background: 'var(--accent)', color: 'var(--accent-ink)',
            display: 'grid', placeItems: 'center',
            fontSize: '1.5rem', fontWeight: 800,
          }}>
            {(profile.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Name" style={{ padding: '6px 10px' }} />
                <input className="input" value={form.hostelOrDept} onChange={(e) => setForm((f) => ({ ...f, hostelOrDept: e.target.value }))} placeholder="Dept / Hostel" style={{ padding: '6px 10px' }} />
              </div>
            ) : (
              <>
                <div style={{ fontWeight: 800, fontSize: 'var(--text-md)' }}>{profile.name || 'Student'}</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)' }}>{profile.hostelOrDept || 'No department set'}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', marginTop: 2 }}>{user?.email}</div>
              </>
            )}
          </div>
        </div>

        {/* Trust */}
        <div style={{
          padding: '14px 16px', borderRadius: 'var(--radius-md)',
          background: 'var(--surface-raised)', border: '1px solid var(--border)',
          marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Award size={18} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>Trust Score</span>
          </div>
          <TrustBadge score={profile.trustScore ?? 50} verified={profile.verified} size="md" />
        </div>

        {/* Stats grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10,
          marginBottom: 20,
        }}>
          {stats.map((s) => (
            <div key={s.label} style={{
              padding: '12px 14px', borderRadius: 'var(--radius-md)',
              background: 'var(--surface-raised)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <s.icon size={16} color="var(--ink-muted)" />
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>{s.label}</div>
                <div style={{ fontWeight: 800, fontSize: 'var(--text-md)' }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          {editing ? (
            <>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveProfile} disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </button>
              <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
            </>
          ) : (
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={startEdit}>
              Edit Profile
            </button>
          )}
        </div>
        {saved && (
          <div style={{ marginTop: 10, fontSize: 'var(--text-sm)', color: 'var(--found)', textAlign: 'center' }}>
            Profile updated!
          </div>
        )}
      </div>
    </div>
  );
}
