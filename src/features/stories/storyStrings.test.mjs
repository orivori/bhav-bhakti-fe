// Every string the story page and the Home story card use exists in English
// AND Hindi (and the two story sections have the same keys).
//   node --test src/features/stories/storyStrings.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const load = (lang) => JSON.parse(readFileSync(new URL(`../../locales/${lang}.json`, import.meta.url), 'utf8'));
const en = load('en');
const hi = load('hi');
const get = (obj, key) => key.split('.').reduce((value, part) => (value == null ? undefined : value[part]), obj);

const USED_KEYS = [
  'stories.title',
  'stories.episodeCountOne',
  'stories.episodeCountOther',
  'stories.episodesHeading',
  'stories.noEpisodes',
  'stories.seriesLoadError',
  'stories.storyLoadError',
  'stories.storyUnavailable',
  'storyLock.unlockToListen',
  'storyLock.unlockedSummary',
  'storyLock.adBodySingle',
  'storyLock.noFillUnlockedSingle',
  'feedCard.typeStory',
  'feedCard.listen',
  'chooseStart.seeAll',
  'common.retry',
];

test('every story page / Home card string exists in English and Hindi', () => {
  for (const key of USED_KEYS) {
    for (const [name, locale] of [['en', en], ['hi', hi]]) {
      const value = get(locale, key);
      assert.equal(typeof value, 'string', `${name}: ${key} missing`);
      assert.ok(value.trim().length > 0, `${name}: ${key} empty`);
    }
  }
});

test('the Hindi strings are really Hindi (Devanagari), not copied English', () => {
  for (const key of USED_KEYS) assert.match(get(hi, key), /[ऀ-ॿ]/, key);
});

test('the stories and storyLock sections have the same keys in both languages', () => {
  for (const section of ['stories', 'storyLock']) {
    assert.deepEqual(Object.keys(en[section]).sort(), Object.keys(hi[section]).sort(), section);
  }
});

test('placeholders match between languages', () => {
  for (const key of ['stories.episodeCountOther', 'storyLock.unlockedSummary']) {
    const vars = (text) => (text.match(/{{\w+}}/g) || []).sort();
    assert.deepEqual(vars(get(en, key)), vars(get(hi, key)), key);
  }
});
