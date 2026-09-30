import { useState, useEffect } from 'react';
import { X, MessageCircle, Inbox } from 'lucide-react';
import { subscribeMyChats } from '../lib/chat';

export default function ChatsListModal({ isOpen, onClose, currentUser, onOpenChat }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !currentUser?.uid) return undefined;
    setLoading(true);
    return subscribeMyChats(currentUser.uid, (rows) => {
      setChats(rows);
      setLoading(false);
    });
  }, [isOpen, currentUser?.uid]);

  if (!isOpen) return null;

  const totalUnread = chats.reduce((sum, c) => {
    return sum + (c.unreadCounts?.[currentUser.uid] || 0);
  }, 0);

  const openChat = (chat) => {
    // Resolve the counterparty for this chat
    const otherUid = chat.participants.find((p) => p !== currentUser.uid);
    const otherName = chat.participantNames?.[otherUid] || 'Student';
    // Build a minimal item context so ChatModal knows who to talk to
    // ChatModal requires a non-null item to render. When the chat has no
    // linked post (general campus DM), pass a minimal sentinel.
    const contextItem = {
      id: chat.contextId || chat.id,
      title: chat.contextTitle || '',
      type: chat.contextType || 'item',
    };
    onClose();
    onOpenChat(contextItem, { uid: otherUid, name: otherName });
  };

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="My messages">
      <div
        className="surface modal"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(520px, 100%)', maxHeight: '88vh', overflowY: 'auto', padding: 24 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>Messages</h2>
            {totalUnread > 0 && (
              <span
                className="badge badge-lost"
                style={{ fontWeight: 800, fontSize: 'var(--text-xs)', padding: '2px 7px' }}
              >
                {totalUnread} unread
              </span>
            )}
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-icon" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {loading && (
          <p style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-sm)', padding: '18px 0' }}>
            Loading messages…
          </p>
        )}

        {!loading && chats.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-muted)' }}>
            <Inbox size={40} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 'var(--text-sm)' }}>No conversations yet.</p>
            <p style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
              Message someone from a lost & found post or marketplace listing.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {chats.map((chat) => {
            const otherUid = chat.participants.find((p) => p !== currentUser.uid);
            const otherName = chat.participantNames?.[otherUid] || 'Student';
            const unread = chat.unreadCounts?.[currentUser.uid] || 0;
            const lastAt = chat.lastMessageAt?.toDate?.();
            const timeLabel = lastAt ? formatTime(lastAt) : '';
            const isFromMe = chat.lastSenderUid === currentUser.uid;

            return (
              <button
                key={chat.id}
                type="button"
                onClick={() => openChat(chat)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid transparent',
                  background: unread > 0 ? 'color-mix(in srgb, var(--accent) 6%, transparent)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = unread > 0 ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--surface-raised)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = unread > 0 ? 'color-mix(in srgb, var(--accent) 6%, transparent)' : 'transparent'; }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--accent)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 'var(--text-md)',
                    flexShrink: 0,
                  }}
                >
                  {otherName.charAt(0).toUpperCase()}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <span
                      style={{
                        fontWeight: unread > 0 ? 800 : 600,
                        fontSize: 'var(--text-sm)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {otherName}
                    </span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', flexShrink: 0 }}>
                      {timeLabel}
                    </span>
                  </div>
                  {chat.contextTitle && (
                    <div
                      style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--ink-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      re: {chat.contextTitle}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: unread > 0 ? 'var(--ink)' : 'var(--ink-muted)',
                      fontWeight: unread > 0 ? 600 : 400,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginTop: 1,
                    }}
                  >
                    {isFromMe && <span style={{ color: 'var(--ink-muted)' }}>You: </span>}
                    {chat.lastMessage || <em>No messages yet</em>}
                  </div>
                </div>

                {/* Unread badge */}
                {unread > 0 && (
                  <div
                    style={{
                      minWidth: 20,
                      height: 20,
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--accent)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 800,
                      padding: '0 5px',
                      flexShrink: 0,
                    }}
                  >
                    {unread > 99 ? '99+' : unread}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatTime(date) {
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
