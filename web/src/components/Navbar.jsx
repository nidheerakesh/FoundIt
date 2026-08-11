import { Compass, Search, PlusCircle, Sparkles } from 'lucide-react';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'lost_found', label: 'Lost & Found' },
  { key: 'marketplace', label: 'Marketplace' },
];

export default function Navbar({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  onOpenPost,
  smartMatchCount,
}) {
  return (
    <header
      className="glass-nav"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-sticky)',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: 'var(--accent)',
            color: 'var(--accent-ink)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Compass size={19} />
        </div>
        <div style={{ fontWeight: 800, fontSize: 'var(--text-md)', letterSpacing: '-0.02em' }}>
          FoundIt
        </div>
      </div>

      {/* Tabs — segmented control */}
      <nav
        role="tablist"
        style={{ display: 'flex', gap: 2, background: 'var(--surface)', padding: 3, borderRadius: 'var(--radius-full)', border: '1px solid var(--border)' }}
      >
        {TABS.map((t) => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(t.key)}
              style={{
                border: 'none',
                cursor: 'pointer',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                fontFamily: 'inherit',
                color: active ? 'var(--accent-ink)' : 'var(--ink-secondary)',
                background: active ? 'var(--accent)' : 'transparent',
                transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* Search */}
      <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
        <Search size={16} color="var(--ink-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          className="input"
          style={{ paddingLeft: 36 }}
          placeholder="Search items, tags, locations…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search"
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {smartMatchCount > 0 && (
          <span className="badge badge-match" title="Smart match suggestions">
            <Sparkles size={13} /> {smartMatchCount} match{smartMatchCount === 1 ? '' : 'es'}
          </span>
        )}
        <button className="btn btn-primary btn-sm" onClick={onOpenPost}>
          <PlusCircle size={15} /> Post
        </button>
      </div>
    </header>
  );
}
