import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  UserCheck, 
  CheckCircle, 
  Trash2, 
  Activity, 
  Database, 
  Lock 
} from 'lucide-react';
import { ADMIN_FLAGS } from '../data/mockData';

export default function AdminPanel({ items, onDeleteItem }) {
  const [flags, setFlags] = useState(ADMIN_FLAGS);

  const handleResolveFlag = (id) => {
    setFlags(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div style={{ padding: '0 16px', marginBottom: '32px' }}>
      <div className="glass-panel" style={{ padding: '28px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={24} color="var(--accent-cyan)" />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Campus Admin & Moderation Center</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
              Role-Based Access Control • Firestore Security Rules • Moderation Queue
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '0.775rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Lock size={12} /> Firestore Rules Active
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.775rem', fontWeight: 600 }}>Total Verified Users</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '4px' }}>1,480</div>
            <div style={{ fontSize: '0.725rem', color: 'var(--accent-emerald)', marginTop: '2px' }}>@campus.edu domain verified</div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.775rem', fontWeight: 600 }}>Active Posts & Listings</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '4px' }}>{items.length}</div>
            <div style={{ fontSize: '0.725rem', color: 'var(--accent-cyan)', marginTop: '2px' }}>Live across 7 campus zones</div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.775rem', fontWeight: 600 }}>Pending Flags</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '4px', color: flags.length > 0 ? 'var(--accent-amber)' : 'inherit' }}>{flags.length}</div>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '2px' }}>Requires moderator action</div>
          </div>
        </div>

        {/* Flagged Content Queue */}
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} color="var(--accent-amber)" /> Moderation & Review Queue
        </h3>

        {flags.length === 0 ? (
          <div style={{ padding: '24px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: '#6ee7b7' }}>
            ✨ All reported posts resolved! Campus platform is clean.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {flags.map((flag) => (
              <div 
                key={flag.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{flag.itemTitle}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-rose)', marginTop: '2px' }}>
                    Reason: {flag.reason}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Reported by {flag.reportedBy} • {flag.date}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => handleResolveFlag(flag.id)}
                    className="btn btn-emerald btn-sm"
                  >
                    <CheckCircle size={14} /> Approve & Dismiss Flag
                  </button>

                  <button 
                    onClick={() => handleResolveFlag(flag.id)}
                    className="btn btn-secondary btn-sm"
                    style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                  >
                    <Trash2 size={14} /> Remove Item
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
