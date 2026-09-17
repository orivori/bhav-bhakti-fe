import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// One-shot flag, same "persisted, AsyncStorage-backed Zustand store" pattern
// as chantHintStore.ts. The push-notification permission prompt is requested
// at most once, ever, per install - the moment the user first becomes
// authenticated (see app/_layout.tsx's effect, gated on this flag). Deliberately
// not tied to the login() action alone: an existing, already-logged-in user's
// next cold start also sets isAuthenticated via authStore's initializeAuth(),
// and needs to hit this same one-shot gate without ever calling login() again -
// see CLAUDE.md's push-notification plan for the full reasoning. No re-ask
// mechanism for MVP (a deliberate decision) - a decline is recorded exactly
// the same way as a grant, so this never fires a second time for that user.
interface NotificationPermissionState {
  hasRequestedPermission: boolean;
  markRequested: () => void;
}

export const useNotificationPermissionStore = create<NotificationPermissionState>()(
  persist(
    (set) => ({
      hasRequestedPermission: false,
      markRequested: () => set({ hasRequestedPermission: true }),
    }),
    {
      name: 'notification-permission-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
