import { useState } from 'react';
import { X, Sparkles, MapPin, Tag, CheckCircle2, MessageSquare, ShieldCheck, ArrowRight, HelpCircle } from 'lucide-react';
import TrustBadge from './TrustBadge';
import { generateVerificationQuestions } from '../lib/ai';

export default function SmartMatchModal({
  isOpen,
  onClose,
  targetItem,
  matchResult,
  onOpenChat,
  onOpenClaim,
}) {
  const [aiQuestions, setAiQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  if (!isOpen || !targetItem) return null;

  const candidate = matchResult?.candidate;

  const handleGenerateQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const qList = await generateVerificationQuestions(targetItem, candidate);
      setAiQuestions(qList);
    } catch (e) {
      // fallback
    } finally {
      setLoadingQuestions(false);
    }
  };
  const score = matchResult?.score || targetItem.matchScore || 94;
  const factors = matchResult?.factors || [
    { label: 'Category Match', detail: targetItem.category, pts: 30 },
    { label: 'Keyword Similarity', detail: 'High description overlap', pts: 38 },
    { label: 'Zone Proximity', detail: targetItem.location, pts: 20 },
  ];

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Smart match suggestions">
      <div
        className="surface modal"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(760px, 100%)', maxHeight: '90vh', overflowY: 'auto', padding: 24 }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(180, 83, 9, 0.15)',
                color: 'var(--warn)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Sparkles size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>Smart Match Detected</h2>
                <span className="badge badge-match" style={{ fontSize: 'var(--text-xs)', padding: '3px 10px' }}>
                  <Sparkles size={12} /> {score}% match
                </span>
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', marginTop: 2 }}>
                FoundIt automated item correlation engine
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-icon" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Side-by-side comparison */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
            marginBottom: 20,
          }}
        >
          {/* Target Card */}
          <div
            className="surface"
            style={{
              padding: 16,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--surface-raised)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span className={`badge ${targetItem.type === 'lost' ? 'badge-lost' : 'badge-found'}`}>
                {targetItem.type === 'lost' ? 'Your Lost Report' : 'Found Report'}
              </span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>{targetItem.date || 'Recent'}</span>
            </div>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 6 }}>{targetItem.title}</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-secondary)', marginBottom: 12 }}>
              {targetItem.description}
            </p>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={13} /> {targetItem.location}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Tag size={13} /> {targetItem.category}
              </span>
            </div>
          </div>

          {/* Candidate Card */}
          <div
            className="surface"
            style={{
              padding: 16,
              borderRadius: 'var(--radius-md)',
              border: '2px solid rgba(180, 83, 9, 0.4)',
              background: 'var(--surface)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span className={`badge ${candidate?.type === 'lost' ? 'badge-lost' : 'badge-found'}`}>
                {candidate?.type === 'lost' ? 'Matching Lost Item' : 'Potential Match Found'}
              </span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>{candidate?.date || 'Recent'}</span>
            </div>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 6 }}>
              {candidate?.title || 'Matching campus report'}
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-secondary)', marginBottom: 12 }}>
              {candidate?.description || 'A corresponding report matches your lost item parameters.'}
            </p>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={13} /> {candidate?.location || targetItem.location}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Tag size={13} /> {candidate?.category || targetItem.category}
              </span>
            </div>
            {candidate && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>{candidate.reporter}</div>
                <TrustBadge score={candidate.trustScore} verified={candidate.verified} />
              </div>
            )}
          </div>
        </div>

        {/* Why this matched breakdown */}
        <div
          style={{
            background: 'var(--surface-raised)',
            padding: 16,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-muted)', marginBottom: 10 }}>
            Match Correlation Breakdown ({score}%)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {factors.map((f, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={15} color="var(--found)" />
                  <span style={{ fontWeight: 600 }}>{f.label}</span>
                  {f.detail && (
                    <span style={{ color: 'var(--ink-muted)', fontSize: 'var(--text-xs)' }}>({f.detail})</span>
                  )}
                </div>
                <span style={{ fontWeight: 700, color: 'var(--ink)' }}>+{f.pts}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Ownership Verification Questions */}
        <div
          style={{
            background: 'rgba(22, 101, 52, 0.05)',
            border: '1px solid rgba(22, 101, 52, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 'var(--text-xs)', color: 'var(--accent)' }}>
              <Sparkles size={14} /> AI Ownership Verification Assistant
            </div>
            {aiQuestions.length === 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleGenerateQuestions}
                disabled={loadingQuestions}
                style={{ fontSize: 'var(--text-xs)', padding: '2px 8px', height: 'auto', color: 'var(--accent)' }}
              >
                {loadingQuestions ? 'Generating…' : '✨ Generate Verification Questions'}
              </button>
            )}
          </div>

          {aiQuestions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-secondary)', marginBottom: 4 }}>
                Ask the claimant these questions to verify genuine ownership:
              </div>
              {aiQuestions.map((q, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 'var(--text-xs)', color: 'var(--ink)' }}>
                  <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{i + 1}.</span>
                  <span>{q}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>
              Generate discerning verification questions based on item details to safely confirm identity before handover.
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
          {candidate && (
            <>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  onClose();
                  onOpenChat?.(candidate);
                }}
              >
                <MessageSquare size={15} /> Message {candidate.reporter}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onClose();
                  onOpenClaim?.(candidate);
                }}
              >
                Claim this item <ArrowRight size={15} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
