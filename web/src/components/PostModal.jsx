import { useState } from 'react';
import { X, PlusCircle } from 'lucide-react';
import { CATEGORIES, CAMPUS_LOCATIONS } from '../data/mockData';

const TYPES = [
  { key: 'lost', label: 'Lost item', cls: 'badge-lost' },
  { key: 'found', label: 'Found item', cls: 'badge-found' },
  { key: 'marketplace', label: 'Sell / Give', cls: 'badge-market' },
];

const EMPTY = {
  type: 'lost',
  title: '',
  category: 'Electronics',
  location: 'Central Library',
  description: '',
  price: '',
  listingType: 'Sell',
};

export default function PostModal({ isOpen, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY);
  if (!isOpen) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isMarket = form.type === 'marketplace';
  const valid = form.title.trim() && form.description.trim();

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    const item = {
      id: `item-${Date.now()}`,
      type: form.type,
      title: form.title.trim(),
      category: form.category,
      location: form.location,
      date: 'Just now',
      description: form.description.trim(),
      reporter: 'You',
      dept: 'CSE',
      verified: true,
      trustScore: 50,
      status: isMarket ? 'Available' : 'Active',
      tags: [],
      ...(isMarket
        ? { price: Number(form.price) || 0, listingType: form.listingType, condition: 'Good Condition' }
        : { matchScore: null }),
    };
    onSubmit(item);
    setForm(EMPTY);
    onClose();
  };

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Post to campus">
      <form
        className="surface modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        style={{ width: 'min(560px, 100%)', maxHeight: '90vh', overflowY: 'auto', padding: 24 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>Post to campus</h2>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-icon" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)', marginBottom: 18 }}>
          Posts go to your verified campus feed only.
        </p>

        {/* Type selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {TYPES.map((t) => {
            const active = form.type === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setForm((f) => ({ ...f, type: t.key }))}
                className={`badge ${active ? t.cls : 'badge-neutral'}`}
                style={{ cursor: 'pointer', padding: '7px 14px', fontSize: 'var(--text-sm)' }}
                aria-pressed={active}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <Field label="Title">
          <input className="input" value={form.title} onChange={set('title')} placeholder="e.g. Blue water bottle with stickers" autoFocus />
        </Field>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Field label="Category" style={{ flex: 1, minWidth: 160 }}>
            <select className="input" value={form.category} onChange={set('category')}>
              {CATEGORIES.filter((c) => c !== 'All Categories').map((c) => (
                <option key={c} value={c} style={{ background: 'var(--surface)' }}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Location" style={{ flex: 1, minWidth: 160 }}>
            <select className="input" value={form.location} onChange={set('location')}>
              {CAMPUS_LOCATIONS.filter((l) => l !== 'All Campus Locations').map((l) => (
                <option key={l} value={l} style={{ background: 'var(--surface)' }}>{l}</option>
              ))}
            </select>
          </Field>
        </div>

        {isMarket && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Field label="Listing type" style={{ flex: 1, minWidth: 160 }}>
              <select className="input" value={form.listingType} onChange={set('listingType')}>
                {['Sell', 'Rent', 'Giveaway'].map((l) => (
                  <option key={l} value={l} style={{ background: 'var(--surface)' }}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Price (₹)" style={{ flex: 1, minWidth: 160 }}>
              <input
                className="input"
                type="number"
                min="0"
                value={form.listingType === 'Giveaway' ? 0 : form.price}
                onChange={set('price')}
                disabled={form.listingType === 'Giveaway'}
                placeholder="0"
              />
            </Field>
          </div>
        )}

        <Field label="Description">
          <textarea
            className="input"
            rows={3}
            value={form.description}
            onChange={set('description')}
            placeholder="Colour, distinguishing marks, where exactly…"
            style={{ resize: 'vertical' }}
          />
        </Field>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={!valid}>
          <PlusCircle size={16} /> Post report
        </button>
      </form>
    </div>
  );
}

function Field({ label, children, style }) {
  return (
    <label style={{ display: 'block', marginBottom: 14, ...style }}>
      <span style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--ink-secondary)', marginBottom: 6 }}>
        {label}
      </span>
      {children}
    </label>
  );
}
