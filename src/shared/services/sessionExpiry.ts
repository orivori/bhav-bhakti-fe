import { router } from 'expo-router';
import { useAuthStore, whenAuthInitialized } from '@/shared/stores/authStore';
import { startGuestSession } from '@/features/authentication/services/guestSession';
import { wasAlreadyRenewed } from '@/features/authentication/utils/guestStartRules';

/**
 * The one place a dead session is handled - called by apiClient for ANY 401
 * (expired token, a token the server no longer accepts, a deleted user) and by
 * the app-resume check below, for guests and older phone accounts alike. There
 * is no login prompt: the app silently gets a guest session and carries on.
 * This install's guest gets the same row back; an older phone account whose
 * login has died becomes a new guest, and its row stays untouched.
 *
 * @returns true when the failed request is worth repeating with the new token.
 */
export async function handleSessionExpired(failedToken?: string | null): Promise<boolean> {
  await whenAuthInitialized();

  if (wasAlreadyRenewed(failedToken, useAuthStore.getState().tokens?.accessToken)) {
    return true;
  }

  const result = await startGuestSession();
  if (result.ok) {
    return true;
  }

  // No signal: keep what's on screen. The next request or resume tries again.
  if (result.reason === 'offline') {
    return false;
  }

  // The server refused and this token is dead, so nothing can load: go to the
  // Retry screen. app/index.tsx returns to Home once a start succeeds.
  await useAuthStore.getState().clearSession();
  try {
    router.replace('/');
  } catch (error) {
    // No navigator is mounted during maintenance or the update block. It
    // remounts through app/index.tsx when those end.
    console.error('handleSessionExpired: could not open the start screen', error);
  }
  return false;
}

/**
 * Called when the app comes back to the foreground. The cold-start check in
 * authStore.initializeAuth only runs when the app is launched fresh, so a
 * session that expired while the app sat in the background would otherwise
 * go unnoticed until the next request failed.
 */
export function checkSessionOnResume(): void {
  const { isAuthenticated, tokens } = useAuthStore.getState();
  if (isAuthenticated && tokens && tokens.expiresAt <= Date.now()) {
    handleSessionExpired(tokens.accessToken).catch((error) => {
      console.error('checkSessionOnResume: failed to renew session', error);
    });
  }
}
