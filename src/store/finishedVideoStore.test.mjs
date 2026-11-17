// Unit tests for finishedVideoStore.ts on Node's built-in test runner (Node
// 22.18+ reads the .ts file directly).
//   node --test src/store/finishedVideoStore.test.mjs
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { useFinishedVideoStore, isVideoFinished } from './finishedVideoStore.ts';

const store = () => useFinishedVideoStore.getState();

beforeEach(() => store().reset());

test('a video is not finished until it is marked', () => {
  assert.equal(isVideoFinished(store(), '77'), false);
  store().markFinished('77');
  assert.equal(isVideoFinished(store(), '77'), true);
  assert.equal(isVideoFinished(store(), '78'), false);
});

test('marking twice keeps the same state object (no extra re-render)', () => {
  store().markFinished('77');
  const before = store().finishedIds;
  store().markFinished('77');
  assert.equal(store().finishedIds, before);
});

test('replay clears only that video', () => {
  store().markFinished('77');
  store().markFinished('179');
  store().clearFinished('77');
  assert.equal(isVideoFinished(store(), '77'), false);
  assert.equal(isVideoFinished(store(), '179'), true);
});

test('clearing a video that never finished changes nothing', () => {
  store().markFinished('179');
  const before = store().finishedIds;
  store().clearFinished('77');
  assert.equal(store().finishedIds, before);
});

test('reset forgets every video', () => {
  store().markFinished('77');
  store().markFinished('179');
  store().reset();
  assert.deepEqual(store().finishedIds, {});
});
