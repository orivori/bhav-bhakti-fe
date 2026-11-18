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

// The poster (thumbnail) covers the video until its first frame is drawn, and
// stays if the video fails - never a black or empty box.
export function shouldShowPoster(state: { hasPoster: boolean; firstFrameShown: boolean; failed: boolean }): boolean {
  if (!state.hasPoster) return false;
  return state.failed || !state.firstFrameShown;
}
