import { usePlaybackStore } from '@/store/playbackStore';

// Audio around a rewarded ad (Revenue Model §5e section 5).
//
// - Persistent audio (mantra, aarti, bhajan, story): paused - not stopped, so
//   the queue, the mini-player and the lock-screen entry stay - and resumed
//   afterwards only if WE paused it and the same item is still loaded. A
//   track the user had already paused stays paused.
// - Ringtone previews (ephemeral slot): stopped; they have no resume.
//
// Home previews and the hub / enlarged-view videos aren't in playbackStore;
// they pause on their own while adFlowStore says an ad is loading or showing.

export interface PausedMedia {
  persistentFeedId: string | null;
}

export function pauseMediaForAd(): PausedMedia {
  const { persistent, ephemeral } = usePlaybackStore.getState();
  let persistentFeedId: string | null = null;

  if (persistent?.nowPlaying.isPlaying) {
    try {
      persistent.controls.pause();
      persistentFeedId = persistent.nowPlaying.feedId;
    } catch (error) {
      // A player released underneath us (CLAUDE.md §21) - nothing to resume.
      console.warn('pauseMediaForAd: pausing persistent audio failed', error);
    }
  }

  if (ephemeral?.nowPlaying.isPlaying) {
    try {
      ephemeral.controls.stop();
    } catch (error) {
      console.warn('pauseMediaForAd: stopping the ringtone preview failed', error);
    }
  }

  return { persistentFeedId };
}

export function resumeMediaAfterAd(paused: PausedMedia): void {
  if (!paused.persistentFeedId) return;
  const { persistent } = usePlaybackStore.getState();
  if (!persistent || persistent.nowPlaying.feedId !== paused.persistentFeedId) return;
  if (persistent.nowPlaying.isPlaying) return;
  try {
    persistent.controls.resume();
  } catch (error) {
    console.warn('resumeMediaAfterAd: resuming persistent audio failed', error);
  }
}
