import { create } from 'zustand';
import { PremiumSubscription } from '../types/user';

// TEMPORARY/PLACEHOLDER - there is no real entitlement/paywall system
// anywhere in this app yet. This is now the ONE seam for the whole app's
// premium-status stub (consolidated from three separate, independently-
// declared local copies that had drifted to disagree - see
// AutoplayFeedCard.tsx, horoscope.tsx, and useViewingWindow.ts, all of which
// now read `isPremium` from this store instead of declaring their own
// constant). Flip this single value to test as premium; every gate in the
// app updates together, so there's nowhere left for copies to drift apart.
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
