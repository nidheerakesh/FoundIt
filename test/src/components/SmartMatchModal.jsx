import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  ArrowRightLeft, 
  CheckCircle, 
  ShieldCheck, 
  MapPin, 
  Clock, 
  Tag 
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SmartMatchModal({ isOpen, onClose, items }) {
  if (!isOpen) return null;

  const lostItem = items.find(i => i.id === 'item-1');
  const foundItem = items.find(i => i.id === 'item-2');
  const [resolved, setResolved] = useState(false);

  const handleConfirmMatch = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });
    setResolved(true);
  };

  return (
    <div className="modal-overlay">
      <div className="glass-panel" style={{
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '28px',
        position: 'relative'
      }}>
        {/* Close Button */}
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

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#fcd34d',
            borderRadius: '20px',
            padding: '4px 16px',
            fontSize: '0.8rem',
            fontWeight: 700,
            marginBottom: '10px'
          }}>
            <Sparkles size={16} /> Firebase Cloud Function Match Engine
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>
            Smart Lost & Found Pair Match
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Our algorithmic engine detected high similarity between these two campus reports.
          </p>
        </div>

        {resolved ? (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '32px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'var(--gradient-emerald)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: '#fff'
            }}>
              <CheckCircle size={32} />
            </div>
            <h3 style={{ fontSize: '1.4rem', color: '#6ee7b7', fontWeight: 800 }}>Match Resolved Successfully!</h3>
            <p style={{ color: 'var(--text-secondary)', margin: '12px 0 20px 0' }}>
              Handover confirmation code <strong style={{ color: '#fff' }}>#FOUND-9482</strong> generated. 
              The owner can collect the Hydro Flask from Library Security Desk.
            </p>
            <button onClick={onClose} className="btn btn-emerald">
              Close Smart Match Panel
            </button>
          </div>
        ) : (
          <>
            {/* Comparison Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 60px 1fr',
              gap: '16px',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              {/* Lost Card */}
              {lostItem && (
                <div style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px'
                }}>
                  <span className="badge badge-lost" style={{ marginBottom: '8px' }}>Lost Report</span>
                  <img 
                    src={lostItem.image} 
                    alt="Lost" 
                    style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', margin: '8px 0' }}
                  />
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{lostItem.title}</h4>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} color="var(--accent-rose)" /> {lostItem.location}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Clock size={12} /> {lostItem.date}
                    </div>
                  </div>
                </div>
              )}

              {/* Match Connector Indicator */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'var(--gradient-brand)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: 'var(--shadow-glow)'
                }}>
                  <ArrowRightLeft size={20} />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                  94%
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Match</span>
              </div>

              {/* Found Card */}
              {foundItem && (
                <div style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px'
                }}>
                  <span className="badge badge-found" style={{ marginBottom: '8px' }}>Found Report</span>
                  <img 
                    src={foundItem.image} 
                    alt="Found" 
                    style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', margin: '8px 0' }}
                  />
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{foundItem.title}</h4>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} color="var(--accent-emerald)" /> {foundItem.location}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Clock size={12} /> {foundItem.date}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Smart Logic Insights */}
            <div style={{
              background: 'rgba(19, 27, 46, 0.6)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} /> Algorithmic Matching Vector Breakdown:
              </h4>
              <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '20px', lineHeight: 1.6 }}>
                <li><strong>Keyword Overlap:</strong> High match on <em>"Blue Hydro Flask"</em> and <em>"Stickers"</em>.</li>
                <li><strong>Geotag Proximity:</strong> <em>Library 2nd Floor</em> desk to <em>Library Security Desk</em> (Distance: &lt; 50m).</li>
                <li><strong>Temporal Window:</strong> Lost 2 hours ago vs Found 30 mins ago.</li>
              </ul>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={handleConfirmMatch}
                className="btn btn-emerald" 
                style={{ flex: 1 }}
              >
                <CheckCircle size={17} /> Confirm Ownership & Trigger Handover
              </button>
              <button onClick={onClose} className="btn btn-secondary">
                Reject Match
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
