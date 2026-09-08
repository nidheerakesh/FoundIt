import { useState } from 'react';
import { X, Sparkles, Send, Bot, ExternalLink, Key, Check, ArrowRight } from 'lucide-react';
import { askCampusAI, getGeminiKey, setGeminiKey } from '../lib/ai';

const SAMPLE_QUERIES = [
  'Did anyone find an ID card in the mess?',
  'Are there any cycles or bikes for sale under ₹3500?',
  'Has someone turned in a Casio calculator?',
  'Any engineering textbooks or notes available?',
];

export default function AIAssistantModal({
  isOpen,
  onClose,
  allItems = [],
  onSelectItem,
}) {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [conversation, setConversation] = useState([
    {
      role: 'assistant',
      text: 'Hi! I am FoundIt Campus AI. Ask me about any lost items, found reports, or marketplace deals on campus.',
      matches: [],
    },
  ]);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyVal, setKeyVal] = useState(getGeminiKey());
  const [keySaved, setKeySaved] = useState(false);

  if (!isOpen) return null;

  const handleAsk = async (textToAsk) => {
    const q = (textToAsk || query).trim();
    if (!q || busy) return;

    setBusy(true);
    setQuery('');

    // Append user query
    setConversation((prev) => [...prev, { role: 'user', text: q }]);

    try {
      const res = await askCampusAI(q, allItems);
      const matchedItems = (res.matchedIds || [])
        .map((id) => allItems.find((it) => it.id === id))
        .filter(Boolean);

      setConversation((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: res.answer,
          matches: matchedItems,
          tip: res.tip,
        },
      ]);
    } catch (err) {
      setConversation((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Sorry, I ran into an error parsing campus reports. Please try a simpler search.',
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveKey = () => {
    setGeminiKey(keyVal);
    setKeySaved(true);
    setTimeout(() => {
      setKeySaved(false);
      setShowKeyInput(false);
    }, 1200);
  };

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Campus AI Assistant">
      <div
        className="surface modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(620px, 100%)',
          height: 'min(680px, 92vh)',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #166534 0%, #15803d 100%)',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 800 }}>FoundIt AI Assistant</h2>
                <span className="badge badge-match" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                  Gemini
                </span>
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>
                Semantic natural language search across campus reports
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-icon"
              onClick={() => setShowKeyInput((v) => !v)}
              title="Configure Gemini API Key"
              aria-label="Configure Gemini API Key"
            >
              <Key size={16} color={getGeminiKey() ? 'var(--found)' : 'var(--ink-muted)'} />
            </button>
            <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-icon" aria-label="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Optional API Key banner */}
        {showKeyInput && (
          <div
            style={{
              padding: '10px 18px',
              background: 'var(--surface-raised)',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              fontSize: 'var(--text-xs)',
            }}
          >
            <input
              className="input"
              type="password"
              placeholder="Paste Google Gemini API Key (optional)"
              value={keyVal}
              onChange={(e) => setKeyVal(e.target.value)}
              style={{ flex: 1, padding: '6px 10px', fontSize: 'var(--text-xs)' }}
            />
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveKey}>
              {keySaved ? <Check size={14} /> : 'Save Key'}
            </button>
          </div>
        )}

        {/* Chat / Q&A Body */}
        <div
          style={{
            flex: 1,
            padding: '16px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            background: 'var(--bg-base)',
          }}
        >
          {conversation.map((msg, i) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 10,
                  flexDirection: isUser ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                }}
              >
                {!isUser && (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      color: 'var(--accent-ink)',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <Bot size={15} />
                  </div>
                )}
                <div style={{ maxWidth: '82%' }}>
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      background: isUser ? 'var(--accent)' : 'var(--surface)',
                      color: isUser ? 'var(--accent-ink)' : 'var(--ink)',
                      border: isUser ? 'none' : '1px solid var(--border)',
                      fontSize: 'var(--text-sm)',
                      lineHeight: 1.45,
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    {msg.text}
                  </div>

                  {/* Matched item cards */}
                  {msg.matches && msg.matches.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {msg.matches.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            onClose();
                            onSelectItem?.(item);
                          }}
                          className="surface"
                          style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'border-color var(--dur)',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 'var(--text-xs)' }}>{item.title}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--ink-muted)' }}>
                              {item.location} · {item.category}
                            </div>
                          </div>
                          <span
                            className={`badge ${
                              item.type === 'lost'
                                ? 'badge-lost'
                                : item.type === 'found'
                                ? 'badge-found'
                                : 'badge-market'
                            }`}
                            style={{ fontSize: '0.65rem' }}
                          >
                            {item.type === 'marketplace' ? (item.price === 0 ? 'Free' : `₹${item.price}`) : item.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.tip && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', marginTop: 4, fontStyle: 'italic' }}>
                      Tip: {msg.tip}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {busy && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--ink-muted)', fontSize: 'var(--text-xs)' }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  color: 'var(--accent-ink)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Sparkles size={14} />
              </div>
              <span className="pulse">FoundIt AI is analyzing the campus database…</span>
            </div>
          )}
        </div>

        {/* Sample queries pills */}
        <div
          style={{
            padding: '8px 16px',
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            background: 'var(--surface)',
            borderTop: '1px solid var(--border)',
          }}
        >
          {SAMPLE_QUERIES.map((sq, idx) => (
            <button
              key={idx}
              type="button"
              className="badge badge-neutral"
              style={{ cursor: 'pointer', whiteSpace: 'nowrap', padding: '4px 10px', fontSize: 'var(--text-xs)' }}
              onClick={() => handleAsk(sq)}
            >
              {sq}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          style={{
            padding: '10px 16px',
            background: 'var(--surface)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 8,
          }}
        >
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask campus AI: e.g. Did anyone turn in a water bottle at the library?"
            style={{ flex: 1 }}
            autoFocus
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm btn-icon"
            disabled={!query.trim() || busy}
            aria-label="Send prompt to AI"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
