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
  // Identifies the underlying PLAYER, not the content - lets the same-mode
  // hand-off below tell "a genuinely different player instance" (e.g. a
  // ringtone card handing off to a different ringtone card) apart from "the
  // same player instance is just switching to different content" (a skip
  // within audio-player.tsx's single shared persistent player). Ephemeral
  // registrations (RingtoneFeedCard) never set this - each card has its own
  // player, so leaving it undefined there always falls through to the
  // existing stop() behavior, unchanged.
  instanceId?: string;
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

// Deliberately just the fields already carried through today's nav params
// (see audio-player.tsx's entry points) - enough for the future queue sheet
// to render instantly with no extra fetch, without duplicating the full Feed
// shape here.
export interface QueueItem {
  feedId: string;
  title: string;
  audioUrl: string;
  thumbnailUrl?: string;
  // Added alongside the playback-switch flash fix (audio-player.tsx) - lets
  // a Next/Previous hop carry the real content type/repeatability through to
  // the player via route params, instead of the player having to wait on its
  // own feed-by-id fetch to know whether to show the aarti/bhajan track-nav
  // layout or the mantra counter layout. Optional so any future QueueItem
  // producer that doesn't set these degrades to audio-player.tsx's own
  // 'mantra' default, same as before this existed.
  type?: Feed['type'];
  isRepeatable?: boolean;
}

// originalItems + playOrder (a permutation of indices into originalItems),
// rather than a single reorderable list, is what makes shuffle reversible:
// shuffling never touches originalItems, so turning shuffle back off can
// always snap to the true original sequence. `position` points into
// playOrder, not directly into originalItems - the actual "current" item is
// always originalItems[playOrder[position]].
interface PlaybackQueueState {
  originalItems: QueueItem[];
  playOrder: number[];
  position: number;
  isShuffled: boolean;
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

  // Aarti/Bhajan queue (see CLAUDE.md's queue-feature notes). Independent of
  // the ephemeral/persistent slots above - this only tracks *ordering and
  // position within a browsing list*, not playback state, which still lives
  // entirely in the `persistent` slot via the usual registerPlaybackStart/
  // updateNowPlayingStatus path. Null when no queue is active (e.g. a single
  // mantra opened outside any list). No screen reads or writes this yet -
  // this phase is state-layer only.
  queue: PlaybackQueueState | null;

  // Establishes a new queue from an ordered list (e.g. the Aarti/Bhajan tab's
  // current FlatList data) and which item was tapped. Always resets
  // isShuffled to false - a fresh queue is a new browsing session, not a
  // continuation of whatever shuffle state a previous queue happened to be
  // in. Setting an empty list clears the queue instead of creating a
  // degenerate one-position-nowhere queue.
  setQueue: (items: QueueItem[], startIndex: number) => void;

  // Moves forward one step in playOrder. No wraparound: a no-op at the last
  // position, since "next" past the end of the queue isn't a meaningful
  // state - the UI is expected to disable its Next control at that point
  // rather than rely on this silently doing nothing.
  advanceQueue: () => void;

  // Symmetric to advanceQueue - no-op at position 0.
  goToPrevious: () => void;

  // Jumps directly to a position WITHIN playOrder (i.e. "the Nth item as
  // currently displayed," which is the shuffled order when shuffled) - not
  // an index into originalItems. This is what the future queue sheet taps
  // into: tapping the Nth visible row should jump to position N regardless
  // of whether the list is showing shuffled or original order. Out-of-range
  // indices are ignored.
  jumpToIndex: (index: number) => void;

  // Toggles shuffle without disturbing whatever is currently playing.
  // Turning ON: the current item stays first (so it keeps playing
  // uninterrupted) and every other item is shuffled behind it - position
  // resets to 0 since the current item is now always playOrder[0]. Turning
  // OFF: playOrder snaps back to true original order and position is
  // recalculated to wherever the current item naturally sits in that order -
  // playback itself is never touched by this action either way.
  toggleShuffle: () => void;

  // Drops the queue entirely (e.g. leaving the Aarti/Bhajan tab, or opening
  // a single mantra with no surrounding list) - does not touch the
  // persistent playback slot, which has its own independent stop/pause path.
  clearQueue: () => void;
}

// Fisher-Yates - used only by toggleShuffle, kept module-scope since it's a
// pure utility with no store state of its own.
function shuffleInPlace<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
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
  queue: null,

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
      // registered - fully stop/replace it, UNLESS it's the same underlying
      // player instance just switching content (a skip within
      // audio-player.tsx's single shared persistent player, identified via
      // instanceId - see NowPlayingIdentity's comment). Calling stop() in
      // that case was a real bug: it tore down the native lock-screen
      // session and paused/reset the position of the track that had just
      // started, since "outgoing" and "incoming" registrations share the
      // literal same player object there.
      const isSamePlayerInstance =
        persistent?.nowPlaying.instanceId !== undefined &&
        persistent.nowPlaying.instanceId === identity.instanceId;

      if (persistent && persistent.nowPlaying.feedId !== identity.feedId && !isSamePlayerInstance) {
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

  setQueue: (items, startIndex) => {
    if (items.length === 0) {
      set({ queue: null });
      return;
    }

    const clampedStart = Math.min(Math.max(startIndex, 0), items.length - 1);

    set({
      queue: {
        originalItems: items,
        playOrder: items.map((_, i) => i),
        position: clampedStart,
        isShuffled: false,
      },
    });
  },

  advanceQueue: () => {
    const { queue } = get();
    if (!queue) return;
    if (queue.position >= queue.playOrder.length - 1) return;

    set({ queue: { ...queue, position: queue.position + 1 } });
  },

  goToPrevious: () => {
    const { queue } = get();
    if (!queue) return;
    if (queue.position <= 0) return;

    set({ queue: { ...queue, position: queue.position - 1 } });
  },

  jumpToIndex: (index) => {
    const { queue } = get();
    if (!queue) return;
    if (index < 0 || index >= queue.playOrder.length) return;

    set({ queue: { ...queue, position: index } });
  },

  toggleShuffle: () => {
    const { queue } = get();
    if (!queue) return;

    // The item actually playing right now, independent of shuffle direction -
    // both branches below re-anchor playOrder/position around this same
    // original-array index so the current item is never disturbed.
    const currentOriginalIndex = queue.playOrder[queue.position];

    if (queue.isShuffled) {
      // Turning OFF: snap back to true original order. `position` is
      // recalculated to wherever the current item sits in THAT order -
      // playback itself is untouched, only the ordering/pointer bookkeeping
      // changes.
      set({
        queue: {
          ...queue,
          playOrder: queue.originalItems.map((_, i) => i),
          position: currentOriginalIndex,
          isShuffled: false,
        },
      });
    } else {
      // Turning ON: keep the current item first (so it stays "now playing"
      // uninterrupted) and shuffle only the rest behind it.
      const remainingIndices = queue.originalItems
        .map((_, i) => i)
        .filter((i) => i !== currentOriginalIndex);
      shuffleInPlace(remainingIndices);

      set({
        queue: {
          ...queue,
          playOrder: [currentOriginalIndex, ...remainingIndices],
          position: 0,
          isShuffled: true,
        },
      });
    }
  },

  clearQueue: () => set({ queue: null }),
}));
