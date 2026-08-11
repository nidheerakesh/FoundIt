// Trust Score display helpers — see docs/SCORING.md for the full formula.
// The score itself is computed server-side; here we only map it to a tier/label/colour.

export const TRUST_TIERS = [
  { min: 90, key: 'star', label: 'Campus Star', color: '#f59e0b', icon: '★' },
  { min: 75, key: 'reliable', label: 'Reliable', color: '#10b981', icon: '●' },
  { min: 60, key: 'trusted', label: 'Trusted', color: '#38bdf8', icon: '●' },
  { min: 40, key: 'neutral', label: 'New', color: '#94a3b8', icon: '○' },
  { min: 0, key: 'low', label: 'Low Trust', color: '#f43f5e', icon: '!' },
];

export function tierFor(score) {
  return TRUST_TIERS.find((t) => score >= t.min) ?? TRUST_TIERS[TRUST_TIERS.length - 1];
}
