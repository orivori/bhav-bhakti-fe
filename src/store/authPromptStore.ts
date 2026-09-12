import { create } from 'zustand';

// Drives LoginPromptModal, the same way premiumStore.ts's showPaywall/setShowPaywall
// drives PremiumPaywall - a single global flag, one modal mounted once at the app
// root (app/_layout.tsx), triggered from anywhere with one call. apiClient.ts flips
// this on a genuine 401 from one of the app's real login-gated actions (like/unlike,
// download, the Liked filter, profile load/save) - deliberately NOT for public/
// browsing requests or for share (see apiClient.ts and feedService.ts for the exact
// scoping and why).

interface AuthPromptState {
  showLoginPrompt: boolean;
  setShowLoginPrompt: (show: boolean) => void;
}

export const useAuthPromptStore = create<AuthPromptState>((set) => ({
  showLoginPrompt: false,
  setShowLoginPrompt: (show) => set({ showLoginPrompt: show }),
}));
