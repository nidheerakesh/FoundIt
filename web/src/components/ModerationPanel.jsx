import { useEffect, useState } from 'react';
import { X, ShieldAlert, Gavel, Check, Inbox } from 'lucide-react';
import { subscribeOpenFlags, resolveFlag, TARGET_LABEL } from '../lib/moderation';
import { useAuth } from '../auth/AuthContext';

/**
 * Moderator/admin flag queue. Rendering is gated by the caller on role, but
 * that is only a UI convenience — firestore.rules is what actually stops a
 * normal user reading flags, and resolveFlag re-checks the role server-side.
 */
export default function ModerationPanel({ isOpen, onClose, onToast }) {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!isOpen) return undefined;
    setLoading(true);
    setError('');
    const unsub = subscribeOpenFlags(
      (rows) => { setFlags(rows); setLoading(false); },
      (err) => {
        setError(
          err.code === 'permission-denied'
            ? 'Your account does not have moderator access.'
            : 'Could not load the flag queue.'
        );
        setLoading(false);
      }
    );
    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  const act = async (flag, action) => {
    setBusyId(flag.id);
    setError('');
    try {
      const { struck } = await resolveFlag(flag, action, user?.uid || null);
      // Removing a post settles every other report about it too.
      if (action === 'strike') {
        for (const other of flags.filter((o) => o.id !== flag.id && o.targetId === flag.targetId)) {
          await resolveFlag(other, 'dismiss', user?.uid || null).catch(() => {});
        }
      }
      onToast?.(
        action === 'dismiss' ? 'Flag dismissed.'
          : struck ? 'Post removed and a strike applied to its owner.'
          : 'Post removed from the feed.'
      );
    } catch (err) {
      setError(
        err.code === 'permission-denied'
          ? 'Your account does not have moderator access.'
          : err.message || 'Could not resolve the flag.'
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Moderation queue">
      <div
        className="surface modal"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(620px, 100%)', maxHeight: '88vh', overflowY: 'auto', padding: 24 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--lost)', color: '#fff', display: 'grid', placeItems: 'center' }}>
              <ShieldAlert size={17} />
            </div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>Moderation queue</h2>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-icon" aria-label="Close"><X size={16} /></button>
        </div>

        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)', marginBottom: 18 }}>
          Content is hidden automatically after 3 reports. Resolving here records the
          outcome; a strike also reduces the poster&rsquo;s trust score.
        </p>

        {error && (
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--lost)', background: 'color-mix(in srgb, var(--lost) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--lost) 28%, transparent)', borderRadius: 'var(--radius-md)', padding: '8px 12px', marginBottom: 14 }}>
            {error}
          </div>
        )}

        {loading && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)' }}>Loading reports…</p>}

        {!loading && !error && flags.length === 0 && (
          <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--ink-muted)' }}>
            <Inbox size={30} style={{ marginBottom: 8, opacity: 0.6 }} />
            <p style={{ fontSize: 'var(--text-sm)' }}>Nothing to review. The queue is clear.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {flags.map((f) => (
            <div key={f.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-muted)' }}>
                  {TARGET_LABEL[f.targetType] || f.targetType}
                </span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>
                  {f.reason}
                </span>
              </div>

              <p style={{ fontWeight: 700, marginBottom: 4 }}>{f.targetTitle || f.targetId}</p>
              {f.details && (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-secondary)', marginBottom: 10 }}>
                  &ldquo;{f.details}&rdquo;
                </p>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={busyId === f.id}
                  onClick={() => act(f, 'dismiss')}
                  style={{ background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--border)' }}
                >
                  <Check size={14} /> Dismiss
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={busyId === f.id}
                  onClick={() => act(f, 'strike')}
                  style={{ background: 'var(--lost)', color: '#fff' }}
                >
                  <Gavel size={14} /> {busyId === f.id ? 'Working…' : 'Remove post'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
