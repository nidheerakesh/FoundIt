import React, { useState } from 'react';
import { 
  X, 
  PlusCircle, 
  MapPin, 
  Tag, 
  Image as ImageIcon, 
  DollarSign, 
  AlertCircle 
} from 'lucide-react';
import { CAMPUS_LOCATIONS, CATEGORIES } from '../data/mockData';

export default function ReportModal({ isOpen, onClose, onAddItem }) {
  if (!isOpen) return null;

  const [postType, setPostType] = useState('lost'); // lost | found | marketplace
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Accessories');
  const [location, setLocation] = useState('Main Central Library');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [listingType, setListingType] = useState('Sell');
  const [imageUrl, setImageUrl] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const defaultImage = postType === 'marketplace' 
      ? 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80'
      : postType === 'found'
      ? '/images/calculator.png'
      : '/images/bottle.png';

    const newItem = {
      id: `item-${Date.now()}`,
      type: postType,
      title,
      category,
      location,
      date: 'Just now',
      description,
      price: postType === 'marketplace' ? parseFloat(price) || 0 : undefined,
      listingType: postType === 'marketplace' ? listingType : undefined,
      image: imageUrl.trim() || defaultImage,
      reporter: 'Nidhi Rakesh (Verified)',
      contact: 'nidhi@campus.edu',
      status: postType === 'marketplace' ? 'Available' : 'Active',
      tags: [category, location.split(' ')[0]]
    };

    onAddItem(newItem);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="glass-panel" style={{
        maxWidth: '620px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
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

        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '6px' }}>
          Post Item to Campus Network
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '20px' }}>
          Verified NIT campus posting • Reach classmates instantly
        </p>

        {/* Post Type Selector */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '8px',
          background: 'rgba(10, 15, 26, 0.6)',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          border: '1px solid var(--border-light)'
        }}>
          <button
            type="button"
            onClick={() => setPostType('lost')}
            style={{
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: postType === 'lost' ? 'var(--gradient-rose)' : 'transparent',
              color: postType === 'lost' ? '#fff' : 'var(--text-secondary)',
              fontFamily: 'var(--font-heading)',
              fontWeight: 600,
              fontSize: '0.825rem',
              cursor: 'pointer'
            }}
          >
            🔴 Lost Item
          </button>

          <button
            type="button"
            onClick={() => setPostType('found')}
            style={{
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: postType === 'found' ? 'var(--gradient-emerald)' : 'transparent',
              color: postType === 'found' ? '#fff' : 'var(--text-secondary)',
              fontFamily: 'var(--font-heading)',
              fontWeight: 600,
              fontSize: '0.825rem',
              cursor: 'pointer'
            }}
          >
            🟢 Found Item
          </button>

          <button
            type="button"
            onClick={() => setPostType('marketplace')}
            style={{
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: postType === 'marketplace' ? 'var(--gradient-brand)' : 'transparent',
              color: postType === 'marketplace' ? '#fff' : 'var(--text-secondary)',
              fontFamily: 'var(--font-heading)',
              fontWeight: 600,
              fontSize: '0.825rem',
              cursor: 'pointer'
            }}
          >
            🛒 Marketplace
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Item Title *
            </label>
            <input 
              type="text"
              required
              placeholder={postType === 'lost' ? 'e.g. Blue Hydro Flask 32oz' : postType === 'found' ? 'e.g. Casio Scientific Calculator' : 'e.g. Engineering Maths Book'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Category
              </label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-field"
                style={{ height: '42px' }}
              >
                {CATEGORIES.filter(c => c !== 'All Categories').map(c => (
                  <option key={c} value={c} style={{ background: '#0b0f19', color: '#fff' }}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Campus Location Zone
              </label>
              <select 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="input-field"
                style={{ height: '42px' }}
              >
                {CAMPUS_LOCATIONS.filter(l => l !== 'All Campus Locations').map(l => (
                  <option key={l} value={l} style={{ background: '#0b0f19', color: '#fff' }}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {postType === 'marketplace' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Price (₹)
                </label>
                <input 
                  type="number"
                  min="0"
                  placeholder="0 for Giveaway"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Listing Type
                </label>
                <select 
                  value={listingType}
                  onChange={(e) => setListingType(e.target.value)}
                  className="input-field"
                  style={{ height: '42px' }}
                >
                  <option value="Sell" style={{ background: '#0b0f19' }}>Sell</option>
                  <option value="Rent" style={{ background: '#0b0f19' }}>Rent</option>
                  <option value="Giveaway" style={{ background: '#0b0f19' }}>Giveaway (Free)</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Detailed Description *
            </label>
            <textarea 
              required
              rows={3}
              placeholder="Provide distinctive features, color, brand, condition, or exact spot..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Image URL (Optional)
            </label>
            <input 
              type="text"
              placeholder="https://... or leave blank for default image"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="input-field"
            />
          </div>

          <div style={{ marginTop: '10px', display: 'flex', gap: '12px' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              <PlusCircle size={18} /> Publish {postType.toUpperCase()} Post
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
