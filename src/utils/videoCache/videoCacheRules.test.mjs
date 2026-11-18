// Saved-video rules (videoCacheRules.ts).
//   node --test src/utils/videoCache/videoCacheRules.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  VIDEO_CACHE_MAX_BYTES,
  VIDEO_SAVE_AFTER_MS,
  hashStoragePath,
  videoFileName,
  parseVideoFileName,
  pickVideosToEvict,
  shouldStartVideoSave,
} from './videoCacheRules.ts';
import { storagePathFromSignedLink } from '../media/imageCacheKey.ts';

const PATH = 'Wallpapers/Video wallpapers/Shiva/Mahadev v2.mp4';

test('the hash is 8 hex characters and stable', () => {
  const hash = hashStoragePath(PATH);
  assert.match(hash, /^[0-9a-f]{8}$/);
  assert.equal(hashStoragePath(PATH), hash);
});

test('a replaced (v2) file gets a different hash, so a different file', () => {
  assert.notEqual(
    hashStoragePath('Wallpapers/Video wallpapers/Shiva/Mahadev.mp4'),
    hashStoragePath('Wallpapers/Video wallpapers/Shiva/Mahadev v2.mp4')
  );
});

test('Hindi paths hash without any encoding step', () => {
  assert.match(hashStoragePath('Wallpapers/Video wallpapers/शिव/महादेव v2.mp4'), /^[0-9a-f]{8}$/);
  assert.notEqual(hashStoragePath('a/शिव.mp4'), hashStoragePath('a/शिवा.mp4'));
});

test('the file name is video_<feedId>_<hash>.mp4 and reads back', () => {
  const name = videoFileName(123, PATH);
  assert.equal(name, `video_123_${hashStoragePath(PATH)}.mp4`);
  assert.deepEqual(parseVideoFileName(name), { feedId: '123', hash: hashStoragePath(PATH) });
  assert.equal(videoFileName('123', PATH), name);
});

test('a new signature for the same file gives the same file name', () => {
  const link = (sig) =>
    `https://storage.googleapis.com/b/Wallpapers/Video%20wallpapers/Shiva/Mahadev%20v2.mp4?X-Goog-Signature=${sig}`;
  assert.equal(
    videoFileName(9, storagePathFromSignedLink(link('one'))),
    videoFileName(9, storagePathFromSignedLink(link('two')))
  );
  assert.equal(storagePathFromSignedLink(link('x')), PATH);
});

test('a bad feed id or path gives no file name (the video just streams)', () => {
  for (const id of [0, '0', '012', -1, 1.5, 'abc', '', null, undefined, '1234567890']) {
    assert.equal(videoFileName(id, PATH), null, String(id));
  }
  for (const path of ['', null, undefined, 42]) {
    assert.equal(videoFileName(5, path), null, String(path));
  }
});

test('only real saved-video names read back', () => {
  for (const name of [
    'audio_player_12.mp3',
    'video_12_abcdef01.mp4.x1.part',
    'video_12_ABCDEF01.mp4',
    'video_012_abcdef01.mp4',
    'video_12_abcdef0.mp4',
    'video_12_abcdef01.mov',
    'video__abcdef01.mp4',
    'Om Namah Shivaya.mp3',
  ]) {
    assert.equal(parseVideoFileName(name), null, name);
  }
});

test('nothing is evicted while under the cap', () => {
  assert.deepEqual(pickVideosToEvict([{ name: 'a', size: 10, modifiedAt: 1 }], 100), []);
  assert.deepEqual(pickVideosToEvict([], 0), []);
});

test('the oldest files go first until the total fits', () => {
  const files = [
    { name: 'new', size: 40, modifiedAt: 30 },
    { name: 'old', size: 40, modifiedAt: 10 },
    { name: 'mid', size: 40, modifiedAt: 20 },
  ];
  assert.deepEqual(pickVideosToEvict(files, 100), ['old']);
  assert.deepEqual(pickVideosToEvict(files, 50), ['old', 'mid']);
});

test('a file in use is never evicted', () => {
  const files = [
    { name: 'old', size: 40, modifiedAt: 10 },
    { name: 'mid', size: 40, modifiedAt: 20 },
    { name: 'new', size: 40, modifiedAt: 30 },
  ];
  assert.deepEqual(pickVideosToEvict(files, 50, new Set(['old'])), ['mid', 'new']);
  assert.deepEqual(pickVideosToEvict(files, 10, new Set(['old', 'mid', 'new'])), []);
});

test('the cap is 150 MB', () => {
  assert.equal(VIDEO_CACHE_MAX_BYTES, 150 * 1024 * 1024);
});

test('a save starts only after real playback of a streamed video', () => {
  const base = { isRemote: true, alreadyRequested: false, isPlaying: true, positionMs: 0, didFinish: false };
  assert.equal(shouldStartVideoSave(base), false);
  assert.equal(shouldStartVideoSave({ ...base, positionMs: VIDEO_SAVE_AFTER_MS - 1 }), false);
  assert.equal(shouldStartVideoSave({ ...base, positionMs: VIDEO_SAVE_AFTER_MS }), true);
  // Paused at 3 s (e.g. scrolled away mid-play): not counted.
  assert.equal(shouldStartVideoSave({ ...base, isPlaying: false, positionMs: 3000 }), false);
  // A short clip that reached its end.
  assert.equal(shouldStartVideoSave({ ...base, isPlaying: false, positionMs: 900, didFinish: true }), true);
});

test('never for a local file, and only once per player', () => {
  const ready = { isRemote: true, alreadyRequested: false, isPlaying: true, positionMs: 5000, didFinish: true };
  assert.equal(shouldStartVideoSave({ ...ready, isRemote: false }), false);
  assert.equal(shouldStartVideoSave({ ...ready, alreadyRequested: true }), false);
});
