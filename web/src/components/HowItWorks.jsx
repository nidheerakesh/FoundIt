import { ShieldCheck, Search, Handshake, Star, Sparkles, Bell } from 'lucide-react';

const STEPS = [
  {
    icon: ShieldCheck,
    title: 'Verified accounts',
    desc: 'Only campus emails can sign up. Every poster is verified — no anonymous reports.',
    color: 'var(--accent)',
  },
  {
    icon: Search,
    title: 'Smart matching',
    desc: 'AI pairs lost items with found reports using category, keywords, location, and timing.',
    color: 'var(--warn)',
  },
  {
    icon: Handshake,
    title: 'Secure handshake',
    desc: 'Both parties confirm the exchange. Reviews unlock only after a completed transaction.',
    color: 'var(--market)',
  },
  {
    icon: Star,
    title: 'Trust scoring',
    desc: 'Bayesian trust score (0–100) rewards good behavior and penalizes fraud. Visible on every post.',
    color: 'var(--found)',
  },
  {
    icon: Bell,
    title: 'Real-time alerts',
    desc: 'Get notified instantly when your lost item gets a match, claim, or review.',
    color: 'var(--lost)',
  },
  {
    icon: Sparkles,
    title: 'AI-powered',
    desc: 'Auto-fill posts, smart search, and AI suggestions to help you find things faster.',
    color: '#a78bfa',
  },
];

export default function HowItWorks() {
  return (
    <section style={{ maxWidth: 1200, margin: '32px auto 0', padding: '0 16px', width: '100%' }}>
      <div style={{
        padding: '24px 28px', borderRadius: 'var(--radius-lg)',
        background: 'var(--surface)', border: '1px solid var(--border)',
      }}>
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 800, marginBottom: 4 }}>How FoundIt works</h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)', marginBottom: 20 }}>
          Built for trust, speed, and campus safety.
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16,
        }}>
          {STEPS.map((s) => (
            <div key={s.title} style={{
              padding: '16px 14px', borderRadius: 'var(--radius-md)',
              background: 'var(--surface-raised)', border: '1px solid var(--border)',
            }}>
              <s.icon size={20} color={s.color} style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', marginBottom: 4 }}>{s.title}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-secondary)', lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
