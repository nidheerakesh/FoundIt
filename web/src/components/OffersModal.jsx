import { useEffect, useState } from 'react';
import { X, Inbox, ShieldCheck, MapPin, Check, MessageSquare } from 'lucide-react';
import { subscribeOffers, acceptOffer } from '../lib/deals';

/**
 * The seller's side of a multi-buyer sale: every offer on one listing, and the
 * choice of which to accept.
 *
 * Offers used to be a single field, so a second bidder overwrote the first and
 * the seller never had a choice to make. Accepting promotes an offer to
 * `lastOffer`, which is what opens the two-party confirmation — the rules
 * verify the buyer really made the offer, so this cannot be faked.
 */
export default function OffersModal({ isOpen, onClose, listing, onToast, onOpenChat }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!isOpen || !listing?.id) return undefined;
    setLoading(true);
    setError('');
    return subscribeOffers(
      listing.id,
      (rows) => { setOffers(rows); setLoading(false); },
      (err) => {
        setError(err.code === 'permission-denied'
          ? 'Only the seller can review offers on this listing.'
          : 'Could not load offers.');
        setLoading(false);
      }
    );
  }, [isOpen, listing?.id]);

  if (!isOpen || !listing) return null;

  const acceptedUid = listing.lastOffer?.buyerUid || null;
  const sold = listing.status === 'sold';

  const accept = async (offer) => {
    setBusyId(offer.id);
    setError('');
    try {
      await acceptOffer(listing.id, offer);
      onToast?.(`Accepted ${offer.buyerName}'s offer. Confirm the sale once you have handed it over.`);
    } catch (err) {
      setError(
        err.code === 'permission-denied'
          ? 'That offer can no longer be accepted — the buyer may have withdrawn it.'
          : err.message || 'Could not accept the offer.'
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Review offers">
      <div
        className="surface modal"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(620px, 100%)', maxHeight: '88vh', overflowY: 'auto', padding: 24 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>Offers on your listing</h2>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-icon" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)', marginBottom: 16 }}>
          {listing.title} · {offers.length} offer{offers.length === 1 ? '' : 's'}
          {listing.price ? ` · asking ₹${listing.price.toLocaleString('en-IN')}` : ''}
        </p>

        {error && (
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--lost)', background: 'color-mix(in srgb, var(--lost) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--lost) 28%, transparent)', borderRadius: 'var(--radius-md)', padding: '8px 12px', marginBottom: 14 }}>
            {error}
          </div>
        )}

        {loading && <p style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-sm)', padding: '18px 0' }}>Loading offers…</p>}

        {!loading && !error && offers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--ink-muted)' }}>
            <Inbox size={38} style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: 'var(--text-sm)' }}>No offers yet. They will appear here as buyers send them.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {offers.map((o) => {
            const accepted = o.buyerUid === acceptedUid;
            return (
              <div
                key={o.id}
                style={{
                  border: `1px solid ${accepted ? 'var(--found)' : 'var(--border)'}`,
                  background: accepted ? 'color-mix(in srgb, var(--found) 6%, transparent)' : 'transparent',
                  borderRadius: 'var(--radius-md)',
                  padding: 14,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {o.buyerName}
                    {o.buyerVerified && <ShieldCheck size={13} color="var(--accent)" />}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: 'var(--text-md)' }}>
                    ₹{Number(o.price || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                {o.buyerDept && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', marginBottom: 6 }}>{o.buyerDept}</div>
                )}
                {o.message && (
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-secondary)', marginBottom: 6 }}>{o.message}</p>
                )}
                {o.meetupSpot && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                    <MapPin size={12} /> Suggested handover: {o.meetupSpot}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  {accepted ? (
                    <span className="badge badge-found"><Check size={12} /> Accepted</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busyId === o.id || sold || !!acceptedUid}
                      onClick={() => accept(o)}
                      title={acceptedUid ? 'You have already accepted an offer on this listing' : undefined}
                    >
                      <Check size={14} /> {busyId === o.id ? 'Accepting…' : 'Accept offer'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => { onClose(); onOpenChat?.(listing, { uid: o.buyerUid, name: o.buyerName }); }}
                  >
                    <MessageSquare size={14} /> Message
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {acceptedUid && !sold && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', marginTop: 14 }}>
            Offer accepted. Close this and use <strong>Confirm sale</strong> on the card once you have
            handed the item over — the sale completes only when the buyer confirms too.
          </p>
        )}
      </div>
    </div>
  );
}
