// Unit tests for storyLock.ts on Node's built-in test runner (Node 22.18+
// reads the .ts file directly).
//   node --test src/features/stories/storyLock.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canPlayQueueItem,
  classifyStoryUnlockResponse,
  isStoryStatePlayable,
  parseStoryState,
  storyTapAction,
  unlockedSummary,
} from './storyLock.ts';

test('parseStoryState keeps only known states', () => {
  for (const state of ['free', 'unlocked', 'temp', 'next', 'locked']) assert.equal(parseStoryState(state), state);
  for (const value of [undefined, null, '', 'LOCKED', 'paid', 3]) assert.equal(parseStoryState(value), null);
});

test('no state (lock off, old data) is playable - backward compatible', () => {
  assert.equal(isStoryStatePlayable(undefined), true);
  assert.equal(isStoryStatePlayable(null), true);
  assert.equal(isStoryStatePlayable('something-new'), true);
  assert.equal(storyTapAction(undefined), 'play');
});

test('playable vs locked states', () => {
  assert.deepEqual(
    ['free', 'unlocked', 'temp', 'next', 'locked'].map(isStoryStatePlayable),
    [true, true, true, false, false]
  );
});

test('what a tap does', () => {
  assert.equal(storyTapAction('free'), 'play');
  assert.equal(storyTapAction('unlocked'), 'play');
  assert.equal(storyTapAction('temp'), 'play');
  assert.equal(storyTapAction('next'), 'unlock');
  assert.equal(storyTapAction('locked'), 'previous_first');
});

test('the player only moves to an item with audio and a playable state', () => {
  assert.equal(canPlayQueueItem({ audioUrl: 'https://x/a.mp3' }), true);
  assert.equal(canPlayQueueItem({ audioUrl: 'https://x/a.mp3', storyState: 'temp' }), true);
  assert.equal(canPlayQueueItem({ audioUrl: '', storyState: 'next' }), false);
  assert.equal(canPlayQueueItem({ audioUrl: 'https://x/a.mp3', storyState: 'locked' }), false);
  assert.equal(canPlayQueueItem({ audioUrl: '' }), false);
  assert.equal(canPlayQueueItem(null), false);
  assert.equal(canPlayQueueItem(undefined), false);
});

test('unlock response classification', () => {
  assert.equal(classifyStoryUnlockResponse(201), 'granted');
  assert.equal(classifyStoryUnlockResponse(200), 'granted');
  assert.equal(classifyStoryUnlockResponse(409, 'PREVIOUS_EPISODE_FIRST'), 'refused');
  assert.equal(classifyStoryUnlockResponse(403, 'STORY_LOCK_DISABLED'), 'disabled');
  assert.equal(classifyStoryUnlockResponse(403, 'OTHER'), 'failed');
  assert.equal(classifyStoryUnlockResponse(429), 'cap_reached');
  assert.equal(classifyStoryUnlockResponse(401), 'unauthorized');
  assert.equal(classifyStoryUnlockResponse(500), 'failed');
  assert.equal(classifyStoryUnlockResponse(undefined), 'failed');
});

test('"N of M unlocked" only with both counts', () => {
  assert.deepEqual(unlockedSummary({ unlockedCount: 2, episodeCount: 8 }), { unlocked: 2, total: 8 });
  assert.deepEqual(unlockedSummary({ unlockedCount: 9, episodeCount: 8 }), { unlocked: 8, total: 8 });
  assert.equal(unlockedSummary({ episodeCount: 8 }), null);
  assert.equal(unlockedSummary({ unlockedCount: 0, episodeCount: 0 }), null);
});

test('single story vs series episode: decided by series and episode number, never by audio', async () => {
  const { isSingleStory, storyMessageKey } = await import('./storyLock.ts');
  assert.equal(isSingleStory({ seriesId: null, episodeNumber: null }), true);
  assert.equal(isSingleStory({}), true);
  assert.equal(isSingleStory({ seriesId: 187, episodeNumber: 3 }), false);
  // Either field alone still means "part of a series".
  assert.equal(isSingleStory({ seriesId: 187 }), false);
  assert.equal(isSingleStory({ episodeNumber: 2 }), false);
  assert.equal(storyMessageKey('noFillUnlocked', { seriesId: null }), 'storyLock.noFillUnlockedSingle');
  assert.equal(storyMessageKey('noFillUnlocked', { seriesId: 187, episodeNumber: 3 }), 'storyLock.noFillUnlocked');
  assert.equal(storyMessageKey('adBody', {}), 'storyLock.adBodySingle');
  assert.equal(storyMessageKey('adBody', { seriesId: 187, episodeNumber: 1 }), 'storyLock.adBody');
});

test('every key storyMessageKey can return exists in English and Hindi', async () => {
  const { readFileSync } = await import('node:fs');
  const { storyMessageKey } = await import('./storyLock.ts');
  for (const lang of ['en', 'hi']) {
    const strings = JSON.parse(readFileSync(new URL('../../locales/' + lang + '.json', import.meta.url), 'utf8'));
    for (const message of ['adBody', 'noFillUnlocked']) {
      for (const item of [{}, { seriesId: 1, episodeNumber: 1 }]) {
        const key = storyMessageKey(message, item).split('.')[1];
        assert.equal(typeof strings.storyLock[key], 'string', lang + ' ' + key);
      }
    }
  }
});
