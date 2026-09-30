import { useEffect, useState } from 'react';
import { X, Inbox, ShieldCheck, MapPin, Check, Ban, MessageSquare } from 'lucide-react';
import { subscribeClaims, resolveClaim } from '../lib/claims';
import { calculateMatchScore } from '../lib/matching';
import { getItemDetail } from '../lib/feed';

const STATUS_BADGE = {
  pending: { label: 'Pending', className: 'badge' },
  approved: { label: 'Approved', className: 'badge badge-found' },
  rejected: { label: 'Declined', className: 'badge badge-lost' },
  // Still pending on an item already returned to someone else (claims made
  // before approvals started declining the rest).
  closed: { label: 'Not chosen', className: 'badge badge-neutral' },
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
export default function ClaimsReviewModal({ isOpen, onClose, item, items = [], onToast, onOpenChat }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  // Your own description is private, so it takes a read. You need it here:
  // judging a claim means comparing their proof against what you wrote.
  const [myDetail, setMyDetail] = useState('');
  useEffect(() => {
    if (!isOpen || !item?.id) return undefined;
    let live = true;
    getItemDetail(item.id).then((d) => { if (live) setMyDetail(d); });
    return () => { live = false; };
  }, [isOpen, item?.id]);

  // Resolve a claim's linked report to something displayable. The feed only
  // holds open posts, so a linked report that has since been resolved may not
  // be here — in that case the caller falls back to a bare acknowledgement.
  const linkedFor = (c) => {
    const linked = items.find((i) => i.id === c.viaItemId);
    if (!linked) return null;
    return { title: linked.title, score: calculateMatchScore(item, linked).score };
  };

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
      const others = claims.filter((c) => c.status === 'pending' && c.id !== claimId).map((c) => c.id);
      await resolveClaim(item.id, claimId, status, others);
      onToast?.(
        status === 'approved'
          ? `"${item.title}" is marked returned. They will see it under My claims.`
          : 'Claim declined. They will see it under My claims.'
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

  // The same screen serves both directions of the workflow.
  const isFoundPost = item.type === 'found';
  const heading = isFoundPost ? 'Who says this is theirs' : 'Who says they found it';
  const proofLabel = isFoundPost ? 'Their proof of ownership' : 'Where and how they found it';
  const approveHint = isFoundPost
    ? 'Approve when their proof matches something only the owner would know — then hand it over.'
    : 'Approve once you have your item back.';
  const resolved = item.status === 'resolved';
  // The winner first, then anyone still waiting, then the declined.
  const rank = { approved: 0, pending: 1, rejected: 2 };
  const ordered = [...claims].sort((a, b) => (rank[a.status] ?? 1) - (rank[b.status] ?? 1));

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
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>{heading}</h2>
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
            Returned. This report is closed and takes no new claims.
          </div>
        )}

        {/* What you wrote, shown only to you. Judging a claim means comparing
            their proof against this — and nobody else can read it, which is
            what makes the comparison meaningful. */}
        {myDetail && (
          <div
            style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '9px 12px',
              fontSize: 'var(--text-sm)',
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--ink-secondary)', marginBottom: 3 }}>
              Your description — private to you
            </div>
            {myDetail}
          </div>
        )}

        {loading ? (
          <p style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-sm)', padding: '18px 0' }}>Loading claims…</p>
        ) : claims.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--ink-muted)' }}>
            <Inbox size={40} style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: 'var(--text-sm)' }}>
              Nobody yet. The button on your post shows a count as soon as someone responds.
            </p>
          </div>
        ) : (
          <>
            {ordered.map((c) => {
              const shown = resolved && c.status === 'pending' ? 'closed' : c.status;
              const badge = STATUS_BADGE[shown] || STATUS_BADGE.pending;
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
                      {proofLabel}
                    </div>
                    {c.proof || <span style={{ color: 'var(--ink-muted)' }}>No proof supplied.</span>}
                  </div>

                  {/* Corroboration: they pointed at their own report of the
                      opposite type. The rules already verified it is theirs,
                      so the only question left is whether it describes the
                      same object — hence the score. */}
                  {c.viaItemId && (
                    <div
                      style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--ink-secondary)',
                        background: 'color-mix(in srgb, var(--accent) 7%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--accent) 22%, transparent)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '7px 10px',
                        marginBottom: 8,
                      }}
                    >
                      {linkedFor(c) ? (
                        <>
                          <strong>Linked to their own report:</strong> {linkedFor(c).title}
                          {linkedFor(c).score != null && <> — {linkedFor(c).score}% match</>}
                        </>
                      ) : (
                        <>They linked one of their own reports.</>
                      )}
                    </div>
                  )}

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
                          <Check size={14} /> {busyId === c.id ? 'Working…' : 'Approve & mark returned'}
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
                      onClick={() => { onClose(); onOpenChat?.(item, { uid: c.claimantUid, name: c.claimantName || 'Student' }); }}
                    >
                      <MessageSquare size={14} /> Message
                    </button>
                  </div>
                </div>
              );
            })}
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', marginTop: 4 }}>
              {approveHint} Approving closes the report for everyone and declines the other claims; message them first to arrange the handover.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
