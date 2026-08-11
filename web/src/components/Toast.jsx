import { Sparkles } from 'lucide-react';

export default function Toast({ message }) {
  if (!message) return null;
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        background: 'var(--surface-raised)',
        border: '1px solid var(--border-strong)',
        boxShadow: 'var(--shadow-lg)',
        color: 'var(--ink)',
        padding: '12px 18px',
        borderRadius: 'var(--radius-md)',
        zIndex: 'var(--z-toast)',
        fontWeight: 600,
        fontSize: 'var(--text-sm)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        maxWidth: 'min(90vw, 380px)',
        animation: 'toast-in var(--dur) var(--ease)',
      }}
    >
      <Sparkles size={16} color="var(--accent)" /> {message}
    </div>
  );
}
