import { MapPin, Clock, Sparkles, MessageCircle, Handshake, Flag, Package } from 'lucide-react';
import TrustBadge from './TrustBadge';

const TYPE_BADGE = {
  lost: { cls: 'badge-lost', label: 'Lost' },
  found: { cls: 'badge-found', label: 'Found' },
  marketplace: { cls: 'badge-market', label: 'For Sale' },
};

const LISTING_LABEL = { Sell: 'Sell', Rent: 'For Rent', Giveaway: 'Free' };

export default function ItemCard({ item, index = 0, onClaim, onChat, onHandshake, onFlag, onSmartMatch }) {
  const badge = TYPE_BADGE[item.type] ?? TYPE_BADGE.marketplace;
  const isMarket = item.type === 'marketplace';

  const priceLabel = isMarket
    ? item.listingType === 'Giveaway' || item.price === 0
      ? 'Free'
      : `₹${item.price.toLocaleString('en-IN')}`
    : null;

  return (
    <article
      className="surface card stagger"
      style={{ display: 'flex', flexDirection: 'column', padding: 16, animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className={`badge ${badge.cls}`}>{badge.label}</span>
          {isMarket && item.listingType && (
            <span className="badge badge-neutral">{LISTING_LABEL[item.listingType]}</span>
          )}
        </div>
        {item.matchScore && (
          <button
            onClick={() => onSmartMatch?.(item)}
            className="badge badge-match"
            style={{ cursor: 'pointer' }}
            title="View smart match"
          >
            <Sparkles size={12} /> {item.matchScore}% match
          </button>
        )}
      </div>

      {/* Title + price */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginTop: 12 }}>
        <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, lineHeight: 1.3 }}>{item.title}</h3>
        {priceLabel && (
          <span
            style={{
              fontWeight: 800,
              fontSize: 'var(--text-md)',
              color: priceLabel === 'Free' ? 'var(--found)' : 'var(--ink)',
              whiteSpace: 'nowrap',
            }}
          >
            {priceLabel}
          </span>
        )}
      </div>

      <p style={{ color: 'var(--ink-secondary)', fontSize: 'var(--text-sm)', margin: '8px 0 14px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {item.description}
      </p>

      {/* Meta */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', marginBottom: 14 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MapPin size={13} /> {item.location}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Clock size={13} /> {item.date}
          {item.condition && (
            <>
              <span aria-hidden>·</span>
              <Package size={13} /> {item.condition}
            </>
          )}
        </span>
      </div>

      {/* Poster + trust */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.reporter}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>{item.dept}</div>
        </div>
        <TrustBadge score={item.trustScore} verified={item.verified} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        {isMarket ? (
          <button className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={() => onHandshake?.(item)}>
            <Handshake size={15} /> Make a deal
          </button>
        ) : (
          <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => onClaim?.(item)}>
            {item.type === 'found' ? 'Claim this' : 'I found it'}
          </button>
        )}
        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onChat?.(item)} title="Message" aria-label="Message">
          <MessageCircle size={15} />
        </button>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onFlag?.(item)} title="Flag for review" aria-label="Flag for review">
          <Flag size={15} />
        </button>
      </div>
    </article>
  );
}
