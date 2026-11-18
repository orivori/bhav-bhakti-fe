// Pure rules for FeedVideo (feedVideoRules.test.mjs runs them under Node).

export type FeedVideoSource = { kind: 'local'; uri: string } | { kind: 'remote'; uri: string };

// Where this player's video comes from, decided once when it mounts (and
// again only after a saved file failed): the saved file when saving is on, a
// file exists and it hasn't failed in this player; otherwise the online link.
export function chooseVideoSource(input: {
  savingEnabled: boolean;
  localUri: string | null;
  remoteUri: string;
  localFailed: boolean;
}): FeedVideoSource {
  if (input.savingEnabled && input.localUri && !input.localFailed) return { kind: 'local', uri: input.localUri };
  return { kind: 'remote', uri: input.remoteUri };
}

// The poster (thumbnail) covers the video whenever no video frame is on
// screen, and stays if the video fails - never a black or empty box.
export function shouldShowPoster(state: { hasPoster: boolean; frameVisible: boolean; failed: boolean }): boolean {
  if (!state.hasPoster) return false;
  return state.failed || !state.frameVisible;
}

// What changes whether a video frame is on screen:
// - 'first_frame': expo-video drew the first frame. It reports this only ONCE
//   per video (expo-video's FirstFrameEventGenerator), so it can't be the
//   only way back after a background trip.
// - 'background': the app went to the background. Android drops the video
//   surface, so on return the area is black until frames are drawn again.
// - 'progress': playback is seen moving (isPlaybackProgress) - frames are
//   being drawn again.
export type FrameEvent = 'first_frame' | 'background' | 'progress';

export function frameVisibleAfter(event: FrameEvent): boolean {
  return event !== 'background';
}

// Playback moved forward since the last position report, while playing. The
// first report after a reset (previousTime null) only sets the baseline, so a
// video that is merely loaded never counts.
export function isPlaybackProgress(previousTime: number | null, currentTime: number, isPlaying: boolean): boolean {
  if (!isPlaying || previousTime === null) return false;
  return currentTime > previousTime + 0.05;
}
