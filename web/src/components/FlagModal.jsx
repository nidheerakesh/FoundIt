import { useState } from 'react';
import { X, Flag, CheckCircle, AlertTriangle } from 'lucide-react';
import { submitFlag, FLAG_REASONS } from '../lib/flags';

export default function FlagModal({ isOpen, onClose, item, currentUser, onFlagSuccess }) {
  const [reason, setReason] = useState(FLAG_REASONS[0]);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await submitFlag(
        {
          targetType: item.type === 'marketplace' ? 'listing' : 'item',
          targetId: item.id,
          targetTitle: item.title,
          reason,
          details,
        },
        currentUser
      );
      setSubmitted(true);
      onFlagSuccess?.(`Report submitted for "${item.title}". Campus moderators will review it.`);
    } catch (err) {
      setError(err.message || 'Failed to submit report.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Flag item for review">
      <div
        className="surface modal"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(480px, 100%)', maxHeight: '90vh', overflowY: 'auto', padding: 24 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(220, 38, 38, 0.12)',
                color: 'var(--lost)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Flag size={18} />
            </div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>Flag for Moderation</h2>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-icon" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)', marginBottom: 14 }}>
          Help keep FoundIt safe and authentic for the campus community.
        </p>

        {/* Item summary */}
        <div
          style={{
            background: 'var(--surface-raised)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: 'var(--text-sm)',
          }}
        >
          <div style={{ fontWeight: 700 }}>{item.title}</div>
          <div style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-xs)', marginTop: 2 }}>
            Reported by {item.reporter} · {item.location}
          </div>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <CheckCircle size={40} color="var(--found)" style={{ margin: '0 auto 10px' }} />
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 6 }}>Report Received</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-secondary)', marginBottom: 18 }}>
              Thank you for reporting. Campus student moderators have queued this item for verification.
            </p>
            <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', marginBottom: 14 }}>
              <span style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: 6 }}>
                Reason for report
              </span>
              <select
                className="input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                {FLAG_REASONS.map((r) => (
                  <option key={r} value={r} style={{ background: 'var(--surface)' }}>
                    {r}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'block', marginBottom: 16 }}>
              <span style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: 6 }}>
                Additional Details (optional)
              </span>
              <textarea
                className="input"
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe why this post should be moderated..."
              />
            </label>

            {error && (
              <div style={{ color: 'var(--lost)', background: 'rgba(220, 38, 38, 0.1)', padding: 8, borderRadius: 6, fontSize: 'var(--text-xs)', marginBottom: 12 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                {busy ? 'Submitting…' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
