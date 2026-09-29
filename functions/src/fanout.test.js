// Run: cd functions && node --test
const { test } = require('node:test');
const assert = require('node:assert');
const { mirrorMatches } = require('./fanout');

const candidate = (over = {}) => ({ id: 'found-1', score: 82, data: { postedBy: 'uid-finder', title: 'Blue bottle', ...over } });

test('mirrorMatches: a counterpart with no match yet is linked and notified', () => {
  const [a] = mirrorMatches('lost-1', [candidate()]);
  assert.deepStrictEqual(a.update, { matchedWith: ['lost-1'], matchScore: 82, status: 'matched' });
  assert.deepStrictEqual(a.notify, { uid: 'uid-finder', title: 'Blue bottle', score: 82 });
});

test('mirrorMatches: both sides end up notified across the two trigger runs', () => {
  // Poster A posts first — nothing to match, no actions.
  assert.deepStrictEqual(mirrorMatches('lost-1', []), []);
  // Poster B posts second: B is notified by the trigger itself (index.js), and
  // A is notified here. Before this existed, A heard nothing.
  const [a] = mirrorMatches('found-1', [{ id: 'lost-1', score: 82, data: { postedBy: 'uid-owner', title: 'Lost bottle' } }]);
  assert.strictEqual(a.notify.uid, 'uid-owner');
});

test('mirrorMatches: an already-settled counterpart is left alone', () => {
  const settled = candidate({ matchedWith: ['lost-1'], matchScore: 82, status: 'matched' });
  assert.deepStrictEqual(mirrorMatches('lost-1', [settled]), []);
});

test('mirrorMatches: a counterpart that already had a match is updated but not re-notified', () => {
  const [a] = mirrorMatches('lost-2', [candidate({ matchedWith: ['lost-1'], matchScore: 70, status: 'matched' })]);
  assert.deepStrictEqual(a.update.matchedWith, ['lost-2', 'lost-1']);
  assert.strictEqual(a.update.matchScore, 82, 'takes the better of the two scores');
  assert.strictEqual(a.notify, null, 'only the first match is announced');
});

test('mirrorMatches: a weaker new match never lowers a stored score', () => {
  const [a] = mirrorMatches('lost-2', [candidate({ score: 55, matchedWith: ['lost-1'], matchScore: 90, status: 'matched' })]);
  assert.strictEqual(a.update.matchScore, 90);
});

test('mirrorMatches: the counterpart match list stays capped at five', () => {
  const full = candidate({ matchedWith: ['a', 'b', 'c', 'd', 'e'], matchScore: 60, status: 'matched' });
  const [a] = mirrorMatches('lost-9', [full]);
  assert.strictEqual(a.update.matchedWith.length, 5);
  assert.deepStrictEqual(a.update.matchedWith, ['lost-9', 'a', 'b', 'c', 'd']);
});
