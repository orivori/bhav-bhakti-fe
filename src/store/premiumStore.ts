import { create } from 'zustand';
import { PremiumSubscription } from '../types/user';
import { useFeatureFlagStore } from './featureFlagStore';

// TEMPORARY/PLACEHOLDER - there is no real entitlement/paywall system
// anywhere in this app yet. This is now the ONE seam for the app's
// premium-status stub (originally consolidated from three separate,
// independently-declared local copies that had drifted to disagree -
// AutoplayFeedCard.tsx, horoscope.tsx, and useViewingWindow.ts. horoscope.tsx
// no longer reads this at all - Rashifal was made free for everyone,
// unconditionally, as a deliberate product decision, removing its gate
// entirely rather than just flipping it open. AutoplayFeedCard.tsx and
// useViewingWindow.ts remain real consumers).
//
// Formerly a hardcoded local constant (DEV_OVERRIDE_IS_PREMIUM); now seeded
// from featureFlagStore's enablePremiumSubscriptionUI flag instead, so this
// stub can be flipped via the backend (no app update) once the Premium
// Subscription frontend work begins, rather than needing a code change.
// Read synchronously via getState() at module-init time - this only ever
// sees the flag's hardcoded default (see featureFlagStore.ts), never a
// later remote-fetched value, since a Zustand store's initializer runs
// once. That's fine for today's single real caller of this seam; if this
// ever needs to react live to a remote flag change, it'd need to subscribe
// to the flag store instead of reading it once here.

interface PremiumState {
  isPremium: boolean;
  subscription: PremiumSubscription | null;
  setSubscription: (subscription: PremiumSubscription | null) => void;
  checkPremiumStatus: () => boolean;
  showPaywall: boolean;
  setShowPaywall: (show: boolean) => void;
}

export const usePremiumStore = create<PremiumState>((set, get) => ({
  isPremium: useFeatureFlagStore.getState().flags.enablePremiumSubscriptionUI,
  subscription: null,
  showPaywall: false,

  setSubscription: (subscription) => {
    const isPremium = subscription?.isActive &&
      (!subscription.endDate || new Date(subscription.endDate) > new Date());

    set({ subscription, isPremium });
  },

  checkPremiumStatus: () => {
    const { subscription } = get();
    if (!subscription) return false;

    const isPremium = subscription.isActive &&
      (!subscription.endDate || new Date(subscription.endDate) > new Date());

    set({ isPremium });
    return isPremium;
  },

  setShowPaywall: (show) => set({ showPaywall: show }),
}));
