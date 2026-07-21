import React from 'react';
import { 
  MapPin, 
  Clock, 
  User, 
  Sparkles, 
  MessageCircle, 
  Handshake, 
  CheckCircle, 
  Tag, 
  AlertTriangle 
} from 'lucide-react';

export default function ItemCard({ 
  item, 
  onClaim, 
  onInitiateHandshake, 
  onOpenChat,
  onOpenSmartMatch,
  onFlag
}) {
  const isLost = item.type === 'lost';
  const isFound = item.type === 'found';
  const isMarketplace = item.type === 'marketplace';

  return (
    <div className="glass-panel hover-card" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      padding: 0
    }}>
      {/* Top Banner & Badge Header */}
      <div style={{ position: 'relative', height: '180px', overflow: 'hidden', background: '#090d16' }}>
        <img 
          src={item.image} 
          alt={item.title} 
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.4s ease'
          }}
        />

        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          display: 'flex',
          gap: '6px',
          alignItems: 'center',
          zIndex: 2
        }}>
          {isLost && <span className="badge badge-lost">Lost Report</span>}
          {isFound && <span className="badge badge-found">Found Report</span>}
          {isMarketplace && <span className="badge badge-marketplace">{item.listingType || 'Marketplace'}</span>}

          {item.matchScore && (
            <span 
              onClick={() => onOpenSmartMatch(item)}
              className="badge badge-match" 
              style={{ cursor: 'pointer' }}
              title="Click to view automated match pair"
            >
              <Sparkles size={11} /> {item.matchScore}% Match
            </span>
          )}
        </div>

        {/* Price Tag for Marketplace */}
        {isMarketplace && (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            background: 'rgba(11, 15, 25, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            fontFamily: 'var(--font-heading)',
            fontWeight: 800,
            fontSize: '1rem',
            color: 'var(--accent-cyan)'
          }}>
            {item.price === 0 ? 'Free (Giveaway)' : `₹${item.price.toLocaleString()}`}
          </div>
        )}
      </div>

      {/* Content Body */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.3 }}>
            {item.title}
          </h3>
          <button 
            onClick={() => onFlag(item)} 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-muted)', 
              cursor: 'pointer',
              padding: '2px'
            }}
            title="Flag item for moderation"
          >
            <AlertTriangle size={15} />
          </button>
        </div>

        <p style={{ 
          fontSize: '0.85rem', 
          color: 'var(--text-secondary)', 
          marginBottom: '16px',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {item.description}
        </p>

        {/* Location & Time Metadata */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={14} color="var(--accent-cyan)" />
            <span>{item.location}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} />
              <span>{item.date}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
              <User size={13} />
              <span>{item.reporter}</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '16px' }}>
            {item.tags.map(t => (
              <span key={t} style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-light)',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '0.7rem',
                color: 'var(--text-muted)'
              }}>
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Action Button Section at Bottom */}
        <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '8px' }}>
          {(isLost || isFound) && (
            <button 
              onClick={() => onClaim(item)}
              className="btn btn-emerald" 
              style={{ flex: 1, padding: '8px 12px', fontSize: '0.825rem' }}
            >
              <CheckCircle size={15} />
              {isLost ? 'I Found This!' : 'Claim Owner'}
            </button>
          )}

          {isMarketplace && (
            <button 
              onClick={() => onInitiateHandshake(item)}
              className="btn btn-primary" 
              style={{ flex: 1, padding: '8px 12px', fontSize: '0.825rem' }}
            >
              <Handshake size={15} /> Handshake Deal
            </button>
          )}

          <button 
            onClick={() => onOpenChat(item)}
            className="btn btn-secondary" 
            style={{ padding: '8px 12px', fontSize: '0.825rem' }}
            title="Chat in-app"
          >
            <MessageCircle size={15} /> Chat
          </button>
        </div>
      </div>
    </div>
  );
}
