import { create } from 'zustand';

// The general centred notice (AppNotice), used in place of the plain white
// Android Alert for "Saved to gallery" and the ringtone instructions. Same
// shape as storyNoticeStore: one host (the AppNotice component, mounted once
// at the app root next to AdUnlockSheet and StoryNotice) registers itself;
// show() opens the notice and resolves with how it was closed.
//
// Text is passed as translation keys + params, not ready-made strings, so the
// component translates at render time. Only zustand is imported here, so
// node --test can load this file (appNoticeStore.test.mjs).

export interface NoticeText {
  key: string;
  params?: Record<string, string | number>;
}

export interface AppNoticeContent {
  title?: NoticeText;
  body?: NoticeText;
  // An optional numbered list: a heading line, then one row per step.
  stepsTitle?: NoticeText;
  steps?: NoticeText[];
  // A small grey line under the steps.
  hint?: NoticeText;
  // Optional main action (orange button). Without it the close button is the
  // orange one.
  primaryButton?: NoticeText;
  // Always present: "OK".
  closeButton: NoticeText;
}

// 'primary' / 'close' = that button; 'dismissed' = back or a tap outside.
export type AppNoticeAnswer = 'primary' | 'close' | 'dismissed';
// 'no_host' = no notice is mounted (e.g. the app is blocked by maintenance or
// a required update); 'busy' = another notice is already open. The caller
// (showAppNotice in src/utils/appNotice.ts) falls back to a plain Alert for
// both, so a message is never lost.
export type AppNoticeResult = AppNoticeAnswer | 'no_host' | 'busy';

interface AppNoticeState {
  content: AppNoticeContent | null;
  hostCount: number;
  registerHost: () => () => void;
  show: (content: AppNoticeContent) => Promise<AppNoticeResult>;
  answer: (answer: AppNoticeAnswer) => void;
}

let resolveOpen: ((result: AppNoticeResult) => void) | null = null;

export const useAppNoticeStore = create<AppNoticeState>((set, get) => ({
  content: null,
  hostCount: 0,

  registerHost: () => {
    set((state) => ({ hostCount: state.hostCount + 1 }));
    return () => set((state) => ({ hostCount: Math.max(0, state.hostCount - 1) }));
  },

  show: (content) => {
    if (get().hostCount === 0) return Promise.resolve('no_host');
    if (get().content !== null) return Promise.resolve('busy');
    const opened = new Promise<AppNoticeResult>((resolve) => {
      resolveOpen = resolve;
    });
    set({ content });
    return opened;
  },

  answer: (answer) => {
    if (get().content === null) return;
    const resolve = resolveOpen;
    resolveOpen = null;
    set({ content: null });
    resolve?.(answer);
  },
}));

export const selectIsAppNoticeOpen = (state: Pick<AppNoticeState, 'content'>): boolean => state.content !== null;
