import React from 'react';
import { 
  Compass, 
  Search, 
  PlusCircle, 
  MessageSquare, 
  Sparkles, 
  ShieldCheck, 
  ShoppingBag, 
  MapPin, 
  UserCheck 
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  onOpenReport, 
  onOpenSmartMatches, 
  onToggleChat, 
  unreadChat, 
  smartMatchCount,
  isAdmin,
  setIsAdmin,
  searchQuery,
  setSearchQuery
}) {
  return (
    <nav className="glass-panel" style={{
      position: 'sticky',
      top: '12px',
      zIndex: 100,
      margin: '0 16px 24px 16px',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      flexWrap: 'wrap'
    }}>
      {/* Brand & Campus Tag */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'var(--gradient-brand)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-glow)',
          cursor: 'pointer'
        }} onClick={() => setActiveTab('all')}>
          <Compass size={24} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              fontFamily: 'var(--font-heading)', 
              fontWeight: 800, 
              fontSize: '1.25rem',
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              FoundIt
            </span>
            <span style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '20px',
              padding: '2px 8px',
              fontSize: '0.65rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <UserCheck size={11} /> NIT Campus Verified
            </span>
          </div>
          <p style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
            Lost, Found & Student Marketplace
          </p>
        </div>
      </div>

      {/* Center Nav Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(10, 15, 26, 0.6)',
        padding: '4px',
        borderRadius: 'var(--radius-full)',
        border: '1px solid var(--border-light)'
      }}>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            background: activeTab === 'all' ? 'var(--gradient-brand)' : 'transparent',
            color: activeTab === 'all' ? '#fff' : 'var(--text-secondary)',
            fontFamily: 'var(--font-heading)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'var(--transition-fast)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Compass size={15} /> All Items
        </button>

        <button
          onClick={() => setActiveTab('lost_found')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            background: activeTab === 'lost_found' ? 'var(--gradient-brand)' : 'transparent',
            color: activeTab === 'lost_found' ? '#fff' : 'var(--text-secondary)',
            fontFamily: 'var(--font-heading)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'var(--transition-fast)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <MapPin size={15} /> Lost & Found
        </button>

        <button
          onClick={() => setActiveTab('marketplace')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            background: activeTab === 'marketplace' ? 'var(--gradient-brand)' : 'transparent',
            color: activeTab === 'marketplace' ? '#fff' : 'var(--text-secondary)',
            fontFamily: 'var(--font-heading)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'var(--transition-fast)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <ShoppingBag size={15} /> Marketplace
        </button>

        <button
          onClick={onOpenSmartMatches}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#fcd34d',
            fontFamily: 'var(--font-heading)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'var(--transition-fast)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            position: 'relative'
          }}
        >
          <Sparkles size={15} /> Smart Matches
          {smartMatchCount > 0 && (
            <span style={{
              background: 'var(--accent-amber)',
              color: '#000',
              borderRadius: '10px',
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '1px 6px'
            }}>
              {smartMatchCount}
            </span>
          )}
        </button>
      </div>

      {/* Search & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Search Bar */}
        <div style={{ position: 'relative', width: '210px' }}>
          <Search size={16} color="var(--text-muted)" style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)'
          }} />
          <input 
            type="text" 
            placeholder="Search items, keywords..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '36px', height: '38px', fontSize: '0.825rem' }}
          />
        </div>

        {/* Post Button */}
        <button 
          onClick={onOpenReport}
          className="btn btn-primary"
          style={{ height: '38px', padding: '0 16px', fontSize: '0.85rem' }}
        >
          <PlusCircle size={17} /> Post / Report
        </button>

        {/* Chat Drawer Toggle */}
        <button 
          onClick={onToggleChat}
          className="btn btn-secondary"
          style={{ 
            height: '38px', 
            width: '38px', 
            padding: 0, 
            borderRadius: '12px',
            position: 'relative' 
          }}
          title="In-App Campus Messages"
        >
          <MessageSquare size={18} />
          {unreadChat && (
            <span style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              background: 'var(--accent-rose)',
              boxShadow: '0 0 8px var(--accent-rose)'
            }} />
          )}
        </button>

        {/* Admin Mode Toggle */}
        <button 
          onClick={() => setIsAdmin(!isAdmin)}
          className="btn btn-secondary"
          style={{
            height: '38px',
            padding: '0 12px',
            borderRadius: '12px',
            fontSize: '0.8rem',
            color: isAdmin ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            borderColor: isAdmin ? 'rgba(56, 189, 248, 0.4)' : 'var(--border-light)'
          }}
        >
          <ShieldCheck size={16} color={isAdmin ? 'var(--accent-cyan)' : 'currentColor'} />
          {isAdmin ? 'Admin View' : 'User View'}
        </button>
      </div>
    </nav>
  );
}
