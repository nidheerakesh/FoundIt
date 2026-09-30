import { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, MapPin, Tag } from 'lucide-react';
import { getOrCreateChat, sendMessage, subscribeMessages } from '../lib/chat';

const QUICK_PROMPTS = [
  'Is this still available?',
  'When can we meet at the Central Library?',
  'I can collect it today after classes.',
];

export default function ChatModal({
  isOpen,
  onClose,
  item,
  currentUser,
  // Who to talk to. Defaults to the post's owner; the owner reviewing a claim
  // passes the claimant instead (you cannot message yourself).
  target = null,
}) {
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  // Initialize or connect chat thread
  useEffect(() => {
    if (!isOpen || !item || !currentUser?.uid) return;

    let unsub = () => {};
    setLoading(true);
    setError('');

    // The other party is normally whoever posted. But on your OWN post that
    // resolves to yourself — a seller opening the chat on their own listing got
    // "You cannot chat with yourself" instead of reaching their buyer. When you
    // are the poster, the counterparty is whoever made the offer.
    const ownerUid = item.postedBy || item.sellerUid || null;
    const iAmPoster = !!ownerUid && ownerUid === currentUser.uid;

    const targetUid = target?.uid
      || (iAmPoster ? item.lastOffer?.buyerUid : ownerUid)
      || null;
    const targetName = target?.name
      || (iAmPoster ? item.lastOffer?.buyerName : (item.reporter || item.sellerName))
      || 'Student';

    // Your own post with nobody on the other side yet: say so plainly rather
    // than failing inside getOrCreateChat with a self-chat error.
    if (!targetUid) {
      setLoading(false);
      setError(
        iAmPoster
          ? 'Nobody has contacted you about this post yet. Their message will open the chat.'
          : 'This post has no contactable owner.'
      );
      return undefined;
    }

    getOrCreateChat({
      targetUid,
      targetName,
      contextItem: item,
      currentUser,
    })
      .then((id) => {
        setChatId(id);
        unsub = subscribeMessages(id, (msgs) => {
          setMessages(msgs);
          setLoading(false);
        });
      })
      .catch((err) => {
        setError(err.message || 'Could not start chat.');
        setLoading(false);
      });

    return () => unsub();
  }, [isOpen, item, currentUser, target]);

  // Scroll to bottom when messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen || !item) return null;

  const handleSend = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || !chatId || sending) return;
    setSending(true);
    setInputText('');
    try {
      await sendMessage(chatId, text, currentUser);
    } catch (err) {
      setError(`Failed to send: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Same resolution as the thread above, so the header names the person you
  // are actually talking to rather than yourself.
  const headerOwnerUid = item?.postedBy || item?.sellerUid || null;
  const headerIAmPoster = !!headerOwnerUid && headerOwnerUid === currentUser?.uid;
  const otherName = target?.name
    || (headerIAmPoster ? item?.lastOffer?.buyerName : (item?.reporter || item?.sellerName))
    || 'Student';

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Campus chat">
      <div
        className="surface modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(540px, 100%)',
          height: 'min(640px, 92vh)',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Chat header */}
        <div
          style={{
            padding: '14px 18px',
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
                borderRadius: '50%',
                background: 'var(--accent)',
                color: 'var(--accent-ink)',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 700,
                fontSize: 'var(--text-sm)',
              }}
            >
              {otherName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{otherName}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>
                {!target && item.dept ? `${item.dept} · ` : ''}Verified Student
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-icon" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Item context banner */}
        <div
          style={{
            padding: '8px 18px',
            background: 'var(--surface-raised)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 'var(--text-xs)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <Tag size={12} color="var(--accent)" />
            <span style={{ fontWeight: 600 }}>{item.title}</span>
            {item.price !== undefined && (
              <span style={{ color: 'var(--found)', fontWeight: 700 }}>
                {item.price === 0 ? 'Free' : `₹${item.price}`}
              </span>
            )}
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--ink-muted)', flexShrink: 0 }}>
            <MapPin size={12} /> {item.location}
          </span>
        </div>

        {/* Message body */}
        <div
          style={{
            flex: 1,
            padding: '16px 18px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            background: 'var(--bg-base)',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--ink-muted)', margin: 'auto', fontSize: 'var(--text-sm)' }}>
              Loading conversation…
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--ink-muted)', maxWidth: 280 }}>
              <MessageCircle size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
              <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--ink)' }}>
                Start the conversation
              </div>
              <p style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                Coordinate safe handovers in designated campus public zones.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.senderUid === currentUser.uid;
              return (
                <div
                  key={m.id}
                  style={{
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '78%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      padding: '8px 14px',
                      borderRadius: isMe ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      background: isMe ? 'var(--accent)' : 'var(--surface)',
                      color: isMe ? 'var(--accent-ink)' : 'var(--ink)',
                      border: isMe ? 'none' : '1px solid var(--border)',
                      fontSize: 'var(--text-sm)',
                      wordBreak: 'break-word',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompt suggestions */}
        {messages.length === 0 && (
          <div style={{ padding: '6px 16px', display: 'flex', gap: 6, overflowX: 'auto', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
            {QUICK_PROMPTS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                className="badge badge-neutral"
                style={{ cursor: 'pointer', whiteSpace: 'nowrap', padding: '4px 10px', fontSize: 'var(--text-xs)' }}
                onClick={() => handleSend(q)}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{ padding: '6px 18px', background: 'rgba(220, 38, 38, 0.1)', color: 'var(--lost)', fontSize: 'var(--text-xs)' }}>
            {error}
          </div>
        )}

        {/* Message Input */}
        <div
          style={{
            padding: '10px 16px',
            background: 'var(--surface)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <input
            className="input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${otherName}…`}
            style={{ flex: 1 }}
            autoFocus
          />
          <button
            type="button"
            className="btn btn-primary btn-sm btn-icon"
            onClick={() => handleSend()}
            disabled={!inputText.trim() || sending}
            aria-label="Send message"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
