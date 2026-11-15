// Unit tests for storyNoticeStore.ts on Node's built-in test runner (Node
// 22.18+ reads the .ts file directly).
//   node --test src/store/storyNoticeStore.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useStoryNoticeStore, showStoryNotice } from './storyNoticeStore.ts';

const store = () => useStoryNoticeStore.getState();

test('with no host mounted, show() resolves at once and opens nothing', async () => {
  await showStoryNotice('storyLock.previousFirst');
  assert.equal(store().messageKey, null);
});

test('show() opens the notice and resolves only when it is dismissed', async () => {
  const unregister = store().registerHost();
  let resolved = false;
  const shown = showStoryNotice('storyLock.noFillUnlocked').then(() => {
    resolved = true;
  });
  assert.equal(store().messageKey, 'storyLock.noFillUnlocked');
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(resolved, false);
  store().dismiss();
  await shown;
  assert.equal(resolved, true);
  assert.equal(store().messageKey, null);
  unregister();
});

test('never two at once: a second show() while open neither replaces nor stacks', async () => {
  const unregister = store().registerHost();
  const first = showStoryNotice('storyLock.previousFirst');
  const second = showStoryNotice('storyLock.dailyLimit');
  assert.equal(store().messageKey, 'storyLock.previousFirst');
  assert.equal(second, first);
  store().dismiss();
  await Promise.all([first, second]);
  assert.equal(store().messageKey, null);
  // A double dismiss (OK and the outside tap together) is harmless.
  store().dismiss();
  assert.equal(store().messageKey, null);
  unregister();
});
