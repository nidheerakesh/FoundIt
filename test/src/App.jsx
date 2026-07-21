import React, { useState } from 'react';
import Navbar from './components/Navbar';
import HeroBanner from './components/HeroBanner';
import ItemCard from './components/ItemCard';
import SmartMatchModal from './components/SmartMatchModal';
import ReportModal from './components/ReportModal';
import HandshakeModal from './components/HandshakeModal';
import ChatDrawer from './components/ChatDrawer';
import AdminPanel from './components/AdminPanel';

import { INITIAL_ITEMS } from './data/mockData';
import { 
  Sparkles, 
  MapPin, 
  ShoppingBag, 
  PlusCircle, 
  SearchX, 
  Compass, 
  Users 
} from 'lucide-react';

export default function App() {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [activeTab, setActiveTab] = useState('all'); // all | lost_found | marketplace
  const [selectedLocation, setSelectedLocation] = useState('All Campus Locations');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSmartMatchOpen, setIsSmartMatchOpen] = useState(false);
  const [handshakeItem, setHandshakeItem] = useState(null);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [activeChatItem, setActiveChatItem] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleAddItem = (newItem) => {
    setItems([newItem, ...items]);
    showToast(`Successfully posted "${newItem.title}" to Campus network!`);
  };

  const handleClaim = (item) => {
    setActiveChatItem(item);
    setIsChatDrawerOpen(true);
    showToast(`Initiated claim request for "${item.title}". Chat drawer opened.`);
  };

  const handleInitiateHandshake = (item) => {
    setHandshakeItem(item);
  };

  const handleOpenChat = (item) => {
    setActiveChatItem(item);
    setIsChatDrawerOpen(true);
  };

  const handleFlag = (item) => {
    showToast(`Flagged "${item.title}" for administrator review.`);
  };

  const handleDeleteItem = (id) => {
    setItems(items.filter(i => i.id !== id));
    showToast(`Item removed from platform.`);
  };

  // Filtering Logic
  const filteredItems = items.filter((item) => {
    // Tab Filter
    if (activeTab === 'lost_found' && item.type !== 'lost' && item.type !== 'found') return false;
    if (activeTab === 'marketplace' && item.type !== 'marketplace') return false;

    // Location Filter
    if (selectedLocation !== 'All Campus Locations' && !item.location.toLowerCase().includes(selectedLocation.toLowerCase().split(' ')[0])) {
      return false;
    }

    // Category Filter
    if (selectedCategory !== 'All Categories' && item.category !== selectedCategory) {
      return false;
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchLoc = item.location.toLowerCase().includes(q);
      const matchTag = item.tags && item.tags.some(t => t.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchLoc || matchTag;
    }

    return true;
  });

  const smartMatchCount = items.filter(i => i.matchScore).length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'rgba(19, 27, 46, 0.95)',
          border: '1px solid var(--accent-cyan)',
          boxShadow: '0 10px 30px rgba(56, 189, 248, 0.2)',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          zIndex: 2000,
          fontFamily: 'var(--font-heading)',
          fontWeight: 600,
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <Sparkles size={16} color="var(--accent-cyan)" /> {toastMessage}
        </div>
      )}

      {/* Top Navbar */}
      <Navbar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenReport={() => setIsReportModalOpen(true)}
        onOpenSmartMatches={() => setIsSmartMatchOpen(true)}
        onToggleChat={() => setIsChatDrawerOpen(!isChatDrawerOpen)}
        unreadChat={true}
        smartMatchCount={smartMatchCount}
        isAdmin={isAdmin}
        setIsAdmin={setIsAdmin}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Hero Banner Section */}
      <HeroBanner 
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        onOpenSmartMatches={() => setIsSmartMatchOpen(true)}
      />

      {/* Admin Panel Toggle View */}
      {isAdmin && (
        <AdminPanel 
          items={items} 
          onDeleteItem={handleDeleteItem} 
        />
      )}

      {/* Main Grid Content */}
      <main style={{ flex: 1, padding: '0 16px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        {/* Active Filter Bar Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              {activeTab === 'all' && 'All Campus Feed'}
              {activeTab === 'lost_found' && 'Lost & Found Recovery Feed'}
              {activeTab === 'marketplace' && 'Student Marketplace Board'}
            </h2>
            <span style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-full)',
              padding: '2px 10px',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              fontWeight: 600
            }}>
              {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {(selectedLocation !== 'All Campus Locations' || selectedCategory !== 'All Categories' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedLocation('All Campus Locations');
                setSelectedCategory('All Categories');
                setSearchQuery('');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-cyan)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 ? (
          <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', margin: '20px 0' }}>
            <SearchX size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px auto' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>No items match your filter criteria</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '8px 0 20px 0' }}>
              Try adjusting your search terms, location zone, or category.
            </p>
            <button 
              onClick={() => setIsReportModalOpen(true)}
              className="btn btn-primary"
            >
              <PlusCircle size={16} /> Post First Report
            </button>
          </div>
        ) : (
          /* Cards Grid */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '24px',
            marginBottom: '48px'
          }}>
            {filteredItems.map((item) => (
              <ItemCard 
                key={item.id}
                item={item}
                onClaim={handleClaim}
                onInitiateHandshake={handleInitiateHandshake}
                onOpenChat={handleOpenChat}
                onOpenSmartMatch={() => setIsSmartMatchOpen(true)}
                onFlag={handleFlag}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals & Drawers */}
      <ReportModal 
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onAddItem={handleAddItem}
      />

      <SmartMatchModal 
        isOpen={isSmartMatchOpen}
        onClose={() => setIsSmartMatchOpen(false)}
        items={items}
      />

      <HandshakeModal 
        item={handshakeItem}
        isOpen={Boolean(handshakeItem)}
        onClose={() => setHandshakeItem(null)}
      />

      <ChatDrawer 
        isOpen={isChatDrawerOpen}
        onClose={() => setIsChatDrawerOpen(false)}
        activeItem={activeChatItem}
      />

      {/* Footer */}
      <footer className="glass-panel" style={{
        margin: '0 16px 24px 16px',
        padding: '28px 32px',
        border: '1px solid var(--border-light)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Compass size={18} color="var(--accent-cyan)" />
            <span style={{ fontWeight: 800, fontFamily: 'var(--font-heading)', fontSize: '1rem' }}>
              FoundIt Platform
            </span>
          </div>
          <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
            Full-Stack Web App • Team of 4 Semester Project
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Users size={14} color="var(--accent-cyan)" /> Nidhi R. (Lead & Backend)
          </span>
          <span>•</span>
          <span>Shenza (Frontend UI)</span>
          <span>•</span>
          <span>Shanid (Auth & Admin)</span>
          <span>•</span>
          <span>Hadi (Marketplace)</span>
        </div>
      </footer>
    </div>
  );
}
