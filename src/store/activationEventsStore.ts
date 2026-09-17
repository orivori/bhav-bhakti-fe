import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Gates the three "new user's first X" Activation events (home_first_viewed,
// first_navigation_choice, first_content_completed - see analytics/
// activationEvents.ts, this store's only consumer) so they fire only for a
// genuinely new signup, exactly once each, ever - never for a returning
// user's login, and never a second time even across app restarts.
//
// One shared "is this user in their post-signup activation window" flag,
// plus three independent "already logged" flags - each milestone can fire
// whenever it naturally happens (not necessarily in order, not necessarily
// in the same session) without stepping on the others. login_started/
// otp_sent/login_completed/login_failed/zodiac_sign_set are deliberately NOT
// tracked here - those fire on every relevant action for every user, by
// design (they're funnel-step events, not one-time milestones), and don't
// need any first-time gating at all.
interface ActivationEventsState {
  isNewUserPendingActivation: boolean;
  hasLoggedHomeFirstViewed: boolean;
  hasLoggedFirstNavigationChoice: boolean;
  hasLoggedFirstContentCompleted: boolean;
  markNewUserSignup: () => void;
  markHomeFirstViewedLogged: () => void;
  markFirstNavigationChoiceLogged: () => void;
  markFirstContentCompletedLogged: () => void;
}

export const useActivationEventsStore = create<ActivationEventsState>()(
  persist(
    (set) => ({
      isNewUserPendingActivation: false,
      hasLoggedHomeFirstViewed: false,
      hasLoggedFirstNavigationChoice: false,
      hasLoggedFirstContentCompleted: false,
      markNewUserSignup: () => set({ isNewUserPendingActivation: true }),
      markHomeFirstViewedLogged: () => set({ hasLoggedHomeFirstViewed: true }),
      markFirstNavigationChoiceLogged: () => set({ hasLoggedFirstNavigationChoice: true }),
      markFirstContentCompletedLogged: () => set({ hasLoggedFirstContentCompleted: true }),
    }),
    {
      name: 'activation-events-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
