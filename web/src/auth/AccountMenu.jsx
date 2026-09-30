import { useState, useEffect } from 'react';
import { LogOut, User, UserCircle, ClipboardList, ShieldAlert, MessageCircle } from 'lucide-react';
import { useAuth } from './AuthContext';
import { logout } from './authApi';
import TrustBadge from '../components/TrustBadge';
import NotificationBell from '../components/NotificationBell';
import { subscribeMyChats } from '../lib/chat';

// Navbar account control: "Sign in" when logged out; avatar + dropdown when in.
export default function AccountMenu({ onLogin, onOpenProfile, onOpenModeration, onOpenMyClaims, onOpenChats }) {
  const { isAuthed, profile, isMod, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    if (!profile?.uid) return undefined;
    return subscribeMyChats(profile.uid, (chats) => {
      setTotalUnread(
        chats.reduce((sum, c) => sum + (c.unreadCounts?.[profile.uid] || 0), 0)
      );
    });
  }, [profile?.uid]);

  if (!isAuthed) {
    return (
      <button className="btn btn-ghost btn-sm" onClick={onLogin}>
        <User size={15} /> Sign in
      </button>
    );
  }

  const name = profile?.name || 'You';
  const initial = name.charAt(0).toUpperCase();

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
      <NotificationBell />
      <button
        className="btn btn-ghost btn-sm btn-icon"
        onClick={() => onOpenChats?.()}
        aria-label={totalUnread > 0 ? `Messages — ${totalUnread} unread` : 'Messages'}
        style={{ position: 'relative', borderRadius: 'var(--radius-full)', width: 34, height: 34, padding: 0 }}
      >
        <MessageCircle size={18} />
        {totalUnread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              minWidth: 16,
              height: 16,
              borderRadius: 'var(--radius-full)',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
              pointerEvents: 'none',
            }}
          >
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>
      <button
        className="btn btn-ghost btn-sm btn-icon"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        style={{ borderRadius: 'var(--radius-full)', width: 34, height: 34, padding: 0, fontWeight: 800 }}
      >
        {initial}
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-sticky)' }} onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="surface"
            style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 220, padding: 14, zIndex: 'calc(var(--z-sticky) + 1)' }}
          >
            <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.email}</div>
            {profile && (
              <div style={{ marginBottom: 12 }}>
                <TrustBadge score={profile.trustScore} verified={profile.verified} size="md" />
              </div>
            )}
            <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginBottom: 6 }} onClick={() => { setOpen(false); onOpenProfile?.(); }}>
              <UserCircle size={14} /> My Profile
            </button>
            <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginBottom: 6 }} onClick={() => { setOpen(false); onOpenChats?.(); }}>
              <MessageCircle size={14} /> Messages
              {totalUnread > 0 && (
                <span className="badge badge-neutral" style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 'var(--text-xs)', background: 'var(--accent)', color: '#fff' }}>
                  {totalUnread}
                </span>
              )}
            </button>
            <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginBottom: 6 }} onClick={() => { setOpen(false); onOpenMyClaims?.(); }}>
              <ClipboardList size={14} /> My claims
            </button>
            {isMod && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ width: '100%', marginBottom: 6, color: 'var(--lost)' }}
                onClick={() => { setOpen(false); onOpenModeration?.(); }}
              >
                <ShieldAlert size={14} /> Moderation queue
                <span style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', opacity: 0.7 }}>{role}</span>
              </button>
            )}
            <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={() => { setOpen(false); logout(); }}>
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
