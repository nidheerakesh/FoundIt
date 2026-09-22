// Smart matching algorithm for Lost & Found items.
// Compares complementary reports (lost <-> found) on:
// 1. Category identity (30 pts)
// 2. Keyword/token overlap (40 pts)
// 3. Zone/location proximity (20 pts)
// 4. Temporal proximity (10 pts)

function tokenize(text = '') {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
  );
}

const STOPWORDS = new Set([
  'the', 'and', 'with', 'for', 'this', 'that', 'from', 'near', 'have', 'lost', 'found',
  'item', 'items', 'please', 'help', 'contact', 'call', 'batch', 'hostel', 'desk', 'room',
]);

export function calculateMatchScore(itemA, itemB) {
  if (!itemA || !itemB) return { score: 0, factors: [] };
  // Must be opposite complementary types: lost <-> found
  if (itemA.type === itemB.type || itemA.type === 'marketplace' || itemB.type === 'marketplace') {
    return { score: 0, factors: [] };
  }

  const factors = [];
  let score = 0;

  // 1. Category match (30%)
  if (itemA.category && itemB.category && itemA.category === itemB.category) {
    score += 30;
    factors.push({ label: 'Category Match', detail: itemA.category, pts: 30 });
  }

  // 2. Keyword & title token overlap (up to 40%)
  const tokensA = tokenize(`${itemA.title || ''} ${itemA.description || ''} ${(itemA.tags || []).join(' ')}`);
  const tokensB = tokenize(`${itemB.title || ''} ${itemB.description || ''} ${(itemB.tags || []).join(' ')}`);

  const sharedTokens = [];
  tokensA.forEach((token) => {
    if (tokensB.has(token)) sharedTokens.push(token);
  });

  if (sharedTokens.length > 0) {
    // 1 shared = 18 pts, 2 shared = 28 pts, 3+ shared = up to 40 pts
    const tokenPts = Math.min(40, sharedTokens.length * 12 + 4);
    score += tokenPts;
    factors.push({
      label: 'Matching Keywords',
      detail: sharedTokens.slice(0, 5).join(', '),
      pts: tokenPts,
    });
  }

  // 3. Zone / Location match (up to 20%)
  const locA = (itemA.location || '').toLowerCase();
  const locB = (itemB.location || '').toLowerCase();
  if (locA && locB) {
    if (locA === locB) {
      score += 20;
      factors.push({ label: 'Same Campus Location', detail: itemA.location, pts: 20 });
    } else {
      // Check shared words
      const wordsA = locA.split(/\s+/).filter((w) => w.length > 3);
      const sharedLoc = wordsA.filter((w) => locB.includes(w));
      if (sharedLoc.length > 0) {
        score += 14;
        factors.push({ label: 'Nearby Campus Area', detail: sharedLoc.join(' '), pts: 14 });
      }
    }
  }

  // 4. Time proximity (up to 10%)
  const tA = itemA._sort || itemA.createdAt || 0;
  const tB = itemB._sort || itemB.createdAt || 0;
  if (tA && tB) {
    const diffHours = Math.abs(tA - tB) / (1000 * 60 * 60);
    if (diffHours < 24) {
      score += 10;
      factors.push({ label: 'Reported within 24 hours', detail: '< 24 hrs apart', pts: 10 });
    } else if (diffHours < 72) {
      score += 6;
      factors.push({ label: 'Reported within 3 days', detail: '< 3 days apart', pts: 6 });
    }
  }

  const normalized = Math.min(99, Math.max(15, score));
  return { score: normalized, factors, sharedTokens };
}

/**
 * Finds top candidate matches for a given item among all feed items.
 */
export function findMatchesForItem(targetItem, allItems = []) {
  if (!targetItem || targetItem.type === 'marketplace') return [];
  const targetOpposite = targetItem.type === 'lost' ? 'found' : 'lost';

  return allItems
    .filter((candidate) => candidate.id !== targetItem.id && candidate.type === targetOpposite)
    .map((candidate) => {
      const { score, factors, sharedTokens } = calculateMatchScore(targetItem, candidate);
      return {
        candidate,
        score,
        factors,
        sharedTokens,
      };
    })
    .filter((m) => m.score >= 40)
    .sort((a, b) => b.score - a.score);
}
