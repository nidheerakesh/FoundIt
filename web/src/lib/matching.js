// Client-side fallback for the smart match score.
//
// suggestMatches (functions/index.js) is the authoritative scorer; this runs
// only when the Cloud Function has not written a matchScore — an unreachable
// backend, or a project without the Blaze plan. It therefore mirrors the
// documented formula in docs/SCORING.md §2.1 exactly, so a fallback score and a
// server score for the same pair agree:
//
//   matchScore = round(100 * (
//       0.30 * categoryMatch      // same category
//     + 0.30 * keywordOverlap     // Jaccard over the keyword sets
//     + 0.20 * zoneProximity      // same zone 1.0, adjacent 0.5
//     + 0.10 * recency            // 1 - min(1, daysApart / 14)
//     + 0.10 * complementarity    // one 'lost' + one 'found'
//   ))
//
// Two things the client cannot do the way the server does, both noted inline:
// it has no admin campusZones adjacency map, and feed cards expose keywords as
// `tags`.

// Mirrors MATCH_THRESHOLD in functions/index.js. SCORING.md §2.1 suggests 60;
// §2.2 says to tune against the seed data, and 50 is what that tuning landed on.
export const MATCH_THRESHOLD = 50;

const STOPWORDS = new Set([
  'the', 'and', 'with', 'for', 'this', 'that', 'from', 'near', 'have', 'lost', 'found',
  'item', 'items', 'please', 'help', 'contact', 'call', 'batch', 'hostel', 'desk', 'room',
]);

function tokenize(text = '') {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

/**
 * The keyword set to compare. Real posts store `keywords` (see deriveKeywords in
 * lib/feed.js), which the feed maps onto the card as `tags`; demo cards carry
 * hand-written tags instead. Tokenising title + description + tags reproduces
 * deriveKeywords for real posts and still gives demo cards a usable set.
 */
function keywordSet(item) {
  return new Set(
    tokenize(`${item.title || ''} ${item.description || ''} ${(item.tags || []).join(' ')}`)
  );
}

function jaccard(A, B) {
  if (A.size === 0 && B.size === 0) return 0;
  let inter = 0;
  A.forEach((x) => { if (B.has(x)) inter += 1; });
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Zone proximity without the server's campusZones adjacency map: exact zone is
 * 1.0, and a shared significant word between two zone labels ("Central Library"
 * ~ "Library Front Desk") stands in for the adjacency 0.5.
 */
function zoneProximity(a, b) {
  const locA = (a.location || '').toLowerCase().trim();
  const locB = (b.location || '').toLowerCase().trim();
  if (!locA || !locB) return 0;
  if (locA === locB) return 1;
  const wordsA = locA.split(/\s+/).filter((w) => w.length > 3);
  return wordsA.some((w) => locB.includes(w)) ? 0.5 : 0;
}

function millis(item) {
  return item._sort || item.createdAt || 0;
}

export function calculateMatchScore(itemA, itemB) {
  if (!itemA || !itemB) return { score: 0, factors: [] };
  // Only complementary lost <-> found pairs are scored at all.
  if (itemA.type === itemB.type || itemA.type === 'marketplace' || itemB.type === 'marketplace') {
    return { score: 0, factors: [] };
  }

  const factors = [];

  const categoryMatch = itemA.category && itemA.category === itemB.category ? 1 : 0;
  if (categoryMatch) {
    factors.push({ label: 'Category Match', detail: itemA.category, pts: 30 });
  }

  const setA = keywordSet(itemA);
  const setB = keywordSet(itemB);
  const shared = [...setA].filter((t) => setB.has(t));
  const keywordOverlap = jaccard(setA, setB);
  if (shared.length > 0) {
    factors.push({
      label: 'Matching Keywords',
      detail: shared.slice(0, 5).join(', '),
      pts: Math.round(30 * keywordOverlap),
    });
  }

  const zone = zoneProximity(itemA, itemB);
  if (zone === 1) {
    factors.push({ label: 'Same Campus Location', detail: itemA.location, pts: 20 });
  } else if (zone === 0.5) {
    factors.push({ label: 'Nearby Campus Area', detail: `${itemA.location} · ${itemB.location}`, pts: 10 });
  }

  const tA = millis(itemA);
  const tB = millis(itemB);
  // Unknown dates score 0, exactly as the server does when createdAt is absent.
  const daysApart = tA && tB ? Math.abs(tA - tB) / 86400000 : 14;
  const recency = 1 - Math.min(1, daysApart / 14);
  if (recency > 0) {
    const days = Math.round(daysApart);
    factors.push({
      label: days <= 1 ? 'Reported within a day' : `Reported ${days} days apart`,
      detail: 'within the 14-day window',
      pts: Math.round(10 * recency),
    });
  }

  // Guaranteed 1 here — the type guard above already rejected same-type pairs.
  const complementarity = 1;
  factors.push({ label: 'Lost ↔ Found pair', detail: `${itemA.type} + ${itemB.type}`, pts: 10 });

  const raw =
    0.30 * categoryMatch +
    0.30 * keywordOverlap +
    0.20 * zone +
    0.10 * recency +
    0.10 * complementarity;

  return { score: Math.round(100 * raw), factors, sharedTokens: shared };
}

/** Top candidate matches for an item, best first. */
export function findMatchesForItem(targetItem, allItems = []) {
  if (!targetItem || targetItem.type === 'marketplace') return [];
  const targetOpposite = targetItem.type === 'lost' ? 'found' : 'lost';

  return allItems
    .filter((candidate) => candidate.id !== targetItem.id && candidate.type === targetOpposite)
    .map((candidate) => {
      const { score, factors, sharedTokens } = calculateMatchScore(targetItem, candidate);
      return { candidate, score, factors, sharedTokens };
    })
    .filter((m) => m.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score);
}
