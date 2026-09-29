// Pure fan-out decisions for the matching trigger. No Firebase deps, so this is
// unit-testable and explainable in the viva — same principle as scoring.js.
// functions/index.js is what actually applies the result.

/**
 * A match belongs to both reports (ARCHITECTURE.md §4.8 — "New match found →
 * Both item posters"), but the Firestore trigger only ever fires for the
 * document that changed. This works out what to mirror onto each counterpart.
 *
 * Two rules matter:
 *  - Announce only a counterpart's *first* match, never every recompute, so a
 *    re-scored item does not re-notify everyone it already matched.
 *  - Skip a counterpart that is already fully up to date, so the write (and the
 *    trigger it would fire) never happens at all.
 *
 * @param {string} itemId  the item that was just scored
 * @param {Array}  top     [{ id, score, data }] best candidates, best first
 * @returns {Array} [{ id, update, notify }] — notify is null when the
 *                  counterpart already had a match.
 */
function mirrorMatches(itemId, top = []) {
  const actions = [];

  for (const m of top) {
    const cand = m.data || {};
    const matched = Array.isArray(cand.matchedWith) ? cand.matchedWith : [];
    const linked = matched.includes(itemId);
    const stored = cand.matchScore ?? null;
    // matchScore is symmetric, so m.score is what the counterpart would compute
    // for us. Never lower a counterpart's score — it may have a better match.
    const next = stored == null ? m.score : Math.max(stored, m.score);

    if (linked && stored === next && cand.status === 'matched') continue;

    actions.push({
      id: m.id,
      update: {
        matchedWith: linked ? matched : [itemId, ...matched].slice(0, 5),
        matchScore: next,
        status: 'matched',
      },
      notify: stored == null
        ? { uid: cand.postedBy, title: cand.title, score: m.score }
        : null,
    });
  }

  return actions;
}

module.exports = { mirrorMatches };
