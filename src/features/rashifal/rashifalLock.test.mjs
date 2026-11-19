// Unit tests for rashifalLock.ts on Node's built-in test runner (Node 22.18+
// reads the .ts file directly).
//   node --test src/features/rashifal/rashifalLock.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ZODIAC_SIGN_KEYS,
  classifyRashifalUnlockResponse,
  decideRashifalOpen,
  isRashifalLockedError,
  isRashifalSignLocked,
  parseRashifalStatus,
  parseUnlockedVia,
  rashifalReadingAccess,
  shouldRetryRashifalReading,
} from './rashifalLock.ts';

const status = (signs, gateActive = true) => ({ date: '2026-11-20', gateActive, signs });

test('12 sign keys, same as the backend', () => {
  assert.equal(ZODIAC_SIGN_KEYS.length, 12);
  assert.equal(ZODIAC_SIGN_KEYS[0], 'aries');
  assert.equal(ZODIAC_SIGN_KEYS[11], 'pisces');
});

test('parseRashifalStatus reads the server answer and rejects junk', () => {
  assert.deepEqual(
    parseRashifalStatus({ date: '2026-11-20', gateActive: true, signs: [{ sign: 'leo', unlocked: true, available: 1 }, 'x', null] }),
    { date: '2026-11-20', gateActive: true, signs: [{ sign: 'leo', unlocked: true, available: false }] }
  );
  assert.deepEqual(parseRashifalStatus({ date: '2026-11-20', gateActive: false }), { date: '2026-11-20', gateActive: false, signs: [] });
  for (const junk of [null, undefined, 'x', {}, { date: 1, gateActive: true }, { date: 'd', gateActive: 'true' }]) {
    assert.equal(parseRashifalStatus(junk), null);
  }
});

test('decideRashifalOpen: no status or gate off opens as before', () => {
  assert.equal(decideRashifalOpen(null, 'aries'), 'open');
  assert.equal(decideRashifalOpen(undefined, 'aries'), 'open');
  assert.equal(decideRashifalOpen(status([{ sign: 'aries', unlocked: false, available: true }], false), 'aries'), 'open');
});

test('decideRashifalOpen: locked sign prompts, unlocked opens without a prompt', () => {
  const s = status([
    { sign: 'aries', unlocked: false, available: true },
    { sign: 'leo', unlocked: true, available: true },
  ]);
  assert.equal(decideRashifalOpen(s, 'aries'), 'prompt');
  assert.equal(decideRashifalOpen(s, 'leo'), 'open_unlocked');
});

test('decideRashifalOpen: a missing reading never prompts', () => {
  const s = status([{ sign: 'pisces', unlocked: false, available: false }]);
  assert.equal(decideRashifalOpen(s, 'pisces'), 'open');
  assert.equal(decideRashifalOpen(s, 'virgo'), 'open'); // not listed at all
});

test('isRashifalSignLocked draws a lock only on a promptable sign', () => {
  const s = status([
    { sign: 'aries', unlocked: false, available: true },
    { sign: 'leo', unlocked: true, available: true },
    { sign: 'pisces', unlocked: false, available: false },
  ]);
  assert.equal(isRashifalSignLocked(s, 'aries'), true);
  assert.equal(isRashifalSignLocked(s, 'leo'), false);
  assert.equal(isRashifalSignLocked(s, 'pisces'), false);
  assert.equal(isRashifalSignLocked(null, 'aries'), false);
});

test('isRashifalLockedError: only a 403 with unlock ad', () => {
  assert.equal(isRashifalLockedError({ statusCode: 403, unlock: 'ad', code: 'PREMIUM_REQUIRED' }), true);
  assert.equal(isRashifalLockedError({ statusCode: 403, code: 'PREMIUM_REQUIRED' }), false);
  assert.equal(isRashifalLockedError({ statusCode: 404 }), false);
  assert.equal(isRashifalLockedError(null), false);
  assert.equal(isRashifalLockedError(new Error('x')), false);
});

test('shouldRetryRashifalReading: never 401/403/404, otherwise twice', () => {
  for (const statusCode of [401, 403, 404]) assert.equal(shouldRetryRashifalReading(0, { statusCode }), false);
  assert.equal(shouldRetryRashifalReading(0, { statusCode: 500 }), true);
  assert.equal(shouldRetryRashifalReading(1, { statusCode: 0 }), true);
  assert.equal(shouldRetryRashifalReading(2, { statusCode: 500 }), false);
});

test('classifyRashifalUnlockResponse', () => {
  assert.equal(classifyRashifalUnlockResponse(403, 'RASHIFAL_GATE_DISABLED'), 'disabled');
  assert.equal(classifyRashifalUnlockResponse(404, 'NO_READING'), 'no_reading');
  assert.equal(classifyRashifalUnlockResponse(401, 'SESSION_EXPIRED'), 'unauthorized');
  assert.equal(classifyRashifalUnlockResponse(429, 'UNKNOWN_ERROR'), 'failed');
  assert.equal(classifyRashifalUnlockResponse(0, 'NETWORK_ERROR'), 'failed');
  assert.equal(classifyRashifalUnlockResponse(undefined, undefined), 'failed');
});

test('rashifalReadingAccess', () => {
  assert.equal(rashifalReadingAccess('unlocked', 'reward'), 'ad');
  assert.equal(rashifalReadingAccess('unlocked', 'no_fill'), 'no_fill');
  assert.equal(rashifalReadingAccess('unlocked', null), 'already_unlocked');
  assert.equal(rashifalReadingAccess('unlocked', undefined), 'already_unlocked');
  assert.equal(rashifalReadingAccess('premium', null), 'premium');
  assert.equal(rashifalReadingAccess('premium', 'reward'), 'premium');
  for (const reason of ['gate_off', 'client_not_gated', 'no_user', undefined, null, 'odd']) {
    assert.equal(rashifalReadingAccess(reason, null), 'gate_off');
    // An unlock this visit doesn't matter if the server says the gate is off.
    assert.equal(rashifalReadingAccess(reason, 'reward'), 'gate_off');
  }
});

test('parseUnlockedVia', () => {
  assert.equal(parseUnlockedVia('reward'), 'reward');
  assert.equal(parseUnlockedVia('no_fill'), 'no_fill');
  for (const bad of [undefined, '', 'ad', 'REWARD', ['reward']]) assert.equal(parseUnlockedVia(bad), null);
});
