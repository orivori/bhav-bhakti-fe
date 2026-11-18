// The general centred notice's store (appNoticeStore.ts).
//   node --test src/store/appNoticeStore.test.mjs
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { useAppNoticeStore, selectIsAppNoticeOpen } from './appNoticeStore.ts';

const CONTENT = { title: { key: 'a.title' }, closeButton: { key: 'feedCard.ok' } };
let unregister = null;

beforeEach(() => {
  // Close anything left open by the previous test, then drop its host.
  useAppNoticeStore.getState().answer('dismissed');
  unregister?.();
  unregister = null;
});

const withHost = () => {
  unregister = useAppNoticeStore.getState().registerHost();
};

test('with no notice mounted, show() answers no_host and opens nothing', async () => {
  assert.equal(await useAppNoticeStore.getState().show(CONTENT), 'no_host');
  assert.equal(selectIsAppNoticeOpen(useAppNoticeStore.getState()), false);
});

test('show() opens the notice and resolves with the button pressed', async () => {
  withHost();
  const opened = useAppNoticeStore.getState().show(CONTENT);
  assert.equal(selectIsAppNoticeOpen(useAppNoticeStore.getState()), true);
  assert.deepEqual(useAppNoticeStore.getState().content, CONTENT);
  useAppNoticeStore.getState().answer('primary');
  assert.equal(await opened, 'primary');
  assert.equal(selectIsAppNoticeOpen(useAppNoticeStore.getState()), false);
});

test('close and dismiss are reported as such', async () => {
  withHost();
  const first = useAppNoticeStore.getState().show(CONTENT);
  useAppNoticeStore.getState().answer('close');
  assert.equal(await first, 'close');
  const second = useAppNoticeStore.getState().show(CONTENT);
  useAppNoticeStore.getState().answer('dismissed');
  assert.equal(await second, 'dismissed');
});

test('only one notice at a time: a second show() answers busy and leaves the first open', async () => {
  withHost();
  const first = useAppNoticeStore.getState().show(CONTENT);
  const other = { body: { key: 'b.body' }, closeButton: { key: 'feedCard.ok' } };
  assert.equal(await useAppNoticeStore.getState().show(other), 'busy');
  assert.deepEqual(useAppNoticeStore.getState().content, CONTENT);
  useAppNoticeStore.getState().answer('close');
  assert.equal(await first, 'close');
});

test('an answer with nothing open is ignored', () => {
  withHost();
  useAppNoticeStore.getState().answer('primary');
  assert.equal(selectIsAppNoticeOpen(useAppNoticeStore.getState()), false);
});

test('unregistering the host brings back no_host', async () => {
  withHost();
  unregister();
  unregister = null;
  assert.equal(await useAppNoticeStore.getState().show(CONTENT), 'no_host');
});
