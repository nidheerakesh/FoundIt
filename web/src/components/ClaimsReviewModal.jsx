import { useEffect, useState } from 'react';
import { X, Inbox, ShieldCheck, MapPin, Check, Ban, MessageSquare } from 'lucide-react';
import { subscribeClaims, resolveClaim } from '../lib/claims';

const STATUS_BADGE = {
  pending: { label: 'Pending', className: 'badge' },
  approved: { label: 'Approved', className: 'badge badge-found' },
  rejected: { label: 'Declined', className: 'badge badge-lost' },
};

/**
 * The finder's side of FR-10: see who has claimed your item, read their proof,
 * then approve or reject. Writing the claim status is all this does — the
 * onClaimResolved Cloud Function owns resolving the item, bumping resolvedCount,
 * recomputing trust and notifying both parties (functions/index.js).
 *
 * Rendering is gated on ownership by the caller, but that is only a convenience:
 * firestore.rules is what actually restricts resolution to the item's poster.
 */
export default function ClaimsReviewModal({ isOpen, onClose, item, onToast, onOpenChat }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!isOpen || !item?.id) return undefined;
    setLoading(true);
    setError('');
    const unsub = subscribeClaims(item.id, (rows) => {
      setClaims(rows);
      setLoading(false);
    });
    return unsub;
  }, [isOpen, item?.id]);

  if (!isOpen || !item) return null;

  const act = async (claimId, status) => {
    setBusyId(claimId);
    setError('');
    try {
      await resolveClaim(item.id, claimId, status);
      onToast?.(
        status === 'approved'
          ? 'Claim approved. The item is marked resolved and both of you have been notified.'
          : 'Claim declined. The claimant has been notified.'
      );
    } catch (err) {
      setError(
        err.code === 'permission-denied'
          ? 'Only the student who posted this item can resolve its claims.'
          : err.message || 'Could not update the claim.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const pending = claims.filter((c) => c.status === 'pending');
  const settled = claims.filter((c) => c.status !== 'pending');
  const resolved = item.status === 'resolved';

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Review claims">
      <div
        className="surface modal"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(620px, 100%)', maxHeight: '88vh', overflowY: 'auto', padding: 24 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center' }}>
              <ShieldCheck size={17} />
            </div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>Claims on your item</h2>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-icon" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            background: 'var(--surface-raised)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            margin: '12px 0 16px',
            fontSize: 'var(--text-sm)',
          }}
        >
          <div style={{ fontWeight: 700 }}>{item.title}</div>
          <div style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-xs)' }}>
            {item.location} · {claims.length} claim{claims.length === 1 ? '' : 's'}
          </div>
        </div>

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

        {resolved && (
          <div
            style={{
              background: 'var(--surface-raised)',
              borderLeft: '3px solid var(--found)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-sm)',
              marginBottom: 14,
            }}
          >
            This item is already marked resolved.
          </div>
        )}

        {loading ? (
          <p style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-sm)', padding: '18px 0' }}>Loading claims…</p>
        ) : claims.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--ink-muted)' }}>
            <Inbox size={40} style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: 'var(--text-sm)' }}>
              No one has claimed this yet. You will get a notification the moment someone does.
            </p>
          </div>
        ) : (
          <>
            {[...pending, ...settled].map((c) => {
              const badge = STATUS_BADGE[c.status] || STATUS_BADGE.pending;
              return (
                <div
                  key={c.id}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 14,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 10, marginBottom: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                        {c.claimantName || 'Campus student'}
                        {c.claimantVerified && (
                          <ShieldCheck size={13} style={{ marginLeft: 5, verticalAlign: '-2px', color: 'var(--found)' }} />
                        )}
                      </div>
                      {c.claimantDept && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>{c.claimantDept}</div>
                      )}
                    </div>
                    <span className={badge.className}>{badge.label}</span>
                  </div>

                  <div
                    style={{
                      background: 'var(--surface-raised)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '9px 12px',
                      fontSize: 'var(--text-sm)',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--ink-secondary)', marginBottom: 3 }}>
                      Their proof of ownership
                    </div>
                    {c.proof || <span style={{ color: 'var(--ink-muted)' }}>No proof supplied.</span>}
                  </div>

                  {c.message && (
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-secondary)', marginBottom: 8 }}>{c.message}</p>
                  )}

                  {c.meetingSpot && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                      <MapPin size={12} /> Suggested handover: {c.meetingSpot}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    {c.status === 'pending' && !resolved && (
                      <>
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          disabled={busyId === c.id}
                          onClick={() => act(c.id, 'approved')}
                        >
                          <Check size={14} /> {busyId === c.id ? 'Working…' : 'Approve'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={busyId === c.id}
                          onClick={() => act(c.id, 'rejected')}
                        >
                          <Ban size={14} /> Decline
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => { onClose(); onOpenChat?.(item); }}
                    >
                      <MessageSquare size={14} /> Message
                    </button>
                  </div>
                </div>
              );
            })}
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', marginTop: 4 }}>
              Approving marks the item resolved, unlocks reviews and updates both trust scores.
              Ask for something only the real owner would know before you approve.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
