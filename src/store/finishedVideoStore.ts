import { create } from 'zustand';

// Which video wallpapers have already played to the end in this app session
// (Home cards, Wallpaper hub tiles, Search results, the Viewing Window).
//
// Why: videos used to loop forever, and expo-av keeps no copy on the phone,
// so every loop - and every time a tile's player was removed and added back
// (scrolling, switching tabs, the Viewing Window, an ad) - downloaded the
// whole file again. The Storage read logs showed ~93% of video reads were
// such repeats. Now a video plays once; once it has finished, a tile that
// gets its player back shows its still image + a replay button instead of
// loading the video again by itself (see usePlayOnceVideo).
//
// In memory only (not persisted): an app restart plays every video once more.
// Keyed by feed id as a string.

interface FinishedVideoState {
  finishedIds: Readonly<Record<string, true>>;
  markFinished: (feedId: string) => void;
  clearFinished: (feedId: string) => void;
  reset: () => void;
}

export const useFinishedVideoStore = create<FinishedVideoState>((set) => ({
  finishedIds: {},
  markFinished: (feedId) =>
    set((state) =>
      state.finishedIds[feedId] ? state : { finishedIds: { ...state.finishedIds, [feedId]: true } }
    ),
  clearFinished: (feedId) =>
    set((state) => {
      if (!state.finishedIds[feedId]) return state;
      const next = { ...state.finishedIds };
      delete next[feedId];
      return { finishedIds: next };
    }),
  reset: () => set({ finishedIds: {} }),
}));

export const isVideoFinished = (state: Pick<FinishedVideoState, 'finishedIds'>, feedId: string): boolean =>
  state.finishedIds[feedId] === true;
