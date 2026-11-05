// Unit tests for guestStartRules.ts, on Node's built-in test runner.
//   node --test src/features/authentication/utils/guestStartRules.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyGuestStartError,
  isNewGuest,
  isValidInstallId,
  wasAlreadyRenewed,
} from './guestStartRules.ts';

test('install id must be a v4 UUID', () => {
  assert.equal(isValidInstallId('3f2b8c1e-7a4d-4e6f-9b1a-2c3d4e5f6a7b'), true);
  assert.equal(isValidInstallId('3F2B8C1E-7A4D-4E6F-9B1A-2C3D4E5F6A7B'), true);
  assert.equal(isValidInstallId('3f2b8c1e-7a4d-1e6f-9b1a-2c3d4e5f6a7b'), false);
  assert.equal(isValidInstallId('abc'), false);
  assert.equal(isValidInstallId(''), false);
  assert.equal(isValidInstallId(null), false);
  assert.equal(isValidInstallId(undefined), false);
});

test('no response at all reads as offline', () => {
  assert.equal(classifyGuestStartError({ code: 'NETWORK_ERROR', statusCode: 0 }), 'offline');
  assert.equal(classifyGuestStartError({ statusCode: 0 }), 'offline');
});

test('a real answer from the server reads as failed, never offline', () => {
  assert.equal(classifyGuestStartError({ code: 'GUEST_DISABLED', statusCode: 403 }), 'failed');
  assert.equal(classifyGuestStartError({ code: 'GUEST_RATE_LIMITED', statusCode: 429 }), 'failed');
  assert.equal(classifyGuestStartError({ code: 'GUEST_DAILY_CAP', statusCode: 429 }), 'failed');
  assert.equal(classifyGuestStartError({ code: 'GUEST_NOT_A_GUEST', statusCode: 409 }), 'failed');
  assert.equal(classifyGuestStartError({ statusCode: 500 }), 'failed');
});

test('an error from the phone itself reads as failed', () => {
  assert.equal(classifyGuestStartError(new Error('Failed to save authentication tokens')), 'failed');
  assert.equal(classifyGuestStartError(undefined), 'failed');
});

test('new guest', () => {
  assert.equal(isNewGuest(true, false), true, 'plain first start');
  assert.equal(isNewGuest(false, false), true, 'reply lost or app killed during the first start');
  assert.equal(isNewGuest(false, true), false, 'renewal');
  assert.equal(isNewGuest(true, true), true, 'server row gone, a new account was made');
});

test('already renewed only when both tokens exist and differ', () => {
  assert.equal(wasAlreadyRenewed('old', 'new'), true);
  assert.equal(wasAlreadyRenewed('same', 'same'), false);
  assert.equal(wasAlreadyRenewed(null, 'new'), false);
  assert.equal(wasAlreadyRenewed('old', null), false);
  assert.equal(wasAlreadyRenewed(undefined, undefined), false);
});
