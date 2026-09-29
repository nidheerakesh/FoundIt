import { useMemo, useState, useEffect } from 'react';

import Navbar from './components/Navbar';
import HeroFilters from './components/HeroFilters';
import ItemCard from './components/ItemCard';
import PostModal from './components/PostModal';
import Toast from './components/Toast';
import SmartMatchModal from './components/SmartMatchModal';
import ClaimModal from './components/ClaimModal';
import ChatModal from './components/ChatModal';
import DealModal from './components/DealModal';
import FlagModal from './components/FlagModal';
import AIAssistantModal from './components/AIAssistantModal';
import ProfileModal from './components/ProfileModal';
import ModerationPanel from './components/ModerationPanel';
import HowItWorks from './components/HowItWorks';
import { INITIAL_ITEMS } from './data/mockData';
import { useFeed } from './hooks/useFeed';
import { addLostFound, addListing } from './lib/feed';
import { findMatchesForItem } from './lib/matching';
import { useAuth } from './auth/AuthContext';
import AuthModal from './auth/AuthModal';
import AccountMenu from './auth/AccountMenu';
import VerifyBanner from './auth/VerifyBanner';
import { SearchX, PlusCircle, Compass, Users, Moon, Sun, Sparkles } from 'lucide-react';

export default function App() {
  const { isAuthed, isVerified, poster, user, redirectError } = useAuth();
  const { items: liveItems, loading, error } = useFeed();
  // Fall back to mock data if the emulator/backend isn't reachable, so dev never breaks.
  const items = error || (!loading && liveItems.length === 0) ? INITIAL_ITEMS : liveItems;

  const [activeTab, setActiveTab] = useState('all'); // all | lost_found | marketplace
  const [selectedLocation, setSelectedLocation] = useState('All Campus Locations');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPostOpen, setIsPostOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [activeMatchResult, setActiveMatchResult] = useState(null);
  const [isClaimOpen, setIsClaimOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDealOpen, setIsDealOpen] = useState(false);
  const [isFlagOpen, setIsFlagOpen] = useState(false);
  const [isSmartMatchOpen, setIsSmartMatchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isModerationOpen, setIsModerationOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('foundit-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  // A rejected Google redirect lands on a freshly loaded page with the auth
  // modal closed, so the reason was invisible and the user just saw themselves
  // signed out. Reopen the modal, which renders the error.
  useEffect(() => {
    if (redirectError) {
      setIsAuthOpen(true);
      showToast(redirectError);
    }
  }, [redirectError]);

  // Only signed-in + verified users can post (SRS FR-1).
  const openPost = () => {
    if (!isAuthed) { showToast('Sign in with your campus account to post.'); setIsAuthOpen(true); return; }
    if (!isVerified) { showToast('Verify your email before posting.'); return; }
    setIsPostOpen(true);
  };

  const handleOpenClaim = (target) => {
    if (!isAuthed) { showToast('Sign in with your campus account to claim items.'); setIsAuthOpen(true); return; }
    setActiveItem(target);
    setIsClaimOpen(true);
  };

  const handleOpenChat = (target) => {
    if (!isAuthed) { showToast('Sign in with your campus account to message students.'); setIsAuthOpen(true); return; }
    setActiveItem(target);
    setIsChatOpen(true);
  };

  const handleOpenHandshake = (target) => {
    if (!isAuthed) { showToast('Sign in with your campus account to propose a deal.'); setIsAuthOpen(true); return; }
    setActiveItem(target);
    setIsDealOpen(true);
  };

  const handleOpenFlag = (target) => {
    if (!isAuthed) { showToast('Sign in with your campus account to report content.'); setIsAuthOpen(true); return; }
    setActiveItem(target);
    setIsFlagOpen(true);
  };

  const handleOpenSmartMatch = (target) => {
    const candidateMatches = findMatchesForItem(target, items);
    setActiveItem(target);
    setActiveMatchResult(candidateMatches[0] || null);
    setIsSmartMatchOpen(true);
  };

  const addItem = async (form) => {
    try {
      const activePoster = poster || {
        uid: user?.uid || 'guest-uid',
        name: user?.displayName || (user?.email || '').split('@')[0] || 'Student',
        dept: 'Campus',
        verified: !!user?.emailVerified,
        trustScore: 50,
      };
      if (form.type === 'marketplace') await addListing(form, activePoster);
      else await addLostFound(form, activePoster);
      showToast(`Posted "${form.title}" to the campus feed.`);
    } catch (err) {
      showToast(`Could not post — ${err.code || err.message}`);
    }
  };
  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
    localStorage.setItem('foundit-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (activeTab === 'lost_found' && item.type !== 'lost' && item.type !== 'found') return false;
      if (activeTab === 'marketplace' && item.type !== 'marketplace') return false;

      if (selectedLocation !== 'All Campus Locations') {
        const targetLoc = selectedLocation.toLowerCase();
        const itemLoc = (item.location || '').toLowerCase();
        const locKeywords = targetLoc
          .replace(/[&(),]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length > 2 && w !== 'complex' && w !== 'central' && w !== 'all');
        const matches = itemLoc.includes(targetLoc) ||
          targetLoc.includes(itemLoc) ||
          locKeywords.some((w) => itemLoc.includes(w));
        if (!matches) return false;
      }
      if (selectedCategory !== 'All Categories' && item.category !== selectedCategory) return false;

      if (q) {
        const hay = [item.title || '', item.description || '', item.location || '', ...(item.tags || [])]
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
        onOpenPost={openPost}
        smartMatchCount={stats.matches}
        accountSlot={<AccountMenu onLogin={() => setIsAuthOpen(true)} onOpenProfile={() => setIsProfileOpen(true)} onOpenModeration={() => setIsModerationOpen(true)} />}
        onOpenAI={() => setIsAIOpen(true)}
      />

      {isAuthed && !isVerified && <VerifyBanner />}

      <HeroFilters
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        stats={stats}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
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

        {/* Loading / grid / empty */}
        {loading && !error ? (
          <div
            className="card-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24, marginBottom: 48 }}
            aria-busy="true"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton skeleton-badge" />
                <div className="skeleton skeleton-line w-80" />
                <div className="skeleton skeleton-line w-60" />
                <div className="skeleton skeleton-line w-40" />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                  <div className="skeleton skeleton-avatar" />
                  <div className="skeleton skeleton-line w-40" style={{ flex: 1 }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="surface" style={{ padding: '60px 20px', textAlign: 'center', margin: '20px 0' }}>
            <SearchX size={44} color="var(--ink-muted)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>Nothing matches your filters</h3>
            <p style={{ color: 'var(--ink-secondary)', fontSize: 'var(--text-sm)', margin: '8px 0 20px' }}>
              Try adjusting your search, location, or category.
            </p>
            <button onClick={openPost} className="btn btn-primary">
              <PlusCircle size={16} /> Post the first report
            </button>
          </div>
        ) : (
          <div
            className="card-grid"
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
                onClaim={handleOpenClaim}
                onChat={handleOpenChat}
                onHandshake={handleOpenHandshake}
                onFlag={handleOpenFlag}
                onSmartMatch={handleOpenSmartMatch}
              />
            ))}
          </div>
        )}
      </main>

      <PostModal isOpen={isPostOpen} onClose={() => setIsPostOpen(false)} onSubmit={addItem} />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <ModerationPanel isOpen={isModerationOpen} onClose={() => setIsModerationOpen(false)} onToast={showToast} />

      <ClaimModal
        isOpen={isClaimOpen}
        onClose={() => setIsClaimOpen(false)}
        item={activeItem}
        user={poster || user}
        onClaimSuccess={(msg) => showToast(msg)}
        onOpenChat={(it) => handleOpenChat(it)}
      />

      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        item={activeItem}
        currentUser={poster || user}
      />

      <DealModal
        isOpen={isDealOpen}
        onClose={() => setIsDealOpen(false)}
        listing={activeItem}
        currentUser={poster || user}
        onDealSuccess={(msg) => showToast(msg)}
        onOpenChat={(it) => handleOpenChat(it)}
      />

      <FlagModal
        isOpen={isFlagOpen}
        onClose={() => setIsFlagOpen(false)}
        item={activeItem}
        currentUser={poster || user}
        onFlagSuccess={(msg) => showToast(msg)}
      />

      <SmartMatchModal
        isOpen={isSmartMatchOpen}
        onClose={() => setIsSmartMatchOpen(false)}
        targetItem={activeItem}
        matchResult={activeMatchResult}
        onOpenChat={(it) => handleOpenChat(it)}
        onOpenClaim={(it) => handleOpenClaim(it)}
      />

      <AIAssistantModal
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        allItems={items}
        onSelectItem={(item) => {
          if (item.matchScore) handleOpenSmartMatch(item);
          else if (item.type === 'marketplace') handleOpenHandshake(item);
          else handleOpenClaim(item);
        }}
      />

      <HowItWorks />

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

      <button
        onClick={() => setDarkMode((prev) => !prev)}
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          width: 46,
          height: 46,
          borderRadius: '50%',
          border: '1px solid var(--border-strong)',
          background: 'var(--surface)',
          color: 'var(--ink-heading)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 'var(--z-toast)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {darkMode ? <Sun size={19} /> : <Moon size={19} />}
      </button>
    </div>
  );
}
