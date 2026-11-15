// Unit tests for storyHomeCard.ts (Node 22.18+ reads the .ts files directly).
//   node --test src/features/stories/storyHomeCard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { homeListenQueue, markStoryCardShown, storyCardModel } from './storyHomeCard.ts';
import { parseStoryPreview, storyKind } from './storyLock.ts';

const series = { id: 187, type: 'stories', mediaType: null, url: null, seriesId: null, episodeNumber: null, episodeCount: 8 };
const preview = { feedId: 188, episodeNumber: 1, url: 'https://signed/ep1.mp3', duration: 48 };
const model = (feed) => storyCardModel(storyKind(feed), feed, parseStoryPreview(feed.preview));

test('a series with a free episode previews it; the cache key is the EPISODE id, never the series id', () => {
  const m = model({ ...series, preview });
  assert.equal(m.isSingle, false);
  assert.equal(m.previewFeedId, '188');
  assert.notEqual(m.previewFeedId, String(series.id));
  assert.equal(m.previewUrl, preview.url);
  assert.equal(m.episodeCount, 8);
  assert.equal(m.listenTarget, 'player');
});

test('a series with no free episode (preview null): cover only, Listen opens the page', () => {
  const m = model({ ...series, preview: null });
  assert.equal(m.previewUrl, null);
  assert.equal(m.previewFeedId, null);
  assert.equal(m.listenTarget, 'page');
});

test('a free single story previews itself, with no episode count', () => {
  const single = { id: 501, type: 'stories', mediaType: 'audio', url: 'https://signed/s.mp3', seriesId: null, episodeNumber: null };
  const m = model({ ...single, preview: { feedId: 501, episodeNumber: null, url: 'https://signed/s.mp3', duration: 300 } });
  assert.equal(m.isSingle, true);
  assert.equal(m.previewFeedId, '501');
  assert.equal(m.episodeCount, null);
  assert.equal(m.listenTarget, 'player');
});

test('a LOCKED single story (no url, episodeCount 0, preview null) is a single story card that opens its page', () => {
  const locked = { id: 502, type: 'stories', mediaType: 'audio', url: null, state: 'next', episodeCount: 0, seriesId: null, episodeNumber: null, preview: null };
  const m = model(locked);
  assert.equal(m.isSingle, true);
  assert.equal(m.episodeCount, null);
  assert.equal(m.listenTarget, 'page');
});

test('no card for episodes, other types or a bad id', () => {
  assert.equal(model({ id: 188, type: 'stories', mediaType: 'audio', seriesId: 187, episodeNumber: 1, preview }), null);
  assert.equal(model({ id: 5, type: 'aarti', mediaType: 'audio', url: 'x' }), null);
  assert.equal(model({ ...series, id: 0 }), null);
});

test('a malformed preview counts as none', () => {
  assert.equal(model({ ...series, preview: { feedId: 'x', url: '' } }).listenTarget, 'page');
});

test('Listen queue: the whole series, starting at the previewed episode', () => {
  const episodes = [{ id: 188 }, { id: 189 }, { id: 190 }];
  assert.deepEqual(homeListenQueue(episodes, '188'), { items: episodes, index: 0 });
  // Preview isn't always episode 1 (e.g. an ad-gated intro).
  assert.deepEqual(homeListenQueue(episodes, '189'), { items: episodes, index: 1 });
});

test('Listen queue: no list, an empty list or a missing preview = open that episode alone', () => {
  assert.equal(homeListenQueue(null, '188'), null);
  assert.equal(homeListenQueue([], '188'), null);
  assert.equal(homeListenQueue([{ id: 1 }], '188'), null);
  assert.equal(homeListenQueue([{ id: 188 }], null), null);
});

test('a long series queue keeps every episode in order (e.g. 108)', () => {
  const episodes = Array.from({ length: 108 }, (_, i) => ({ id: 1000 + i }));
  const plan = homeListenQueue(episodes, '1004');
  assert.equal(plan.items.length, 108);
  assert.equal(plan.index, 4);
});

test('story_home_card_shown fires once per card per session', () => {
  assert.equal(markStoryCardShown(9187), true);
  assert.equal(markStoryCardShown(9187), false);
  assert.equal(markStoryCardShown('9187'), false);
  assert.equal(markStoryCardShown(9188), true);
});
