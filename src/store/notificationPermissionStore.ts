import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// One-shot flag, same "persisted, AsyncStorage-backed Zustand store" pattern
// as chantHintStore.ts. The push-notification permission prompt is requested
// at most once, ever, per install - after the user's first real use of the app
// (see requestNotificationPermissionOnce in utils/notifications/permission.ts).
// No re-ask mechanism for MVP (a deliberate decision) - a decline is recorded exactly
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
