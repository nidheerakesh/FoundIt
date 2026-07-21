import React from 'react';
import { 
  Sparkles, 
  MapPin, 
  Layers, 
  Zap, 
  CheckCircle2, 
  Repeat, 
  ShieldCheck 
} from 'lucide-react';
import { CAMPUS_LOCATIONS, CATEGORIES } from '../data/mockData';

export default function HeroBanner({ 
  selectedLocation, 
  setSelectedLocation, 
  selectedCategory, 
  setSelectedCategory,
  onOpenSmartMatches
}) {
  return (
    <div className="glass-panel" style={{
      margin: '0 16px 32px 16px',
      padding: '36px 32px',
      position: 'relative',
      overflow: 'hidden',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      {/* Background glow effects */}
      <div style={{
        position: 'absolute',
        top: '-50px',
        right: '-50px',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', alignItems: 'center' }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            color: '#38bdf8',
            borderRadius: '20px',
            padding: '4px 14px',
            fontSize: '0.8rem',
            fontWeight: 600,
            marginBottom: '16px'
          }}>
            <Sparkles size={14} /> AI-Powered Firebase Cloud Matching Active
          </div>

          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 800, 
            lineHeight: 1.15, 
            marginBottom: '14px',
            letterSpacing: '-0.03em' 
          }}>
            Campus Lost, Found & <br />
            <span style={{
              background: 'var(--gradient-brand)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Verified Student Marketplace
            </span>
          </h1>

          <p style={{ 
            fontSize: '1rem', 
            color: 'var(--text-secondary)', 
            maxWidth: '650px', 
            marginBottom: '24px' 
          }}>
            Report lost items with geotagged locations, match with found reports automatically, 
            and safely buy or sell second-hand textbooks, cycles, and hostel gear without strangers.
          </p>

          {/* Quick Filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Locations */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={14} /> Zone:
              </span>
              {CAMPUS_LOCATIONS.map((loc) => {
                const isSelected = selectedLocation === loc;
                return (
                  <button
                    key={loc}
                    onClick={() => setSelectedLocation(loc)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-light)',
                      background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: isSelected ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      fontSize: '0.775rem',
                      fontWeight: isSelected ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
                    }}
                  >
                    {loc}
                  </button>
                );
              })}
            </div>

            {/* Categories */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Layers size={14} /> Category:
              </span>
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--accent-indigo)' : 'var(--border-light)',
                      background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      color: isSelected ? '#a5b4fc' : 'var(--text-secondary)',
                      fontSize: '0.775rem',
                      fontWeight: isSelected ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stats Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div 
            onClick={onOpenSmartMatches}
            style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'var(--transition-fast)'
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: '#fcd34d', fontWeight: 700, textTransform: 'uppercase' }}>
                Automated Matching
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                94% Match Accuracy
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Click to inspect live match pair
              </div>
            </div>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fbbf24'
            }}>
              <Zap size={22} />
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              padding: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-emerald)', fontSize: '0.75rem', fontWeight: 600 }}>
                <CheckCircle2 size={14} /> Recovery Rate
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px' }}>78.4%</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>142 items returned</div>
            </div>

            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              padding: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan)', fontSize: '0.75rem', fontWeight: 600 }}>
                <Repeat size={14} /> Campus Trades
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px' }}>₹48,200</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Student peer deals</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
