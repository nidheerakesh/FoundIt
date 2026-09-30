import { useState } from 'react';
import { X, ShieldCheck, MapPin, CheckCircle, Send } from 'lucide-react';
import { submitClaim } from '../lib/claims';
import { CAMPUS_LOCATIONS } from '../data/mockData';

export default function ClaimModal({ isOpen, onClose, item, user, onClaimSuccess, onOpenChat }) {
  const [proof, setProof] = useState('');
  const [message, setMessage] = useState('');
  const [meetingSpot, setMeetingSpot] = useState('Central Library');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !item) return null;

  const isFound = item.type === 'found';
  const valid = proof.trim().length >= 4;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError('');
    try {
      await submitClaim(item.id, { proof, message, meetingSpot }, user);
      setSubmitted(true);
      onClaimSuccess?.(`Claim submitted for "${item.title}". The poster will review your proof.`);
    } catch (err) {
      setError(err.message || 'Failed to submit claim. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Claim item">
      <div
        className="surface modal"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(500px, 100%)', maxHeight: '90vh', overflowY: 'auto', padding: 24 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--surface-raised)',
                color: 'var(--accent)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <ShieldCheck size={18} />
            </div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>
              {isFound ? 'Claim this Found Item' : 'I Found this Item'}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-icon" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Item context strip */}
        <div
          style={{
            background: 'var(--surface-raised)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            margin: '12px 0 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 'var(--text-sm)',
          }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>{item.title}</div>
            <div style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-xs)' }}>
              Reported by {item.reporter} · {item.location}
            </div>
          </div>
          <span className={`badge ${isFound ? 'badge-found' : 'badge-lost'}`}>
            {isFound ? 'Found' : 'Lost'}
          </span>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <CheckCircle size={48} color="var(--found)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 8 }}>
              Verification Claim Sent!
            </h3>
            <p style={{ color: 'var(--ink-secondary)', fontSize: 'var(--text-sm)', marginBottom: 20 }}>
              Your verification details are attached to {item.reporter}&rsquo;s post, for them to review.
              Message them directly to arrange the handover.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onClose();
                  onOpenChat?.(item);
                }}
              >
                <Send size={14} /> Open direct chat
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', marginBottom: 14 }}>
              <span style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: 6 }}>
                Verification Proof / Identifying Features *
              </span>
              <textarea
                className="input"
                rows={3}
                required
                value={proof}
                onChange={(e) => setProof(e.target.value)}
                placeholder={
                  isFound
                    ? 'e.g. Stickers on back, lock screen wallpaper, specific dent or scratches, serial number...'
                    : 'e.g. Where you found it, item condition, when you can hand it over...'
                }
              />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', marginTop: 4, display: 'block' }}>
                Used by {item.reporter} to verify true ownership before handing over.
              </span>
            </label>

            <label style={{ display: 'block', marginBottom: 14 }}>
              <span style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: 6 }}>
                Suggested Campus Handover Location
              </span>
              <select
                className="input"
                value={meetingSpot}
                onChange={(e) => setMeetingSpot(e.target.value)}
              >
                {CAMPUS_LOCATIONS.filter((l) => l !== 'All Campus Locations').map((loc) => (
                  <option key={loc} value={loc} style={{ background: 'var(--surface)' }}>
                    {loc}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'block', marginBottom: 18 }}>
              <span style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: 6 }}>
                Optional Note
              </span>
              <input
                className="input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Free after 4 PM at the library desk"
              />
            </label>

            {error && (
              <div
                style={{
                  color: 'var(--lost)',
                  background: 'rgba(220, 38, 38, 0.08)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-sm)',
                  marginBottom: 14,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={busy || !valid}
            >
              {busy ? 'Submitting claim…' : 'Submit Claim Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
