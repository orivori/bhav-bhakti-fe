// Unit tests for storyPage.ts (Node 22.18+ reads the .ts file directly).
//   node --test src/features/stories/storyPage.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STORY_PAGE_PATH,
  buildStoryPageParams,
  parseReturnParams,
  parseStoryEpisodeEntry,
  parseStoryPageSource,
  storyEntryForPageSource,
  storyPageRows,
} from './storyPage.ts';

test('the page route is the one story page', () => {
  assert.equal(STORY_PAGE_PATH, '/(main)/story-series');
});

test('storyPageRows: a series lists its episodes, a single story is its own one row', () => {
  const series = { id: 3 };
  const episodes = [{ id: 10 }, { id: 11 }];
  assert.deepEqual(storyPageRows('series', series, episodes), episodes);
  assert.deepEqual(storyPageRows('series', series, undefined), []);
  const single = { id: 21 };
  assert.deepEqual(storyPageRows('single', single, undefined), [single]);
  // A single story never shows a stray episode list.
  assert.deepEqual(storyPageRows('single', single, episodes), [single]);
});

test('storyPageRows: loading, an episode id or a non-story = no rows', () => {
  assert.deepEqual(storyPageRows('series', null, [{ id: 1 }]), []);
  assert.deepEqual(storyPageRows('episode', { id: 10 }, null), []);
  assert.deepEqual(storyPageRows(null, { id: 5 }, null), []);
});

test('buildStoryPageParams always sends every key, so nothing stale can stick', () => {
  assert.deepEqual(buildStoryPageParams({ storyId: 187, source: 'stories_tab', returnTo: '/(main)/stories' }), {
    storyId: '187',
    source: 'stories_tab',
    returnTo: '/(main)/stories',
    returnParams: '',
  });
  assert.deepEqual(
    buildStoryPageParams({ storyId: '21', source: 'home_card', returnTo: '/(main)', returnParams: { subTab: 'x' } }),
    { storyId: '21', source: 'home_card', returnTo: '/(main)', returnParams: '{"subTab":"x"}' }
  );
  assert.equal(buildStoryPageParams({ storyId: 1, source: 'player', returnTo: '/(main)', returnParams: {} }).returnParams, '');
});

test('parseReturnParams keeps only a JSON object of strings', () => {
  assert.deepEqual(parseReturnParams('{"storyId":"187","n":3}'), { storyId: '187' });
  for (const raw of [undefined, null, '', 'not json', '[1,2]', '"x"', '{}', 42]) {
    assert.equal(parseReturnParams(raw), undefined);
  }
});

test('the page restores itself after the player (round trip)', () => {
  const page = buildStoryPageParams({ storyId: 187, source: 'home_card', returnTo: '/(main)' });
  // The player's back sends these back to the page as its params.
  const back = buildStoryPageParams({
    storyId: page.storyId,
    source: parseStoryPageSource(page.source),
    returnTo: page.returnTo,
    returnParams: parseReturnParams(page.returnParams),
  });
  assert.deepEqual(back, page);
});

test('sources and entries', () => {
  for (const source of ['home_card', 'stories_tab', 'player']) assert.equal(parseStoryPageSource(source), source);
  for (const value of [undefined, '', 'link', 'HOME_CARD']) assert.equal(parseStoryPageSource(value), null);
  assert.equal(storyEntryForPageSource('player'), 'player_series_name');
  assert.equal(storyEntryForPageSource('home_card'), 'story_page');
  assert.equal(storyEntryForPageSource(undefined), 'story_page');
  for (const entry of ['home_card_listen', 'story_page', 'queue', 'auto_advance', 'player_series_name']) {
    assert.equal(parseStoryEpisodeEntry(entry), entry);
  }
  assert.equal(parseStoryEpisodeEntry('elsewhere'), null);
});
