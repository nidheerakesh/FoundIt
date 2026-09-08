import { useState } from 'react';
import { MailWarning } from 'lucide-react';
import { resendVerification } from './authApi';

// Shown when a signed-in user hasn't verified their campus email yet.
export default function VerifyBanner() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const resend = async () => {
    setBusy(true);
    try {
      await resendVerification();
      setSent(true);
    } catch {
      /* ignore — button just won't flip to "sent" */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="status"
      style={{
        maxWidth: 1200,
        margin: '12px auto 0',
        padding: '10px 16px',
        width: 'calc(100% - 32px)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        background: 'var(--warn)14',
        border: '1px solid var(--warn)44',
        borderRadius: 'var(--radius-md)',
        color: 'var(--ink)',
        fontSize: 'var(--text-sm)',
      }}
    >
      <MailWarning size={16} color="var(--warn)" />
      <span style={{ flex: 1, minWidth: 200 }}>
        Verify your campus email to post, claim, and message. Check your inbox for the link.
      </span>
      <button className="btn btn-ghost btn-sm" onClick={resend} disabled={busy || sent}>
        {sent ? 'Email sent ✓' : busy ? 'Sending…' : 'Resend email'}
      </button>
    </div>
  );
}
