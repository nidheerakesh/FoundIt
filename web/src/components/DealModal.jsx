import { useState, useEffect } from 'react';
import { X, Handshake, Star, CheckCircle, ShieldCheck, MapPin, Send, AlertTriangle } from 'lucide-react';
import { makeDealOffer, confirmDeal, submitReview } from '../lib/deals';
import { CAMPUS_LOCATIONS } from '../data/mockData';
import { analyzeListingForFraud } from '../lib/ai';

export default function DealModal({
  isOpen,
  onClose,
  listing,
  currentUser,
  onDealSuccess,
  onOpenChat,
}) {
  const [offerPrice, setOfferPrice] = useState('');
  const [meetupSpot, setMeetupSpot] = useState('Central Mess & Canteen');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  // offer → confirm → (waiting) → review → done. Confirming and reviewing are
  // separate steps: a review is only allowed once BOTH parties have confirmed
  // and the listing is sold, so chaining them in one click could never succeed.
  const [step, setStep] = useState('offer');
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [error, setError] = useState('');
  const [fraudAnalysis, setFraudAnalysis] = useState(null);

  useEffect(() => {
    if (isOpen && listing) {
      analyzeListingForFraud(listing).then(setFraudAnalysis);
    } else {
      setFraudAnalysis(null);
    }
  }, [isOpen, listing?.id]);

  const uid = currentUser?.uid;
  const isSeller = !!uid && listing?.sellerUid === uid;
  const isOfferingBuyer = !!uid && listing?.lastOffer?.buyerUid === uid;

  useEffect(() => {
    if (!isOpen || !listing) return;
    setError('');
    if (listing.status === 'sold') setStep(isOfferingBuyer ? 'review' : 'done');
    else if (isSeller) setStep(listing.lastOffer ? 'confirm' : 'noOffer');
    else if (isOfferingBuyer) setStep(listing.confirmations?.buyer ? 'waiting' : 'confirm');
    else setStep('offer');
  }, [isOpen, listing?.id]);

  if (!isOpen || !listing) return null;

  const currentPrice = listing.listingType === 'Giveaway' ? 0 : (listing.price ?? 0);
  const initialOffer = offerPrice !== '' ? offerPrice : currentPrice;

  const handleProposeDeal = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await makeDealOffer(
        listing.id,
        {
          offerPrice: Number(initialOffer) || 0,
          meetupSpot,
          message: note,
        },
        currentUser
      );
      setStep('confirm');
      onDealSuccess?.(`Offer sent for "${listing.title}". Confirm once you have met.`);
    } catch (err) {
      setError(err.message || 'Failed to submit deal proposal.');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await confirmDeal(listing.id, uid);
      if (res?.status === 'sold') {
        // Only the buyer reviews here; the seller is done.
        setStep(isSeller ? 'done' : 'review');
        onDealSuccess?.(`Deal complete — "${listing.title}" is sold.`);
      } else {
        setStep('waiting');
        onDealSuccess?.('Confirmed. Waiting for the other party.');
      }
    } catch (err) {
      setError(err.message || 'Could not confirm the deal.');
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteAndReview = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (!listing.sellerUid) throw new Error('This listing has no seller on record.');
      await submitReview(
        { listingId: listing.id, sellerUid: listing.sellerUid, rating, comment: reviewComment },
        currentUser
      );
      setStep('done');
      onDealSuccess?.(`Review saved for ${listing.reporter}.`);
    } catch (err) {
      setError(err.message || 'Failed to record review.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Make a deal">
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
                background: 'rgba(21, 128, 61, 0.12)',
                color: 'var(--found)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Handshake size={18} />
            </div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>Campus Deal Handshake</h2>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-icon" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Item context banner */}
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
            <div style={{ fontWeight: 700 }}>{listing.title}</div>
            <div style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-xs)' }}>
              Seller: {listing.reporter} · {listing.condition || 'Good'}
            </div>
          </div>
          <span style={{ fontWeight: 800, fontSize: 'var(--text-md)', color: 'var(--found)' }}>
            {listing.listingType === 'Giveaway' || listing.price === 0 ? 'Free' : `₹${listing.price}`}
          </span>
        </div>

        {/* AI Fraud Analysis */}
        {fraudAnalysis && fraudAnalysis.riskLevel !== 'low' && (
          <div style={{
            padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: 14,
            background: fraudAnalysis.riskLevel === 'high' ? 'rgba(220, 38, 38, 0.08)' : 'rgba(180, 83, 9, 0.08)',
            border: `1px solid ${fraudAnalysis.riskLevel === 'high' ? 'rgba(220, 38, 38, 0.2)' : 'rgba(180, 83, 9, 0.2)'}`,
            fontSize: 'var(--text-sm)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 4, color: fraudAnalysis.riskLevel === 'high' ? 'var(--lost)' : 'var(--warn)' }}>
              <AlertTriangle size={14} />
              {fraudAnalysis.riskLevel === 'high' ? 'High Risk Listing' : 'Caution Advised'}
            </div>
            <div style={{ color: 'var(--ink-secondary)', fontSize: 'var(--text-xs)' }}>
              {fraudAnalysis.flags.join(' · ')}
            </div>
            <div style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-xs)', marginTop: 4, fontStyle: 'italic' }}>
              {fraudAnalysis.recommendation}
            </div>
          </div>
        )}

        {step === 'offer' && (
          <form onSubmit={handleProposeDeal}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <label style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: 6 }}>
                  Your Offer Price (₹)
                </span>
                <input
                  type="number"
                  className="input"
                  min="0"
                  value={initialOffer}
                  disabled={listing.listingType === 'Giveaway'}
                  onChange={(e) => setOfferPrice(e.target.value)}
                />
              </label>

              <label style={{ flex: 1.2 }}>
                <span style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: 6 }}>
                  Campus Handover Spot
                </span>
                <select
                  className="input"
                  value={meetupSpot}
                  onChange={(e) => setMeetupSpot(e.target.value)}
                >
                  {CAMPUS_LOCATIONS.filter((l) => l !== 'All Campus Locations').map((loc) => (
                    <option key={loc} value={loc} style={{ background: 'var(--surface)' }}>
                      {loc}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label style={{ display: 'block', marginBottom: 14 }}>
              <span style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: 6 }}>
                Note to Seller (Pickup timing, payment preference)
              </span>
              <textarea
                className="input"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Can meet near the canteen after 5pm, UPI or cash ready."
              />
            </label>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 'var(--text-xs)',
                color: 'var(--ink-muted)',
                marginBottom: 16,
                padding: '8px 12px',
                background: 'rgba(22, 101, 52, 0.06)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <ShieldCheck size={16} color="var(--accent)" />
              Always conduct transactions in well-lit public campus locations.
            </div>

            {error && (
              <div style={{ color: 'var(--lost)', background: 'rgba(220, 38, 38, 0.1)', padding: 8, borderRadius: 6, fontSize: 'var(--text-xs)', marginBottom: 12 }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-success" style={{ width: '100%' }} disabled={busy}>
              {busy ? 'Proposing deal…' : 'Propose Deal Handshake'}
            </button>
          </form>
        )}

        {step === 'noOffer' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 6 }}>This is your listing</h3>
            <p style={{ color: 'var(--ink-secondary)', fontSize: 'var(--text-sm)' }}>
              No offers yet. When a buyer makes one, you will confirm the sale here.
            </p>
          </div>
        )}

        {step === 'confirm' && (
          <div>
            <div style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: 14, fontSize: 'var(--text-sm)' }}>
              {isSeller ? (
                <>
                  <div style={{ fontWeight: 700 }}>{listing.lastOffer?.buyerName || 'A student'} offered ₹{listing.lastOffer?.price ?? 0}</div>
                  <div style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-xs)', marginTop: 2 }}>
                    Meet at {listing.lastOffer?.meetupSpot || 'a campus zone'}
                    {listing.lastOffer?.message ? ` · "${listing.lastOffer.message}"` : ''}
                  </div>
                </>
              ) : (
                <div style={{ fontWeight: 700 }}>Offer sent to {listing.reporter}</div>
              )}
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-secondary)', marginBottom: 14 }}>
              Confirm only after you have met and exchanged the item. The listing is marked sold once
              <strong> both</strong> of you confirm — neither side can do it alone.
            </p>
            {error && (
              <div style={{ color: 'var(--lost)', background: 'rgba(220, 38, 38, 0.1)', padding: 8, borderRadius: 6, fontSize: 'var(--text-xs)', marginBottom: 12 }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-ghost btn-sm" style={{ flex: 1 }}
                onClick={() => { onClose(); onOpenChat?.(listing); }}>
                <Send size={14} /> Open chat
              </button>
              <button type="button" className="btn btn-success btn-sm" style={{ flex: 1 }} disabled={busy} onClick={handleConfirm}>
                <Handshake size={14} /> {busy ? 'Confirming…' : isSeller ? 'Confirm sale' : 'Confirm deal'}
              </button>
            </div>
          </div>
        )}

        {step === 'waiting' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle size={36} color="var(--found)" style={{ margin: '0 auto 8px' }} />
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 6 }}>You have confirmed</h3>
            <p style={{ color: 'var(--ink-secondary)', fontSize: 'var(--text-sm)', marginBottom: 16 }}>
              Waiting for {isSeller ? 'the buyer' : listing.reporter} to confirm. It is marked sold once both of you have.
            </p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { onClose(); onOpenChat?.(listing); }}>
              <Send size={14} /> Message them
            </button>
          </div>
        )}

        {step === 'review' && (
          <form onSubmit={handleCompleteAndReview}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <CheckCircle size={36} color="var(--found)" style={{ margin: '0 auto 8px' }} />
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>Deal complete — it&apos;s sold</h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-secondary)', marginTop: 4 }}>
                Both of you confirmed. Rate {listing.reporter} to build their campus trust score.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, margin: '14px 0' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                  aria-label={`${star} star`}
                >
                  <Star
                    size={28}
                    fill={star <= rating ? 'var(--warn)' : 'none'}
                    color={star <= rating ? 'var(--warn)' : 'var(--ink-muted)'}
                  />
                </button>
              ))}
            </div>

            <label style={{ display: 'block', marginBottom: 14 }}>
              <span style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: 6 }}>
                Review / Feedback (optional)
              </span>
              <input
                className="input"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="e.g. Smooth trade, bike in exact described condition!"
              />
            </label>

            {error && (
              <div style={{ color: 'var(--lost)', background: 'rgba(220, 38, 38, 0.1)', padding: 8, borderRadius: 6, fontSize: 'var(--text-xs)', marginBottom: 12 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ flex: 1 }}
                onClick={() => {
                  onClose();
                  onOpenChat?.(listing);
                }}
              >
                <Send size={14} /> Open chat
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
                disabled={busy}
              >
                {busy ? 'Saving review…' : 'Submit review'}
              </button>
            </div>
          </form>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle size={44} color="var(--found)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 6 }}>
              Transaction Complete!
            </h3>
            <p style={{ color: 'var(--ink-secondary)', fontSize: 'var(--text-sm)', marginBottom: 18 }}>
              The listing is marked sold. Thanks for trading on campus.
            </p>
            <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
