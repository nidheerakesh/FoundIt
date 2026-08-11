import { MapPin, Tag, ShieldCheck } from 'lucide-react';
import { CAMPUS_LOCATIONS, CATEGORIES } from '../data/mockData';

export default function HeroFilters({
  selectedLocation,
  setSelectedLocation,
  selectedCategory,
  setSelectedCategory,
  stats,
}) {
  return (
    <section style={{ maxWidth: 1200, margin: '20px auto 8px', padding: '0 16px', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ maxWidth: '52ch' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: 10 }}>
            <ShieldCheck size={14} /> Verified campus community
          </div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, lineHeight: 1.1 }}>
            Lost it, found it, or selling it?
          </h1>
          <p style={{ color: 'var(--ink-secondary)', fontSize: 'var(--text-base)', marginTop: 8 }}>
            One trusted place to recover lost items and trade second-hand goods with students you can verify.
          </p>
        </div>

        {/* Quiet summary — not the big-number hero template */}
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>
          <b style={{ color: 'var(--ink-secondary)' }}>{stats.lostFound}</b> active reports
          {'  ·  '}
          <b style={{ color: 'var(--ink-secondary)' }}>{stats.marketplace}</b> for sale
          {'  ·  '}
          <b style={{ color: 'var(--warn)' }}>{stats.matches}</b> smart matches
        </p>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
        <label style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <MapPin size={15} color="var(--ink-muted)" style={fieldIcon} />
          <select
            className="input"
            style={{ paddingLeft: 34, paddingRight: 28 }}
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            aria-label="Filter by location"
          >
            {CAMPUS_LOCATIONS.map((l) => (
              <option key={l} value={l} style={{ background: 'var(--surface)' }}>{l}</option>
            ))}
          </select>
          <Chevron />
        </label>

        <label style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Tag size={15} color="var(--ink-muted)" style={fieldIcon} />
          <select
            className="input"
            style={{ paddingLeft: 34, paddingRight: 28 }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter by category"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c} style={{ background: 'var(--surface)' }}>{c}</option>
            ))}
          </select>
          <Chevron />
        </label>
      </div>
    </section>
  );
}

const fieldIcon = { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' };

function Chevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
      <path d="M2 4l4 4 4-4" fill="none" stroke="var(--ink-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
