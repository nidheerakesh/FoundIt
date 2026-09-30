import { useEffect, useState } from 'react';
import { X, Inbox, ClipboardList, MessageSquare } from 'lucide-react';
import { subscribeMyClaims } from '../lib/claims';

const STATUS = {
  pending: { label: 'Waiting for them', cls: 'badge' },
  approved: { label: 'Approved', cls: 'badge badge-found' },
  rejected: { label: 'Declined', cls: 'badge badge-lost' },
};

/**
 * The claimant's half of the workflow. There are no notifications, so this is
 * where you check what happened to every claim you made — the poster's
 * decision, and whether the item has been marked returned.
 */
export default function MyClaimsModal({ isOpen, onClose, uid, items = [], onOpenChat }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !uid) return undefined;
    setLoading(true);
    setError('');
    return subscribeMyClaims(
      uid,
      (rows) => { setClaims(rows); setLoading(false); },
      (err) => {
        setError(err.code === 'failed-precondition'
          ? 'This needs the claims index — deploy firestore.indexes.json.'
          : 'Could not load your claims.');
        setLoading(false);
      }
    );
  }, [isOpen, uid]);

  if (!isOpen) return null;
  const byId = new Map(items.map((i) => [i.id, i]));

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="My claims">
      <div
        className="surface modal"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(560px, 100%)', maxHeight: '88vh', overflowY: 'auto', padding: 24 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center' }}>
              <ClipboardList size={17} />
            </div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>My claims</h2>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-icon" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{ color: 'var(--lost)', background: 'rgba(220, 38, 38, 0.08)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-sm)', marginBottom: 12 }}>
            {error}
          </div>
        )}

        {loading ? (
          <p style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-sm)' }}>Loading…</p>
        ) : claims.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--ink-muted)' }}>
            <Inbox size={40} style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: 'var(--text-sm)' }}>
              You have not claimed anything. Use <strong>Claim this</strong> on a found item, or
              <strong> I found it</strong> on a lost one.
            </p>
          </div>
        ) : (
          claims.map((c) => {
            const item = byId.get(c.itemId);
            const returned = item?.status === 'resolved';
            const st = STATUS[c.status] || STATUS.pending;
            const verb = c.itemType === 'found' ? 'You said this is yours' : 'You said you found this';
            return (
              <div key={c.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{item?.title || c.itemTitle || 'An item'}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>
                      {verb}{item?.reporter ? ` · posted by ${item.reporter}` : ''}
                    </div>
                  </div>
                  <span className={st.cls}>{st.label}</span>
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-secondary)', margin: '8px 0 10px' }}>
                  {c.status === 'approved' && returned && 'Approved and marked returned. All done.'}
                  {c.status === 'approved' && !returned && 'Approved. Arrange the handover in chat.'}
                  {c.status === 'rejected' && 'They declined this claim.'}
                  {c.status === 'pending' && 'They have not decided yet. Message them if it is urgent.'}
                </p>
                {item && c.status !== 'rejected' && !returned && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { onClose(); onOpenChat?.(item); }}>
                    <MessageSquare size={14} /> Message {item.reporter}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
