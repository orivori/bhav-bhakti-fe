// Rules for safe cache downloads (safeDownloadRules.ts).
//   node --test src/utils/safeDownloadRules.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PART_SUFFIX,
  partPathFor,
  isPartFileName,
  getContentLength,
  checkCompletedDownload,
} from './safeDownloadRules.ts';

test('the temporary file sits next to the final file and ends in .part', () => {
  const part = partPathFor('file:///cache/audio_player_12.mp3', 'abc123');
  assert.equal(part, 'file:///cache/audio_player_12.mp3.abc123.part');
  assert.ok(part.endsWith(PART_SUFFIX));
  assert.ok(isPartFileName('audio_player_12.mp3.abc123.part'));
});

test('two downloads of the same file get different temporary files', () => {
  assert.notEqual(partPathFor('f.mp3', 'a'), partPathFor('f.mp3', 'b'));
});

test('only .part names count as temporary files', () => {
  assert.equal(isPartFileName('audio_player_12.mp3'), false);
  assert.equal(isPartFileName('Om Namah Shivaya.mp3'), false);
  assert.equal(isPartFileName('partial.mp3'), false);
  assert.equal(isPartFileName('.part'), true);
});

test('Content-Length is read whatever its capitalisation', () => {
  assert.equal(getContentLength({ 'Content-Length': '1700448' }), 1700448);
  assert.equal(getContentLength({ 'content-length': '42' }), 42);
  assert.equal(getContentLength({ 'CONTENT-LENGTH': ' 7 ' }), 7);
});

test('a missing or invalid Content-Length reads as null', () => {
  assert.equal(getContentLength(undefined), null);
  assert.equal(getContentLength(null), null);
  assert.equal(getContentLength({}), null);
  assert.equal(getContentLength({ 'Content-Type': 'audio/mpeg' }), null);
  assert.equal(getContentLength({ 'Content-Length': 'abc' }), null);
  assert.equal(getContentLength({ 'Content-Length': '-5' }), null);
  assert.equal(getContentLength({ 'Content-Length': '1.5' }), null);
  assert.equal(getContentLength({ 'Content-Length': '' }), null);
});

test('a complete 200 download with a matching length is accepted', () => {
  assert.deepEqual(
    checkCompletedDownload({ status: 200, headers: { 'Content-Length': '1024' }, actualSize: 1024 }),
    { ok: true, verifiedLength: true }
  );
});

test('a status other than 200 is rejected', () => {
  for (const status of [206, 304, 403, 404, 500]) {
    assert.deepEqual(
      checkCompletedDownload({ status, headers: { 'Content-Length': '10' }, actualSize: 10 }),
      { ok: false, reason: 'status' }
    );
  }
});

test('a file shorter or longer than Content-Length is rejected', () => {
  assert.deepEqual(
    checkCompletedDownload({ status: 200, headers: { 'content-length': '1024' }, actualSize: 512 }),
    { ok: false, reason: 'size_mismatch' }
  );
  assert.deepEqual(
    checkCompletedDownload({ status: 200, headers: { 'content-length': '1024' }, actualSize: 2048 }),
    { ok: false, reason: 'size_mismatch' }
  );
});

test('a missing or empty temporary file is rejected', () => {
  assert.deepEqual(
    checkCompletedDownload({ status: 200, headers: { 'Content-Length': '10' }, actualSize: null }),
    { ok: false, reason: 'missing_file' }
  );
  assert.deepEqual(
    checkCompletedDownload({ status: 200, headers: { 'Content-Length': '0' }, actualSize: 0 }),
    { ok: false, reason: 'empty' }
  );
});

test('without Content-Length a non-empty 200 download is accepted, marked unverified', () => {
  assert.deepEqual(
    checkCompletedDownload({ status: 200, headers: {}, actualSize: 5000 }),
    { ok: true, verifiedLength: false }
  );
});
