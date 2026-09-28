// Pure scoring logic — no Firebase deps, unit-testable, explainable in the viva.
// Mirrors docs/SCORING.md. OWNER: Nidhi (match) + Shanid (trust).

// ---------- Match Score (lost <-> found) ----------

function jaccard(a = [], b = []) {
  const A = new Set(a.map((s) => String(s).toLowerCase()));
  const B = new Set(b.map((s) => String(s).toLowerCase()));
  if (A.size === 0 && B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * 0–100 confidence that a lost item and a found item are the same object.
 * weights: category .30, keywords .30, zone .20, recency .10, complementarity .10
 * @param {object} zoneAdjacency  optional { zoneId: [adjacentZoneIds] }
 */
function matchScore(a, b, zoneAdjacency = {}) {
  const categoryMatch = a.category && a.category === b.category ? 1 : 0;

  const keywordOverlap = jaccard(a.keywords, b.keywords);

  let zoneProximity = 0;
  if (a.zoneId && b.zoneId) {
    if (a.zoneId === b.zoneId) zoneProximity = 1;
    else if ((zoneAdjacency[a.zoneId] || []).includes(b.zoneId)) zoneProximity = 0.5;
  }

  const msA = toMillis(a.createdAt);
  const msB = toMillis(b.createdAt);
  const daysApart = msA && msB ? Math.abs(msA - msB) / 86400000 : 14;
  const recency = 1 - Math.min(1, daysApart / 14);

  // A lost item should pair with a found item, not another lost one.
  const complementarity = a.type && b.type && a.type !== b.type ? 1 : 0;

  const raw =
    0.30 * categoryMatch +
    0.30 * keywordOverlap +
    0.20 * zoneProximity +
    0.10 * recency +
    0.10 * complementarity;

  return Math.round(100 * raw);
}

function toMillis(v) {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (v._seconds) return v._seconds * 1000;
  return 0;
}

// ---------- Trust Score (docs/SCORING.md §1) ----------

function clamp(min, max, n) { return Math.max(min, Math.min(max, n)); }

/**
 * 0–100 credibility score. Starts at a neutral 50, earned up/down.
 * @param {object} u  { ratingAvg, ratingCount, resolvedCount, verified,
 *                      medianReplyMins, accountAgeDays, strikes, suspended }
 */
function trustScore(u = {}) {
  const C = 5;   // Bayesian prior weight
  const m = 3.5; // prior mean rating
  const n = u.ratingCount || 0;
  const adjustedAvg = (C * m + (u.ratingAvg || 0) * n) / (C + n);
  const ratingPoints = ((adjustedAvg - 3.0) / 2.0) * 40; // 3→0, 5→+40, 1→−40

  const resolved = u.resolvedCount || 0;
  const activityPoints = Math.min(25, Math.round(12 * Math.log10(1 + resolved)));

  const verificationPoints = u.verified ? 10 : 0;

  const rm = u.medianReplyMins;
  let responsivenessPoints = 0;
  if (rm != null) {
    if (rm < 60) responsivenessPoints = 10;
    else if (rm < 360) responsivenessPoints = 7;
    else if (rm < 1440) responsivenessPoints = 4;
    else if (rm < 4320) responsivenessPoints = 1;
  }

  const tenurePoints = Math.min(5, Math.floor((u.accountAgeDays || 0) / 30));

  const penaltyPoints = (u.strikes || 0) * 15 + (u.suspended ? 40 : 0);

  const score = clamp(
    0, 100,
    50 + ratingPoints + activityPoints + verificationPoints + responsivenessPoints + tenurePoints - penaltyPoints
  );

  return {
    score: Math.round(score),
    tier: tierFor(score),
    breakdown: {
      rating: Math.round(ratingPoints),
      activity: activityPoints,
      verification: verificationPoints,
      responsiveness: responsivenessPoints,
      tenure: tenurePoints,
      penalty: -penaltyPoints,
    },
  };
}

function tierFor(score) {
  if (score >= 90) return 'star';
  if (score >= 75) return 'reliable';
  if (score >= 60) return 'trusted';
  if (score >= 40) return 'neutral';
  return 'low';
}

module.exports = { jaccard, matchScore, trustScore, tierFor, toMillis };
