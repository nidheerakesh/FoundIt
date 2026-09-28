import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { subscribeNotifications, markRead } from '../lib/notifications';

const ICON_MAP = {
  match: '🔗',
  claim: '📋',
  review: '⭐',
  deal: '🤝',
  flag: '🚩',
  system: '📢',
};

function timeAgo(ts) {
  if (!ts) return '';
  const ms = Date.now() - (ts.toDate ? ts.toDate().getTime() : new Date(ts).getTime());
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeNotifications(user.uid, setNotifs);
  }, [user?.uid]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unread = notifs.filter((n) => !n.read).length;

  const handleOpen = () => {
    setOpen((o) => !o);
  };

  const handleRead = (n) => {
    if (!n.read) markRead(n.id).catch(() => {});
  };

  if (!user) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn btn-ghost btn-sm btn-icon"
        onClick={handleOpen}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        style={{ position: 'relative', borderRadius: 'var(--radius-full)', width: 34, height: 34, padding: 0 }}
      >
        <Bell size={17} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            width: 16, height: 16, borderRadius: '50%',
            background: 'var(--lost)', color: '#fff',
            fontSize: '0.6rem', fontWeight: 800,
            display: 'grid', placeItems: 'center',
            lineHeight: 1,
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="surface"
          style={{
            position: 'absolute', right: 0, top: 'calc(100% + 8px)',
            width: 320, maxHeight: 400, overflowY: 'auto',
            zIndex: 'calc(var(--z-sticky) + 1)',
            padding: 0,
          }}
        >
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontWeight: 800, fontSize: 'var(--text-sm)' }}>Notifications</span>
            {unread > 0 && (
              <span className="badge badge-found" style={{ fontSize: '0.65rem' }}>{unread} new</span>
            )}
          </div>

          {notifs.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-muted)', fontSize: 'var(--text-sm)' }}>
              No notifications yet
            </div>
          ) : (
            notifs.map((n) => (
              <div
                key={n.id}
                onClick={() => handleRead(n)}
                style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: n.read ? 'transparent' : 'rgba(22, 101, 52, 0.04)',
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                }}
              >
                <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 2 }}>
                  {ICON_MAP[n.type] || '📢'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 'var(--text-sm)', fontWeight: n.read ? 400 : 600,
                    color: 'var(--ink)',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', marginTop: 2 }}>
                    {timeAgo(n.createdAt)}
                  </div>
                </div>
                {!n.read && (
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: 'var(--accent)', flexShrink: 0, marginTop: 6,
                  }} />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
