import { Megaphone, Search, ShieldCheck, ListChecks, CheckCircle2, ClipboardList } from 'lucide-react';

// The lost → found workflow, step by step. Nothing here relies on push
// notifications: every state is visible on the cards when you open the app.
const STEPS = [
  {
    icon: Megaphone,
    title: '1. Post it',
    desc: 'Lost something? Post it as Lost. Found something? Post it as Found — or open the Lost post and tap "I found it".',
    color: 'var(--lost)',
  },
  {
    icon: Search,
    title: '2. Spot the match',
    desc: 'When a Lost and a Found report look alike, both cards show a % match badge. Tap it to compare them side by side.',
    color: 'var(--warn)',
  },
  {
    icon: ShieldCheck,
    title: '3. Claim with proof',
    desc: 'On a Found post, tap "Claim this" and describe something only the owner would know. Your answer is private to the poster.',
    color: 'var(--accent)',
  },
  {
    icon: ListChecks,
    title: '4. The poster reviews',
    desc: 'Their own card shows "Review claims (N)". They read the proof, message you to arrange a campus handover, and approve.',
    color: 'var(--market)',
  },
  {
    icon: CheckCircle2,
    title: '5. Returned',
    desc: 'Approving marks the item Returned for everyone and closes the report, so nobody else can claim it.',
    color: 'var(--found)',
  },
  {
    icon: ClipboardList,
    title: 'Track it',
    desc: 'Claimed something? Check "My claims" in your account menu — pending, approved or declined, and whether it is returned.',
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
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 800, marginBottom: 4 }}>How getting something back works</h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-muted)', marginBottom: 20 }}>
          From "I lost it" to "I got it back", entirely inside FoundIt.
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
