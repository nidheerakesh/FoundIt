import { useEffect, useState } from 'react';
import { X, PlusCircle, Sparkles } from 'lucide-react';
import { CATEGORIES, CAMPUS_LOCATIONS } from '../data/mockData';
import { generatePostAssistance } from '../lib/ai';

const TYPES = [
  { key: 'lost', label: 'Lost item', cls: 'badge-lost', submit: 'Post lost report', dest: 'Lost & Found' },
  { key: 'found', label: 'Found item', cls: 'badge-found', submit: 'Post found report', dest: 'Lost & Found' },
  { key: 'marketplace', label: 'Sell / Give', cls: 'badge-market', submit: 'List on Marketplace', dest: 'Marketplace' },
];

const CONDITIONS = ['Like New', 'Good Condition', 'Used - Works Fine', 'For Parts'];

const EMPTY = {
  type: 'lost',
  title: '',
  category: 'Electronics',
  location: 'Central Library',
  description: '',
  price: '',
  listingType: 'Sell',
  condition: 'Good Condition',
};

export default function PostModal({ isOpen, onClose, onSubmit, initialType = 'lost' }) {
  const [form, setForm] = useState(EMPTY);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState('');
  const [posting, setPosting] = useState(false);
  // Open on the type that fits where the user is: from the Marketplace tab a
  // post is a listing. Defaulting to "Lost item" everywhere sent sales that
  // skipped the type chips into Lost & Found.
  useEffect(() => {
    if (isOpen) setForm((f) => ({ ...f, type: initialType }));
  }, [isOpen, initialType]);
  if (!isOpen) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isMarket = form.type === 'marketplace';
  const typeInfo = TYPES.find((t) => t.key === form.type) || TYPES[0];
  const valid = form.title.trim() && form.description.trim();

  const handleAiAssist = async () => {
    if (!form.title.trim() && !form.description.trim()) {
      setAiNote('Type a word or rough title first (e.g. "umbrella" or "math book")');
      return;
    }
    setAiBusy(true);
    setAiNote('');
    try {
      const res = await generatePostAssistance({
        title: form.title,
        description: form.description,
        category: form.category,
        type: form.type,
      });
      setForm((f) => ({
        ...f,
        title: res.title || f.title,
        category: res.category || f.category,
        description: res.description || f.description,
        price: f.type === 'marketplace' && (!f.price || f.price === '') && res.suggestedPrice ? res.suggestedPrice : f.price,
      }));
      setAiNote('✨ AI enhanced your report with tags & categories!');
    } catch (err) {
      setAiNote('Could not auto-fill. Please enter manually.');
    } finally {
      setAiBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || posting) return;
    setPosting(true);
    try {
      // Emit the raw form; App writes it to the right Firestore collection.
      await onSubmit({
        type: form.type,
        title: form.title.trim(),
        category: form.category,
        location: form.location,
        description: form.description.trim(),
        price: form.price,
        listingType: form.listingType,
        condition: isMarket ? form.condition : '',
      });
      setForm(EMPTY);
      setAiNote('');
      onClose();
    } finally {
      // Always clear: a failed post must not leave the button stuck disabled.
      setPosting(false);
    }
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

        {/* AI Assist helper banner */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--ink-secondary)' }}>
            Report Information
          </span>
          <button
            type="button"
            onClick={handleAiAssist}
            className="btn btn-ghost btn-sm"
            disabled={aiBusy}
            style={{
              color: 'var(--accent)',
              padding: '3px 10px',
              fontSize: 'var(--text-xs)',
              background: 'rgba(22, 101, 52, 0.08)',
              borderRadius: 'var(--radius-full)',
            }}
          >
            <Sparkles size={13} /> {aiBusy ? 'AI generating…' : '✨ AI Auto-fill & Polish'}
          </button>
        </div>
        {aiNote && (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--found)', marginBottom: 10, fontStyle: 'italic' }}>
            {aiNote}
          </div>
        )}

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
          <>
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
            <Field label="Condition">
              <select className="input" value={form.condition} onChange={set('condition')}>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c} style={{ background: 'var(--surface)' }}>{c}</option>
                ))}
              </select>
            </Field>
          </>
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

        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', margin: '4px 0 0' }}>
          This goes to the <strong>{typeInfo.dest}</strong> feed as a <strong>{typeInfo.label}</strong>.
        </p>
        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={!valid || posting}>
          <PlusCircle size={16} /> {posting ? 'Posting…' : typeInfo.submit}
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
