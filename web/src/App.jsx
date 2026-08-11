import { useMemo, useState } from 'react';
import Navbar from './components/Navbar';
import HeroFilters from './components/HeroFilters';
import ItemCard from './components/ItemCard';
import PostModal from './components/PostModal';
import Toast from './components/Toast';
import { INITIAL_ITEMS } from './data/mockData';
import { SearchX, PlusCircle, Compass, Users } from 'lucide-react';

export default function App() {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [activeTab, setActiveTab] = useState('all'); // all | lost_found | marketplace
  const [selectedLocation, setSelectedLocation] = useState('All Campus Locations');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPostOpen, setIsPostOpen] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  const addItem = (item) => {
    setItems((prev) => [item, ...prev]);
    showToast(`Posted "${item.title}" to the campus feed.`);
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (activeTab === 'lost_found' && item.type !== 'lost' && item.type !== 'found') return false;
      if (activeTab === 'marketplace' && item.type !== 'marketplace') return false;

      if (selectedLocation !== 'All Campus Locations') {
        const key = selectedLocation.toLowerCase().split(' ')[0];
        if (!item.location.toLowerCase().includes(key)) return false;
      }
      if (selectedCategory !== 'All Categories' && item.category !== selectedCategory) return false;

      if (q) {
        const hay = [item.title, item.description, item.location, ...(item.tags || [])]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, activeTab, selectedLocation, selectedCategory, searchQuery]);

  const stats = useMemo(
    () => ({
      lostFound: items.filter((i) => i.type === 'lost' || i.type === 'found').length,
      marketplace: items.filter((i) => i.type === 'marketplace').length,
      matches: items.filter((i) => i.matchScore).length,
    }),
    [items]
  );

  const hasFilters =
    selectedLocation !== 'All Campus Locations' || selectedCategory !== 'All Categories' || searchQuery;

  const resetFilters = () => {
    setSelectedLocation('All Campus Locations');
    setSelectedCategory('All Categories');
    setSearchQuery('');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenPost={() => setIsPostOpen(true)}
        smartMatchCount={stats.matches}
      />

      <HeroFilters
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        stats={stats}
      />

      <main style={{ flex: 1, padding: '0 16px', maxWidth: 1200, margin: '20px auto 0', width: '100%' }}>
        {/* Section header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              {activeTab === 'all' && 'All Campus Feed'}
              {activeTab === 'lost_found' && 'Lost & Found Feed'}
              {activeTab === 'marketplace' && 'Student Marketplace'}
            </h2>
            <span className="badge badge-neutral">
              {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="btn btn-ghost btn-sm"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Grid or empty */}
        {filtered.length === 0 ? (
          <div className="surface" style={{ padding: '60px 20px', textAlign: 'center', margin: '20px 0' }}>
            <SearchX size={44} color="var(--ink-muted)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>Nothing matches your filters</h3>
            <p style={{ color: 'var(--ink-secondary)', fontSize: 'var(--text-sm)', margin: '8px 0 20px' }}>
              Try adjusting your search, location, or category.
            </p>
            <button onClick={() => setIsPostOpen(true)} className="btn btn-primary">
              <PlusCircle size={16} /> Post the first report
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 24,
              marginBottom: 48,
            }}
          >
            {filtered.map((item, i) => (
              <ItemCard
                key={item.id}
                item={item}
                index={i}
                onClaim={(i) => showToast(`Claim started for "${i.title}". (chat opens in Phase 2)`)}
                onChat={(i) => showToast(`Opening chat with ${i.reporter}. (Phase 2)`)}
                onHandshake={(i) => showToast(`Deal handshake for "${i.title}". (Phase 2)`)}
                onFlag={(i) => showToast(`Flagged "${i.title}" for moderator review.`)}
                onSmartMatch={(i) => showToast(`Smart match: "${i.title}" — ${i.matchScore}% confidence.`)}
              />
            ))}
          </div>
        )}
      </main>

      <PostModal isOpen={isPostOpen} onClose={() => setIsPostOpen(false)} onSubmit={addItem} />

      <footer
        style={{ maxWidth: 1200, margin: '24px auto', padding: '0 16px', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, borderTop: '1px solid var(--border)', paddingTop: 20 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Compass size={16} color="var(--accent)" />
          <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>FoundIt</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>· Team of 4 semester project</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={13} color="var(--accent)" /> Nidhi
          </span>
          <span>· Shenza · Shanid · Hadi</span>
        </div>
      </footer>

      <Toast message={toast} />
    </div>
  );
}
