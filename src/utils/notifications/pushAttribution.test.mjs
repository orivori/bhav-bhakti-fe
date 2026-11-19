// Unit tests for pushAttribution.ts on Node's built-in test runner (Node
// 22.18+ reads the .ts file directly).
//   node --test src/utils/notifications/pushAttribution.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALLOWED_DEEP_LINK_SCREENS,
  PUSH_ATTRIBUTION_TTL_MS,
  cleanCampaign,
  clearPushCampaign,
  getPushCampaign,
  notificationPermissionValue,
  notificationTargetLabel,
  pushCampaignParam,
  setPushCampaign,
} from './pushAttribution.ts';

test('cleanCampaign: missing or empty = none', () => {
  for (const raw of [undefined, null, '', '   ', 42, {}, '!!!']) assert.equal(cleanCampaign(raw), 'none');
});

test('cleanCampaign: keeps a-z 0-9 _ -, lower case, trimmed', () => {
  assert.equal(cleanCampaign('rashifal_daily'), 'rashifal_daily');
  assert.equal(cleanCampaign('  Rashifal_Daily  '), 'rashifal_daily');
  assert.equal(cleanCampaign('rashifal daily!'), 'rashifaldaily');
  assert.equal(cleanCampaign('diwali-2026'), 'diwali-2026');
  assert.equal(cleanCampaign('राशिफल_daily'), '_daily');
});

test('cleanCampaign: cut at 40 characters (after cleaning)', () => {
  assert.equal(cleanCampaign('a'.repeat(50)), 'a'.repeat(40));
  assert.equal(cleanCampaign(`${' '.repeat(5)}${'b'.repeat(45)}`).length, 40);
});

test('notificationTargetLabel', () => {
  assert.equal(notificationTargetLabel('/(main)/horoscope', false), 'horoscope');
  assert.equal(notificationTargetLabel('/(main)/horoscope-detail', false), 'horoscope_detail');
  assert.equal(notificationTargetLabel('/(main)/daily-status', false), 'daily_status');
  assert.equal(notificationTargetLabel('/(main)', false), 'home');
  assert.equal(notificationTargetLabel('/(main)/audio-player', false), 'invalid');
  assert.equal(notificationTargetLabel(undefined, false), 'invalid');
  assert.equal(notificationTargetLabel('/(main)/horoscope', true), 'blocked');
  assert.equal(notificationTargetLabel(undefined, true), 'blocked');
  for (const screen of ALLOWED_DEEP_LINK_SCREENS) {
    assert.match(notificationTargetLabel(screen, false), /^[a-z_]+$/);
  }
});

test('push attribution: set, read, expires after 30 minutes', () => {
  clearPushCampaign();
  assert.equal(getPushCampaign(1000), undefined);
  assert.deepEqual(pushCampaignParam(1000), {});

  setPushCampaign('rashifal_daily', 1000);
  assert.equal(getPushCampaign(1000), 'rashifal_daily');
  assert.equal(getPushCampaign(1000 + PUSH_ATTRIBUTION_TTL_MS), 'rashifal_daily'); // exactly 30 min: still on
  assert.deepEqual(pushCampaignParam(1000 + 60000), { push_campaign: 'rashifal_daily' });

  assert.equal(getPushCampaign(1000 + PUSH_ATTRIBUTION_TTL_MS + 1), undefined);
  // Once expired it stays cleared.
  assert.equal(getPushCampaign(1000), undefined);
});

test('push attribution: a newer tap replaces the old one and restarts the 30 minutes', () => {
  clearPushCampaign();
  setPushCampaign('first', 0);
  setPushCampaign('second', 20 * 60000);
  assert.equal(getPushCampaign(45 * 60000), 'second');
  clearPushCampaign();
  assert.equal(getPushCampaign(45 * 60000), undefined);
});

test('notificationPermissionValue', () => {
  assert.equal(notificationPermissionValue({ enabled: true, hasAsked: false, apiLevel: 34 }), 'granted');
  assert.equal(notificationPermissionValue({ enabled: true, hasAsked: true, apiLevel: 31 }), 'granted');
  assert.equal(notificationPermissionValue({ enabled: false, hasAsked: false, apiLevel: 33 }), 'not_asked');
  assert.equal(notificationPermissionValue({ enabled: false, hasAsked: true, apiLevel: 34 }), 'denied');
  // Android 12 and older: no dialog; off means the user turned it off.
  assert.equal(notificationPermissionValue({ enabled: false, hasAsked: false, apiLevel: 31 }), 'denied');
});
