// Unit tests for homePin.ts, on Node's built-in test runner (like
// contentLink.test.mjs). Node 22.18+ reads the .ts file directly.
//   node --test src/utils/deepLinks/homePin.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FRESH_INSTALL_WINDOW_MS,
  PIN_DECISION_MAX_MS,
  PIN_FETCH_TIMEOUT_MS,
  PROBE_WAIT_MAX_MS,
  classifyPinFetchError,
  classifyPinnedFeed,
  isFreshInstall,
  isFromOtherInstall,
  placePinnedFeed,
  raceWithTimeout,
  stepBudgetMs,
} from './homePin.ts';

const NOW = 1_800_000_000_000;

test('fresh install: within the last day only', () => {
  assert.equal(isFreshInstall(NOW - 1000, NOW), true);
  assert.equal(isFreshInstall(NOW - FRESH_INSTALL_WINDOW_MS + 1, NOW), true);
  assert.equal(isFreshInstall(NOW - FRESH_INSTALL_WINDOW_MS, NOW), false);
  assert.equal(isFreshInstall(NOW - 5 * FRESH_INSTALL_WINDOW_MS, NOW), false);
});

test('fresh install: unknown or future install time is not fresh', () => {
  assert.equal(isFreshInstall(null, NOW), false);
  assert.equal(isFreshInstall(Number.NaN, NOW), false);
  assert.equal(isFreshInstall(NOW + 1000, NOW), false);
});

test('other install: only when both install times are known and differ', () => {
  assert.equal(isFromOtherInstall(100, 200), true);
  assert.equal(isFromOtherInstall(100, 100), false);
  assert.equal(isFromOtherInstall(undefined, 200), false);
  assert.equal(isFromOtherInstall(100, null), false);
});

test('pins a feed whose type matches the link', () => {
  const pairs = [
    ['wallpaper', 'wallpaper'],
    ['status', 'wallpaper'],
    ['thought', 'thought'],
    ['ringtone', 'ringtone'],
    ['aarti', 'aarti'],
    ['bhajan', 'bhajan'],
    ['mantra', 'mantra'],
  ];
  for (const [linkType, feedType] of pairs) {
    const feed = { id: 7, type: feedType, url: 'https://example.test/f' };
    assert.deepEqual(classifyPinnedFeed(linkType, feed), { kind: 'pin', feed });
  }
});

test('type mismatch, unknown type, no file or no feed: skipped and consumed', () => {
  const skip = { kind: 'skip', reason: 'type_mismatch', consume: true };
  assert.deepEqual(classifyPinnedFeed('aarti', { id: 7, type: 'wallpaper', url: 'u' }), skip);
  assert.deepEqual(classifyPinnedFeed('thought', { id: 7, type: 'wallpaper', url: 'u' }), skip);
  assert.deepEqual(classifyPinnedFeed('status', { id: 7, type: 'thought', url: 'u' }), skip);
  assert.deepEqual(classifyPinnedFeed('aarti', { id: 7, type: 'stories', url: 'u' }), skip);
  assert.deepEqual(classifyPinnedFeed('story', { id: 7, type: 'stories', url: 'u' }), skip);
  assert.deepEqual(classifyPinnedFeed('aarti', { id: 7, type: 'aarti', url: '' }), skip);
  assert.deepEqual(classifyPinnedFeed('aarti', { id: 7, type: 'aarti' }), skip);
  assert.deepEqual(classifyPinnedFeed('aarti', null), skip);
  assert.deepEqual(classifyPinnedFeed('aarti', undefined), skip);
});

test('fetch errors: only a 404 is consumed', () => {
  assert.deepEqual(classifyPinFetchError({ statusCode: 404 }), { kind: 'skip', reason: 'not_found', consume: true });
  for (const error of [{ statusCode: 0 }, { statusCode: 500 }, { statusCode: 401 }, new Error('x'), null, undefined]) {
    assert.deepEqual(classifyPinFetchError(error), { kind: 'skip', reason: 'error', consume: false });
  }
});

test('pinned feed goes first and is removed from the rest', () => {
  const pinned = { id: 5, type: 'aarti', url: 'u' };
  const feeds = [{ id: 1 }, { id: '5' }, { id: 2 }, { id: 5 }];
  assert.deepEqual(
    placePinnedFeed(feeds, pinned).map((feed) => feed.id),
    [5, 1, 2]
  );
});

test('no pin: the same array comes back unchanged', () => {
  const feeds = [{ id: 1 }, { id: 2 }];
  assert.equal(placePinnedFeed(feeds, null), feeds);
});

test('caps: 3 s for the whole decision, 2.5 s for the fetch, 2 s for the probe wait', () => {
  assert.equal(PIN_DECISION_MAX_MS, 3000);
  assert.equal(PIN_FETCH_TIMEOUT_MS, 2500);
  assert.equal(PROBE_WAIT_MAX_MS, 2000);
});

test('step budget: its own cap, never past the decision deadline', () => {
  const start = 1000;
  const deadline = start + PIN_DECISION_MAX_MS;
  // Probe wait right at the start: its own 2 s cap.
  assert.equal(stepBudgetMs(PROBE_WAIT_MAX_MS, deadline, start), 2000);
  // No probe wait: the fetch gets its full 2.5 s.
  assert.equal(stepBudgetMs(PIN_FETCH_TIMEOUT_MS, deadline, start + 10), 2500);
  // After a full 2 s probe wait only 1 s is left, so probe + fetch <= 3 s.
  const fetchBudget = stepBudgetMs(PIN_FETCH_TIMEOUT_MS, deadline, start + 2000);
  assert.equal(fetchBudget, 1000);
  assert.ok(2000 + fetchBudget <= PIN_DECISION_MAX_MS);
  // At or past the deadline: nothing left.
  assert.equal(stepBudgetMs(PIN_FETCH_TIMEOUT_MS, deadline, deadline), 0);
  assert.equal(stepBudgetMs(PIN_FETCH_TIMEOUT_MS, deadline, deadline + 500), 0);
});

test('raceWithTimeout: value before the cap', async () => {
  const result = await raceWithTimeout(Promise.resolve('feed'), 50);
  assert.deepEqual(result, { timedOut: false, value: 'feed' });
});

test('raceWithTimeout: a slow promise times out at the cap', async () => {
  const slow = new Promise((resolve) => setTimeout(() => resolve('late'), 200));
  const startedAt = Date.now();
  const result = await raceWithTimeout(slow, 30);
  assert.deepEqual(result, { timedOut: true });
  assert.ok(Date.now() - startedAt < 150);
});

test('raceWithTimeout: a rejection before the cap is passed on', async () => {
  await assert.rejects(raceWithTimeout(Promise.reject({ statusCode: 404 }), 50), (error) => error.statusCode === 404);
});

test('a timed-out fetch keeps the link, like a network error', () => {
  // useHomePin treats a timeout as classifyPinFetchError(null).
  assert.deepEqual(classifyPinFetchError(null), { kind: 'skip', reason: 'error', consume: false });
});
