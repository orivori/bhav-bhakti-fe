import { create } from 'zustand';

// State of the rewarded-ad unlock flow (src/features/ads/adUnlockFlow.ts),
// read by the opt-in card (AdUnlockSheet) and by everything that must hold
// still while an ad is on its way or on screen.
//
// phase:
// - 'idle'    - nothing going on
// - 'offer'   - the opt-in card is up ("Watch ad" / "Not now")
// - 'loading' - "Watch ad" tapped, waiting for the ad (blocking overlay)
// - 'showing' - Google's full-screen ad is up; also covers the moment after
//               it closes while the unlock is recorded
//
// Not persisted: it describes something happening right now.
export type AdFlowPhase = 'idle' | 'offer' | 'loading' | 'showing';
export type AdOptInAnswer = 'watch' | 'decline';

interface AdFlowState {
  phase: AdFlowPhase;
  // How many AdUnlockSheet hosts are mounted. With none (e.g. during
  // maintenance mode, §117) an offer answers 'decline' at once instead of
  // waiting forever.
  hostCount: number;
  // .dev-only test switch (Profile > Debug): the next ad load fails, to test
  // the no_fill path. One-shot - cleared as soon as it's used.
  simulateNoAd: boolean;

  registerHost: () => () => void;
  // Shows the opt-in card and waits for the user's answer.
  requestOptIn: () => Promise<AdOptInAnswer>;
  answerOptIn: (answer: AdOptInAnswer) => void;
  setPhase: (phase: AdFlowPhase) => void;
  // Hardware back on the loading overlay.
  cancelLoading: () => void;
  // Subscribed to by the flow while it waits for the ad to load.
  onLoadingCancelled: (listener: () => void) => () => void;
  setSimulateNoAd: (on: boolean) => void;
  consumeSimulateNoAd: () => boolean;
}

let pendingAnswer: ((answer: AdOptInAnswer) => void) | null = null;
const cancelListeners = new Set<() => void>();

export const useAdFlowStore = create<AdFlowState>((set, get) => ({
  phase: 'idle',
  hostCount: 0,
  simulateNoAd: false,

  registerHost: () => {
    set((state) => ({ hostCount: state.hostCount + 1 }));
    return () => set((state) => ({ hostCount: Math.max(0, state.hostCount - 1) }));
  },

  requestOptIn: () => {
    if (get().hostCount === 0 || get().phase !== 'idle') {
      return Promise.resolve('decline');
    }
    set({ phase: 'offer' });
    return new Promise<AdOptInAnswer>((resolve) => {
      pendingAnswer = resolve;
    });
  },

  answerOptIn: (answer) => {
    const resolve = pendingAnswer;
    pendingAnswer = null;
    if (!resolve) return;
    // "Watch" moves straight to the blocking loading overlay, so there is no
    // gap in which taps reach the screen underneath.
    set({ phase: answer === 'watch' ? 'loading' : 'idle' });
    resolve(answer);
  },

  setPhase: (phase) => set({ phase }),

  cancelLoading: () => {
    if (get().phase !== 'loading') return;
    cancelListeners.forEach((listener) => listener());
  },

  onLoadingCancelled: (listener) => {
    cancelListeners.add(listener);
    return () => {
      cancelListeners.delete(listener);
    };
  },

  setSimulateNoAd: (on) => set({ simulateNoAd: on }),

  consumeSimulateNoAd: () => {
    if (!get().simulateNoAd) return false;
    set({ simulateNoAd: false });
    return true;
  },
}));

// Media (audio, Home previews, hub and enlarged-view videos) pauses while an
// ad is loading or showing - not for the opt-in card alone, which the user
// may decline.
export const selectIsAdFlowActive = (state: AdFlowState): boolean =>
  state.phase === 'loading' || state.phase === 'showing';

// Anything from the card onwards counts as an open modal for the update
// prompt.
export const selectIsAdFlowOpen = (state: AdFlowState): boolean => state.phase !== 'idle';
