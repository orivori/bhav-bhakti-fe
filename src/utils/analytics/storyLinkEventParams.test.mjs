// Story event parameters (storyLinkEventParams.ts): only allowed values, no ids.
//   node --test src/utils/analytics/storyLinkEventParams.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storyLinkLandedParams, STORY_PLAY_STARTED_META_PARAMS } from './storyLinkEventParams.ts';

test('story_link_landed carries only kind and result for a story link', () => {
  for (const kind of ['pin', 'page']) {
    for (const result of ['opened', 'not_found', 'type_mismatch', 'expired', 'error']) {
      assert.deepEqual(storyLinkLandedParams({ type: 'stories', kind }, result), { kind, result });
    }
  }
});

test('story_link_landed is not sent for any other link type', () => {
  for (const type of ['aarti', 'wallpaper', 'status', 'other', '']) {
    assert.equal(storyLinkLandedParams({ type, kind: 'pin' }, 'opened'), null, type);
  }
});

test('story_link_landed rejects an unknown kind or result (no "disabled")', () => {
  assert.equal(storyLinkLandedParams({ type: 'stories', kind: 'open' }, 'opened'), null);
  assert.equal(storyLinkLandedParams({ type: 'stories', kind: 'page' }, 'disabled'), null);
  assert.equal(storyLinkLandedParams({ type: 'stories', kind: 'page' }, 'pinned'), null);
});

test('the event parameters never include an id or a title', () => {
  const params = storyLinkLandedParams({ type: 'stories', kind: 'page', feedId: '300', title: 'x' }, 'opened');
  assert.deepEqual(Object.keys(params).sort(), ['kind', 'result']);
});

test('story_play_started sends content_type stories and action listen only', () => {
  assert.deepEqual({ ...STORY_PLAY_STARTED_META_PARAMS }, { content_type: 'stories', action: 'listen' });
});
