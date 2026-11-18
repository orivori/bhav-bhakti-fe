// Every string the centred notices use (AppNotice: saved to gallery,
// ringtone steps) exists in English AND Hindi, is not empty, and both
// languages use exactly the same {{placeholders}}.
//   node --test src/utils/noticeStrings.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const load = (lang) => JSON.parse(readFileSync(new URL(`../locales/${lang}.json`, import.meta.url), 'utf8'));
const en = load('en');
const hi = load('hi');
const get = (obj, key) => key.split('.').reduce((value, part) => (value == null ? undefined : value[part]), obj);
const placeholders = (text) => [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort();

const NOTICE_KEYS = [
  // Saved to gallery (galleryNotices.ts)
  'common.savedToGalleryTitle',
  'common.savedToGalleryMessage',
  'common.alreadySavedTitle',
  'common.alreadySavedMessage',
  'common.error',
  'common.saveFailedMessage',
  'feedCard.ok',
];

test('every notice string exists in English and Hindi and is not empty', () => {
  for (const key of NOTICE_KEYS) {
    for (const [name, locale] of [['en', en], ['hi', hi]]) {
      const value = get(locale, key);
      assert.equal(typeof value, 'string', `${name}: ${key} missing`);
      assert.ok(value.trim().length > 0, `${name}: ${key} empty`);
    }
  }
});

test('English and Hindi use the same {{placeholders}} in every notice string', () => {
  for (const key of NOTICE_KEYS) {
    assert.deepEqual(placeholders(get(hi, key)), placeholders(get(en, key)), `${key}: placeholders differ`);
  }
});
