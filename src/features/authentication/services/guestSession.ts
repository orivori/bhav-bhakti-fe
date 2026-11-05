import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore, whenAuthInitialized } from '@/shared/stores/authStore';
import { useGuestStartStore } from '@/store/guestStartStore';
import { useActivationEventsStore } from '@/store/activationEventsStore';
import { logAnalyticsEvent } from '@/utils/analytics/logEvent';
import { authService } from './authService';
import { getJwtExpiryMs } from '../utils/jwt';
import { getOrCreateInstallId } from '../utils/installId';
import { IS_TEST_ACCOUNT } from '../utils/testAccount';
import { classifyGuestStartError, GuestStartFailure, isNewGuest } from '../utils/guestStartRules';

// Set once this install has finished a guest start. See isNewGuest.
const FINISHED_START_KEY = 'guest_start_finished';

export type GuestStartResult = { ok: true } | { ok: false; reason: GuestStartFailure };

let inFlight: Promise<GuestStartResult> | null = null;

async function runGuestStart(): Promise<GuestStartResult> {
  try {
    useGuestStartStore.getState().setStatus('starting');
    // A stored login that hasn't been read yet must win over a new guest.
    await whenAuthInitialized();

    const installId = await getOrCreateInstallId();
    const response = await authService.startGuest({ installId, isTestAccount: IS_TEST_ACCOUNT });
    const { token, user, isNewUser } = response.data;

    const hasFinishedBefore = (await AsyncStorage.getItem(FINISHED_START_KEY)) !== null;
    const isNew = isNewGuest(!!isNewUser, hasFinishedBefore);

    // Before login(): logging in sends app/index.tsx to Home straight away, and
    // Home's first-view event needs this already set.
    if (isNew) {
      useActivationEventsStore.getState().markNewUserSignup();
    }

    await useAuthStore.getState().login(user, {
      accessToken: token,
      refreshToken: '',
      expiresAt: getJwtExpiryMs(token) ?? 0,
    });

    if (!hasFinishedBefore) {
      await AsyncStorage.setItem(FINISHED_START_KEY, '1');
    }
    if (isNew) {
      logAnalyticsEvent('guest_started');
    }

    useGuestStartStore.getState().setStatus('idle');
    return { ok: true };
  } catch (error) {
    console.error('Guest start failed:', (error as { code?: string })?.code ?? 'unknown');
    const reason = classifyGuestStartError(error);
    useGuestStartStore.getState().setStatus(reason);
    return { ok: false, reason };
  }
}

/**
 * Gets this install a session from POST /auth/guest: its own row back with a
 * fresh token, or a new row. Overlapping callers share one request, so a burst
 * of 401s makes one call.
 */
export function startGuestSession(): Promise<GuestStartResult> {
  if (!inFlight) {
    inFlight = runGuestStart().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
