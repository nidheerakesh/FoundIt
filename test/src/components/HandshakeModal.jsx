import React, { useState } from 'react';
import { 
  X, 
  Handshake, 
  ShieldCheck, 
  MapPin, 
  Star, 
  CheckCircle2 
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function HandshakeModal({ item, isOpen, onClose }) {
  if (!isOpen || !item) return null;

  const [rating, setRating] = useState(5);
  const [completed, setCompleted] = useState(false);

  const handleConfirmHandshake = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    setCompleted(true);
  };

  return (
    <div className="modal-overlay">
      <div className="glass-panel" style={{
        maxWidth: '560px',
        width: '100%',
        padding: '28px',
        position: 'relative'
      }}>
        {/* Close */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-light)',
            color: 'var(--text-secondary)',
            borderRadius: '50%',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'var(--gradient-brand)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px auto',
            color: '#fff',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <Handshake size={28} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Campus Handshake Deal</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            In-Person Peer Transaction Protocol
          </p>
        </div>

        {completed ? (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '28px',
            textAlign: 'center'
          }}>
            <CheckCircle2 size={40} color="#34d399" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#6ee7b7' }}>
              Handshake Deal Confirmed!
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '8px 0 16px 0' }}>
              You rated <strong>{item.reporter}</strong> with {rating} Stars. 
              The item has been marked as Handshake Complete in campus records.
            </p>
            <button onClick={onClose} className="btn btn-emerald" style={{ width: '100%' }}>
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Item Details */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              gap: '14px',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <img 
                src={item.image} 
                alt={item.title} 
                style={{ width: '70px', height: '70px', borderRadius: '10px', objectFit: 'cover' }}
              />
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{item.title}</h4>
                <div style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', fontWeight: 800, margin: '2px 0' }}>
                  {item.price === 0 ? 'Free Giveaway' : `₹${item.price.toLocaleString()}`}
                </div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={12} /> Meetup Spot: {item.location}
                </div>
              </div>
            </div>

            {/* Campus Trust Banner */}
            <div style={{
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              marginBottom: '20px',
              fontSize: '0.825rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5
            }}>
              <strong style={{ color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <ShieldCheck size={16} /> Campus Peer Handshake Rules:
              </strong>
              Meet safely in open campus areas (Canteen/Library). Inspect item condition before settling via cash or UPI directly with seller. No middleman transaction fees.
            </div>

            {/* Seller Rating Input */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Rate Seller ({item.reporter}):
              </span>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: star <= rating ? '#fbbf24' : 'var(--text-muted)'
                    }}
                  >
                    <Star size={24} fill={star <= rating ? '#fbbf24' : 'none'} />
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={handleConfirmHandshake}
                className="btn btn-primary" 
                style={{ flex: 1 }}
              >
                <Handshake size={18} /> Confirm Handshake Deal
              </button>
              <button onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
