import { create } from 'zustand';
import { PremiumSubscription } from '../types/user';

// TEMPORARY/PLACEHOLDER - there is no real entitlement/paywall system
// anywhere in this app yet. This is now the ONE seam for the app's
// premium-status stub (originally consolidated from three separate,
// independently-declared local copies that had drifted to disagree -
// AutoplayFeedCard.tsx, horoscope.tsx, and useViewingWindow.ts. horoscope.tsx
// no longer reads this at all - Rashifal was made free for everyone,
// unconditionally, as a deliberate product decision, removing its gate
// entirely rather than just flipping it open. AutoplayFeedCard.tsx and
// useViewingWindow.ts remain real consumers). Flip this single value to test
// as premium; every remaining gate in the app updates together, so there's
// nowhere left for copies to drift apart.
const DEV_OVERRIDE_IS_PREMIUM = false;

interface PremiumState {
  isPremium: boolean;
  subscription: PremiumSubscription | null;
  setSubscription: (subscription: PremiumSubscription | null) => void;
  checkPremiumStatus: () => boolean;
  showPaywall: boolean;
  setShowPaywall: (show: boolean) => void;
}

export const usePremiumStore = create<PremiumState>((set, get) => ({
  isPremium: DEV_OVERRIDE_IS_PREMIUM,
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
