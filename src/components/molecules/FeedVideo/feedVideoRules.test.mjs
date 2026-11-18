// FeedVideo's pure rules (feedVideoRules.ts).
//   node --test src/components/molecules/FeedVideo/feedVideoRules.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseVideoSource, shouldShowPoster } from './feedVideoRules.ts';

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
  assert.equal(shouldShowPoster({ hasPoster: true, firstFrameShown: false, failed: false }), true);
  assert.equal(shouldShowPoster({ hasPoster: true, firstFrameShown: true, failed: false }), false);
});

test('the poster stays if the video fails, and never shows without a thumbnail', () => {
  assert.equal(shouldShowPoster({ hasPoster: true, firstFrameShown: true, failed: true }), true);
  assert.equal(shouldShowPoster({ hasPoster: false, firstFrameShown: false, failed: true }), false);
});
