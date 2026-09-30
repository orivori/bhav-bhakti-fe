/**
 * A new, unique id for one "play this" tap (Listen pill, play button, a
 * mantra/aarti/bhajan card, Next/Previous). Sent to audio-player.tsx as the
 * `playRequestId` route param alongside `autoPlay: 'true'`.
 *
 * audio-player.tsx auto-starts playback once per request id, not once per
 * track: its screen is never unmounted (a hidden Tabs.Screen), so a
 * per-track guard alone meant replaying the same track (e.g. after the
 * mini-player's ✕) opened the player without starting it. A fresh id on
 * every tap is also what makes the auto-start check re-run at all when every
 * other param is identical to the previous visit.
 *
 * Only the auto-start check reads this. "Currently playing" (playbackStore's
 * nowPlaying.feedId), card highlighting and the queue never see it.
 */
export function newPlayRequestId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
