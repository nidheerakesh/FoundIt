import { ShieldCheck } from 'lucide-react';
import { tierFor } from '../lib/trust';

// Shows a poster's trust: verified tick (a fact) + trust tier/number (earned).
export default function TrustBadge({ score = 50, verified = false, size = 'sm' }) {
  const tier = tierFor(score);
  const compact = size === 'sm';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {verified && (
        <ShieldCheck
          size={compact ? 14 : 16}
          color="var(--accent)"
          aria-label="Verified campus account"
        />
      )}
      <span
        title={`Trust ${score} • ${tier.label}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: compact ? '1px 8px' : '3px 10px',
          borderRadius: 'var(--radius-full)',
          fontSize: compact ? '0.7rem' : '0.8rem',
          fontWeight: 700,
          fontFamily: 'inherit',
          color: tier.color,
          background: `${tier.color}1f`,
          border: `1px solid ${tier.color}55`,
        }}
      >
        <span aria-hidden>{tier.icon}</span>
        {score}
      </span>
    </span>
  );
}
