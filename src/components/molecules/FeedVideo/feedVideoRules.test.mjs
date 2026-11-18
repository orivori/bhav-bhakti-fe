// FeedVideo's pure rules (feedVideoRules.ts).
//   node --test src/components/molecules/FeedVideo/feedVideoRules.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseVideoSource, shouldShowPoster, frameVisibleAfter, isPlaybackProgress } from './feedVideoRules.ts';

const REMOTE = 'https://storage.googleapis.com/b/a%20v2.mp4?X-Goog-Signature=s';
const LOCAL = 'file:///data/cache/video_12_abcdef01.mp4';

test('a saved file plays when saving is on and the file exists', () => {
  assert.deepEqual(
    chooseVideoSource({ savingEnabled: true, localUri: LOCAL, remoteUri: REMOTE, localFailed: false }),
    { kind: 'local', uri: LOCAL }
  );
});

test('the online link plays when saving is off, there is no file, or the file failed', () => {
  const remote = { kind: 'remote', uri: REMOTE };
  assert.deepEqual(chooseVideoSource({ savingEnabled: false, localUri: LOCAL, remoteUri: REMOTE, localFailed: false }), remote);
  assert.deepEqual(chooseVideoSource({ savingEnabled: true, localUri: null, remoteUri: REMOTE, localFailed: false }), remote);
  assert.deepEqual(chooseVideoSource({ savingEnabled: true, localUri: LOCAL, remoteUri: REMOTE, localFailed: true }), remote);
});

test('the poster covers the video until its first frame', () => {
  assert.equal(shouldShowPoster({ hasPoster: true, frameVisible: false, failed: false }), true);
  assert.equal(shouldShowPoster({ hasPoster: true, frameVisible: true, failed: false }), false);
});

test('the poster stays if the video fails, and never shows without a thumbnail', () => {
  assert.equal(shouldShowPoster({ hasPoster: true, frameVisible: true, failed: true }), true);
  assert.equal(shouldShowPoster({ hasPoster: false, frameVisible: false, failed: true }), false);
});

test('the poster comes back when the app goes to the background', () => {
  // A frame was showing; the background trip drops the video surface.
  const frameVisible = frameVisibleAfter('background');
  assert.equal(frameVisible, false);
  assert.equal(shouldShowPoster({ hasPoster: true, frameVisible, failed: false }), true);
});

test('the poster hides again on the first frame or when playback moves', () => {
  assert.equal(frameVisibleAfter('first_frame'), true);
  assert.equal(frameVisibleAfter('progress'), true);
});

test('playback progress needs a baseline, real movement and playing', () => {
  // First report after a reset only sets the baseline.
  assert.equal(isPlaybackProgress(null, 3.2, true), false);
  assert.equal(isPlaybackProgress(3.0, 3.25, true), true);
  // Paused or stuck (offline, loading): no progress, so the poster stays.
  assert.equal(isPlaybackProgress(3.0, 3.25, false), false);
  assert.equal(isPlaybackProgress(3.0, 3.0, true), false);
  assert.equal(isPlaybackProgress(3.0, 3.02, true), false);
  // A jump back (Replay seeks to 0) is not progress.
  assert.equal(isPlaybackProgress(5.0, 0, true), false);
});
