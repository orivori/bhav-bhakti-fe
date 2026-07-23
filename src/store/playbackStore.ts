import { create } from 'zustand';
import type { Feed } from '@/types/feed';

// 'ephemeral' = Ringtones' quick-preview model (no mini-player, stops on
// tab-blur, no memory - re-pressing play after a pause restarts from 0).
// 'persistent' = the full-screen audio-player.tsx model (survives
// navigation, eligible for the mini-player, pausable/resumable). See
// CLAUDE.md's playback coordinator notes for why these two need different
// treatment.
export type PlaybackMode = 'ephemeral' | 'persistent';

export interface NowPlayingIdentity {
  feedId: string;
  type: Feed['type'];
  mode: PlaybackMode;
  title: string;
  thumbnailUrl?: string;
}

export interface NowPlayingCounter {
  chantCount: number;
  targetCount: number;
  isAutoLooping: boolean;
}

export interface NowPlayingStatus {
  isPlaying: boolean;
  positionSeconds: number;
  durationSeconds: number;
  // Only present for repeatable persistent-mode content (mantra today).
  counter?: NowPlayingCounter;
}

export type NowPlaying = NowPlayingIdentity & NowPlayingStatus;

export interface ActiveControls {
  stop: () => void;
  pause: () => void;
  resume: () => void;
  seekTo: (seconds: number) => void;
}

interface PlaybackSlot {
  nowPlaying: NowPlaying;
  controls: ActiveControls;
}

interface PlaybackCoordinatorState {
  // Two independent slots, not one "nowPlaying" - a ringtone (ephemeral) and
  // a mantra/aarti/bhajan (persistent) can now genuinely coexist: the
  // ringtone plays, the persistent one sits paused-but-remembered so the
  // mini-player can still show and resume it. See registerPlaybackStart for
  // the hand-off rules between them.
  ephemeral: PlaybackSlot | null;
  persistent: PlaybackSlot | null;

  // The single entry point for starting playback anywhere in the app.
  registerPlaybackStart: (
    identity: NowPlayingIdentity,
    status: NowPlayingStatus,
    controls: ActiveControls
  ) => void;

  // Pushes a live status update (position/playing/counter) for whichever
  // slot currently holds this feedId. No-ops if it isn't registered in
  // either slot - this is what makes it safe for a screen to keep pushing
  // updates after being pre-empted by something else.
  updateNowPlayingStatus: (feedId: string, patch: Partial<NowPlayingStatus>) => void;

  // Clears whichever slot currently holds this feedId, guarded by feedId
  // match so a stale cleanup from an already-superseded player can't wipe
  // out whatever took over afterward.
  clearNowPlaying: (feedId: string) => void;
}

// Deliberately NOT wrapped in zustand/middleware's `persist`, unlike every
// other store in this folder (see feedStore.ts). `controls` holds live
// closures bound to a specific mounted player instance - persisting and
// rehydrating those across an app restart would leave stop/pause/seekTo
// pointing at a player that no longer exists, which is worse than useless.
// Do not add persist() here.
export const usePlaybackStore = create<PlaybackCoordinatorState>()((set, get) => ({
  ephemeral: null,
  persistent: null,

  registerPlaybackStart: (identity, status, controls) => {
    const { ephemeral, persistent } = get();
    const newSlot: PlaybackSlot = { nowPlaying: { ...identity, ...status }, controls };

    if (identity.mode === 'ephemeral') {
      // Same-mode hand-off: a different ringtone was already playing -
      // fully stop it. Unchanged from before this session's fixes.
      if (ephemeral && ephemeral.nowPlaying.feedId !== identity.feedId) {
        try {
          ephemeral.controls.stop();
        } catch (error) {
          console.error('Error stopping previous ringtone during hand-off:', error);
        }
      }

      // Cross-mode: this ringtone is preempting persistent content - PAUSE
      // it, don't clear it, so it stays registered and visible/resumable in
      // the mini-player instead of being reset to 0 and forgotten.
      let nextPersistent = persistent;
      if (persistent && persistent.nowPlaying.feedId !== identity.feedId) {
        try {
          persistent.controls.pause();
        } catch (error) {
          console.error('Error pausing persistent playback during hand-off:', error);
        }
        nextPersistent = {
          ...persistent,
          nowPlaying: { ...persistent.nowPlaying, isPlaying: false },
        };
      }

      set({ ephemeral: newSlot, persistent: nextPersistent });
    } else {
      // Same-mode hand-off: a different persistent feedId was already
      // registered - fully stop/replace it. Unchanged from before this
      // session's fixes.
      if (persistent && persistent.nowPlaying.feedId !== identity.feedId) {
        try {
          persistent.controls.stop();
        } catch (error) {
          console.error('Error stopping previous persistent playback during hand-off:', error);
        }
      }

      // Cross-mode: persistent content starting while a ringtone plays -
      // ringtones have no paused/resumable UI (no mini-player entry), so
      // fully stop it rather than leaving it silently paused with nothing
      // to resume it.
      let nextEphemeral: PlaybackSlot | null = ephemeral;
      if (ephemeral && ephemeral.nowPlaying.feedId !== identity.feedId) {
        try {
          ephemeral.controls.stop();
        } catch (error) {
          console.error('Error stopping ringtone during hand-off:', error);
        }
        nextEphemeral = null;
      }

      set({ persistent: newSlot, ephemeral: nextEphemeral });
    }
  },

  updateNowPlayingStatus: (feedId, patch) => {
    const { ephemeral, persistent } = get();
    if (ephemeral && ephemeral.nowPlaying.feedId === feedId) {
      set({ ephemeral: { ...ephemeral, nowPlaying: { ...ephemeral.nowPlaying, ...patch } } });
    }
    if (persistent && persistent.nowPlaying.feedId === feedId) {
      set({ persistent: { ...persistent, nowPlaying: { ...persistent.nowPlaying, ...patch } } });
    }
  },

  clearNowPlaying: (feedId) => {
    const { ephemeral, persistent } = get();
    if (ephemeral && ephemeral.nowPlaying.feedId === feedId) {
      set({ ephemeral: null });
    }
    if (persistent && persistent.nowPlaying.feedId === feedId) {
      set({ persistent: null });
    }
  },
}));
