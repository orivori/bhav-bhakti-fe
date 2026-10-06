import { router } from 'expo-router';
import { Feed } from '@/types/feed';
import { usePlaybackStore, QueueItem } from '@/store/playbackStore';
import { getFeedSubtitle, getFeedThumbnailUrl } from '@/utils/feedFields';
import { newPlayRequestId } from '@/utils/playRequest';

/**
 * Opening a persistent-player feed (aarti, bhajan, a story or episode) in
 * audio-player.tsx, optionally with a playback queue. Shared by
 * AudioContentCard and the Stories screens so every entry point sends the
 * player the same params.
 */

// One definition of a feed's queue item - also its title/audio/thumbnail
// for display, so a card and the queue it seeds can never disagree on
// "this feed's title".
export function toQueueItem(feed: Feed, language: string): QueueItem {
  const title = feed.title?.[language] || feed.title?.en || getFeedSubtitle(feed, language) || 'Untitled';
  const isAudio = feed.mediaType === 'audio';
  const audioUrl = isAudio ? feed.url || '' : '';
  const thumbnailUrl = isAudio ? getFeedThumbnailUrl(feed) ?? undefined : undefined;

  return { feedId: feed.id.toString(), title, audioUrl, thumbnailUrl, type: feed.type, isRepeatable: feed.isRepeatable };
}

interface OpenAudioPlayerOptions {
  feed: Feed;
  language: string;
  // The full list the feed belongs to and its position in it - seeds the
  // playback queue (playbackStore.ts). Omit both for a queue-less open.
  queueItems?: Feed[];
  queueIndex?: number;
  // Where the player's back button returns to (see audio-player.tsx).
  returnTo: string;
  returnParams?: Record<string, string>;
}

export function openAudioPlayer({ feed, language, queueItems, queueIndex, returnTo, returnParams }: OpenAudioPlayerOptions): void {
  // Seed the queue from the list as it stands right now, before navigating.
  if (queueItems && queueIndex !== undefined) {
    usePlaybackStore.getState().setQueue(
      queueItems.map((item) => toQueueItem(item, language)),
      queueIndex
    );
  }

  const { title, audioUrl, thumbnailUrl } = toQueueItem(feed, language);

  router.push({
    pathname: '/(main)/audio-player',
    params: {
      feedId: feed.id.toString(),
      title,
      // encodeURIComponent: audioUrl/thumbnailUrl are Firebase Storage URLs
      // already containing their own legitimate %2F/%20 sequences -
      // useLocalSearchParams() on the other side unconditionally
      // decodeURIComponent's every string param once, which silently
      // corrupts the URL (%2F -> literal /) without this - see CLAUDE.md's
      // route-param URL corruption investigation. toQueueItem's own return
      // value stays RAW, since QueueSheet.tsx renders item.thumbnailUrl
      // directly as an <Image> source - only the places that build route
      // params (here, and audio-player.tsx's navigateToQueueItem) encode.
      audioUrl: encodeURIComponent(audioUrl),
      thumbnailUrl: encodeURIComponent(thumbnailUrl || ''),
      // Lets audio-player.tsx render the right control layout from the
      // first frame instead of defaulting to mantra until its own fetch
      // resolves - see CLAUDE.md's playback-switch flash fix.
      type: feed.type,
      isRepeatable: feed.isRepeatable ? 'true' : 'false',
      autoPlay: 'true',
      // New on every tap - see newPlayRequestId.
      playRequestId: newPlayRequestId(),
      // See audio-player.tsx's back-button handling: without these, back
      // falls through to router.back(), which always lands on Home
      // regardless of where the user actually came from.
      returnTo,
      ...(returnParams ? { returnParams: JSON.stringify(returnParams) } : {}),
    },
  });
}
