import { create } from 'zustand';

// One centred notice for story ad-lock messages (StoryNotice, mounted once at
// the app root next to AdUnlockSheet): "Unlock the previous episode first",
// the no-ad unlock, the daily limit, "Couldn't unlock". A message and one
// OK button; OK, a tap outside the card or hardware back dismisses it.
//
// Never two at once: while a notice is open, another show() doesn't stack a
// second one - it waits for the open one and resolves with it (so a double
// tap can't open it twice). show() resolves when the notice is dismissed, so
// a caller can act AFTER it (e.g. play the episode the no-ad notice is about).
//
// With no host mounted (e.g. maintenance mode) show() resolves at once.

interface StoryNoticeState {
  // Translation key of the open notice's message; null = closed.
  messageKey: string | null;
  hostCount: number;
  registerHost: () => () => void;
  show: (messageKey: string) => Promise<void>;
  dismiss: () => void;
}

let pending: Promise<void> | null = null;
let resolvePending: (() => void) | null = null;

export const useStoryNoticeStore = create<StoryNoticeState>((set, get) => ({
  messageKey: null,
  hostCount: 0,

  registerHost: () => {
    set((state) => ({ hostCount: state.hostCount + 1 }));
    return () => set((state) => ({ hostCount: Math.max(0, state.hostCount - 1) }));
  },

  show: (messageKey) => {
    if (pending) return pending;
    if (get().hostCount === 0) return Promise.resolve();
    pending = new Promise<void>((resolve) => {
      resolvePending = resolve;
    });
    set({ messageKey });
    return pending;
  },

  dismiss: () => {
    const resolve = resolvePending;
    pending = null;
    resolvePending = null;
    set({ messageKey: null });
    resolve?.();
  },
}));

// Shows a story notice and waits until it's dismissed.
export function showStoryNotice(messageKey: string): Promise<void> {
  return useStoryNoticeStore.getState().show(messageKey);
}
