import { create } from 'zustand';
import { PremiumSubscription } from '../types/user';

interface PremiumState {
  isPremium: boolean;
  subscription: PremiumSubscription | null;
  setSubscription: (subscription: PremiumSubscription | null) => void;
  checkPremiumStatus: () => boolean;
  showPaywall: boolean;
  setShowPaywall: (show: boolean) => void;
}

export const usePremiumStore = create<PremiumState>((set, get) => ({
  isPremium: false,
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
