import { useAuthStore } from '@/shared/stores/authStore';
import { useAuthPromptStore } from '@/store/authPromptStore';

/**
 * The one place a dead session is handled - called by apiClient for ANY 401
 * (expired token, a token the server no longer accepts, a deleted user) and
 * by the app-resume check in app/_layout.tsx when the token's own expiry
 * date has passed.
 *
 * Clears the local session and shows LoginPromptModal, whose Login button
 * takes the user to phone login and back to the screen they were on.
 *
 * Only acts while the app believes it's logged in, so it fires once per dead
 * session: the first call flips isAuthenticated to false, and every other
 * request failing around the same time (or still in flight) does nothing
 * more - the modal is never stacked. It also never fires during the login
 * flow itself, where there's no session to expire.
 */
export function handleSessionExpired(): void {
  if (!useAuthStore.getState().isAuthenticated) return;

  const prompt = useAuthPromptStore.getState();
  if (!prompt.showLoginPrompt) prompt.setShowLoginPrompt(true);

  // Local-only clear (no server call, so it can't 401 again).
  useAuthStore.getState().logout().catch((error) => {
    console.error('handleSessionExpired: failed to clear session', error);
  });
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
    handleSessionExpired();
  }
}
