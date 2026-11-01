// Unit tests for contentLink.ts, on Node's built-in test runner (no test
// framework in this repo). Node 22.18+ reads the .ts file directly.
//   node --test src/utils/deepLinks/contentLink.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTENT_LINK_TYPES,
  feedIdForApi,
  isContentLinkType,
  isValidFeedId,
  parseContentLink,
} from './contentLink.ts';

test('accepts every allowed type', () => {
  for (const type of CONTENT_LINK_TYPES) {
    assert.deepEqual(parseContentLink(`bhavbhakti://open/${type}/123`), { type, feedId: '123' });
  }
});

test('accepts the smallest and largest ids', () => {
  assert.deepEqual(parseContentLink('bhavbhakti://open/aarti/1'), { type: 'aarti', feedId: '1' });
  assert.deepEqual(parseContentLink('bhavbhakti://open/aarti/999999999'), {
    type: 'aarti',
    feedId: '999999999',
  });
});

test('ignores the query string and fragment', () => {
  const expected = { type: 'mantra', feedId: '42' };
  assert.deepEqual(parseContentLink('bhavbhakti://open/mantra/42?utm_source=fb&x=1'), expected);
  assert.deepEqual(parseContentLink('bhavbhakti://open/mantra/42#top'), expected);
  assert.deepEqual(parseContentLink('bhavbhakti://open/mantra/42?a=1#b'), expected);
  assert.deepEqual(parseContentLink('bhavbhakti://open/mantra/42?'), expected);
  // A query can't smuggle in another path.
  assert.deepEqual(parseContentLink('bhavbhakti://open/mantra/42?next=/delete-account'), expected);
});

test('rejects a wrong scheme', () => {
  for (const raw of [
    'https://open/aarti/1',
    'http://bhavbhakti.app/open/aarti/1',
    'BHAVBHAKTI://open/aarti/1',
    'Bhavbhakti://open/aarti/1',
    'bhavbhakti:open/aarti/1',
    'bhavbhakti:/open/aarti/1',
    'bhavbhakti:///open/aarti/1',
    'xbhavbhakti://open/aarti/1',
    'exp+bhavbhakti://open/aarti/1',
    ' bhavbhakti://open/aarti/1',
    '/open/aarti/1',
    'open/aarti/1',
  ]) {
    assert.equal(parseContentLink(raw), null, raw);
  }
});

test('rejects a wrong host', () => {
  for (const raw of [
    'bhavbhakti://Open/aarti/1',
    'bhavbhakti://OPEN/aarti/1',
    'bhavbhakti://opened/aarti/1',
    'bhavbhakti://open.evil.com/aarti/1',
    'bhavbhakti://user@open/aarti/1',
    'bhavbhakti://open:80/aarti/1',
    'bhavbhakti://audio-player?audioUrl=https://evil.example/x.mp3&autoPlay=true',
    'bhavbhakti://delete-account',
    'bhavbhakti://(main)/delete-account',
    'bhavbhakti:///(main)/audio-player?feedId=1',
  ]) {
    assert.equal(parseContentLink(raw), null, raw);
  }
});

test('rejects missing or extra segments', () => {
  for (const raw of [
    'bhavbhakti://open',
    'bhavbhakti://open/',
    'bhavbhakti://open/aarti',
    'bhavbhakti://open/aarti/',
    'bhavbhakti://open/aarti/1/',
    'bhavbhakti://open/aarti/1/extra',
    'bhavbhakti://open//aarti/1',
    'bhavbhakti://open/aarti//1',
    'bhavbhakti://open/aarti/1/../delete-account',
  ]) {
    assert.equal(parseContentLink(raw), null, raw);
  }
});

test('rejects types outside the allow-list', () => {
  for (const type of [
    'Aarti',
    'AARTI',
    'stories',
    'story',
    'general',
    'audio-player',
    'delete-account',
    '',
    ' aarti',
    'aarti ',
    'aar%74i',
    '%61arti',
    'constructor',
    '__proto__',
    'toString',
  ]) {
    assert.equal(parseContentLink(`bhavbhakti://open/${type}/1`), null, type);
  }
});

test('rejects bad ids', () => {
  for (const id of [
    '0',
    '00',
    '012',
    '0012',
    '1234567890',
    '99999999999999999999',
    '9'.repeat(400),
    '-1',
    '+1',
    '1.0',
    '1e3',
    '0x1f',
    'abc',
    '1a',
    ' 1',
    '1 ',
    '%31',
    '1%00',
    'NaN',
    'Infinity',
    '',
  ]) {
    assert.equal(parseContentLink(`bhavbhakti://open/aarti/${id}`), null, id);
  }
});

test('rejects encoded characters anywhere in the link', () => {
  for (const raw of [
    'bhavbhakti%3A%2F%2Fopen%2Faarti%2F1',
    'bhavbhakti://%6Fpen/aarti/1',
    'bhavbhakti://open%2Faarti%2F1',
    'bhavbhakti://open/aarti%2F1',
    'bhavbhakti://open/aarti/1%2F2',
  ]) {
    assert.equal(parseContentLink(raw), null, raw);
  }
});

test('rejects non-strings, empty and over-long input', () => {
  for (const raw of [undefined, null, 123, {}, [], '', `bhavbhakti://open/aarti/1?${'a'.repeat(600)}`]) {
    assert.equal(parseContentLink(raw), null, String(raw));
  }
});

test('isContentLinkType and isValidFeedId', () => {
  assert.equal(isContentLinkType('status'), true);
  assert.equal(isContentLinkType('Status'), false);
  assert.equal(isContentLinkType(1), false);
  assert.equal(isValidFeedId('7'), true);
  assert.equal(isValidFeedId('07'), false);
  assert.equal(isValidFeedId(7), false);
});

test('feedIdForApi returns plain digits', () => {
  assert.equal(feedIdForApi({ type: 'aarti', feedId: '123' }), '123');
  assert.equal(feedIdForApi({ type: 'aarti', feedId: '999999999' }), '999999999');
});
