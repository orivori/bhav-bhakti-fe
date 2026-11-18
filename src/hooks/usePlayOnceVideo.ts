import { useCallback, useEffect, useState } from 'react';
import { isVideoFinished, useFinishedVideoStore } from '@/store/finishedVideoStore';

// Play-once rules for a video wallpaper (Home card, hub tile, Search result).
// See finishedVideoStore.ts for why videos no longer loop.
//
// - A video that hasn't finished plays once (the caller renders FeedVideo
//   with onFinish and key={playerKey}; FeedVideo never loops).
// - When it reaches the end, it is remembered as finished; the player that
//   just finished stays mounted, so its last frame stays on screen with the
//   replay button over it.
// - Once that player is removed (scrolled away, tab switch, Viewing Window,
//   ad), a finished video does NOT load its player again by itself: the
//   caller shows its thumbnail (or the plain placeholder) + the replay
//   button.
// - replay() forgets the finish and mounts a fresh player (new key), which
//   plays the video once more from the start.
//
// canMountPlayer is the caller's existing rule for whether a player may exist
// at all (visible-tile limit, Home's active card +-1, screen focus, ads).
export function usePlayOnceVideo(feedId: string, canMountPlayer: boolean) {
  const isFinished = useFinishedVideoStore((state) => isVideoFinished(state, feedId));
  const markFinished = useFinishedVideoStore((state) => state.markFinished);
  const clearFinished = useFinishedVideoStore((state) => state.clearFinished);
  // True only while the player that reached the end is still mounted.
  const [finishedInThisPlayer, setFinishedInThisPlayer] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);

  // The player is removed whenever canMountPlayer turns false - after that
  // the finish no longer belongs to a mounted player.
  useEffect(() => {
    if (!canMountPlayer) setFinishedInThisPlayer(false);
  }, [canMountPlayer]);

  // The player reached the end (FeedVideo's onFinish).
  const onFinish = useCallback(() => {
    markFinished(feedId);
    setFinishedInThisPlayer(true);
  }, [feedId, markFinished]);

  const replay = useCallback(() => {
    setFinishedInThisPlayer(false);
    clearFinished(feedId);
    setPlayerKey((key) => key + 1);
  }, [feedId, clearFinished]);

  return {
    // Whether to render the <Video> at all.
    shouldMountPlayer: canMountPlayer && (!isFinished || finishedInThisPlayer),
    // Whether to show the replay button (on the last frame or the still).
    isFinished,
    playerKey,
    onFinish,
    replay,
  };
}
