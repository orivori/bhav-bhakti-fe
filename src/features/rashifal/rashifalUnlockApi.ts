import { apiClient } from '@/shared/services/apiClient';
import type { ApiError } from '@/features/authentication/types';
import {
  classifyRashifalUnlockResponse,
  parseRashifalStatus,
  type RashifalStatus,
  type RashifalUnlockResponse,
} from './rashifalLock';

// Backend: routes/rashifalUnlock.routes.js (services/rashifalLock.service.js).
const RASHIFAL_UNLOCKS_PATH = '/v1/rashifal-unlocks';
const RASHIFAL_STATUS_PATH = '/v1/rashifal-unlocks/today';
const RASHIFAL_UNLOCK_TIMEOUT_MS = 6000;
export const RASHIFAL_STATUS_TIMEOUT_MS = 4000;

export type RashifalUnlockSource = 'reward' | 'no_fill';

// The grid/opener's view of today. Throws on failure - callers treat a
// failure as "no gate" (open as before; the reading screen still handles a
// locked answer).
export async function fetchRashifalStatus(): Promise<RashifalStatus | null> {
  const body = await apiClient.get<{ data?: unknown }>(RASHIFAL_STATUS_PATH, {
    timeout: RASHIFAL_STATUS_TIMEOUT_MS,
  });
  return parseRashifalStatus(body?.data);
}

export async function recordRashifalUnlock(params: {
  zodiacSign: string;
  source: RashifalUnlockSource;
}): Promise<RashifalUnlockResponse> {
  try {
    await apiClient.post(
      RASHIFAL_UNLOCKS_PATH,
      { zodiacSign: params.zodiacSign, source: params.source },
      { timeout: RASHIFAL_UNLOCK_TIMEOUT_MS }
    );
    return 'granted';
  } catch (error) {
    const apiError = error as ApiError | undefined;
    const outcome = classifyRashifalUnlockResponse(apiError?.statusCode, apiError?.code);
    if (outcome === 'failed') {
      console.warn(`recordRashifalUnlock: ${params.source} for ${params.zodiacSign} failed`, apiError?.statusCode);
    }
    return outcome;
  }
}
