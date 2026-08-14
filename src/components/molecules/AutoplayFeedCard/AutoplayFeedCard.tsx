import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Alert, Dimensions, Platform, Linking, AppState, ActivityIndicator } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/atoms';
import { Feed } from '@/types/feed';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { useTranslation } from '@/hooks/useTranslation';
import { feedService } from '@/features/feed/services/feedService';
import { useFeedStore } from '@/store/feedStore';
import { useSoundPreferenceStore } from '@/store/soundPreferenceStore';
import { usePremiumStore } from '@/store/premiumStore';
import { formatCount } from '@/utils/formatCount';
import { getMediaFileExtension } from '@/utils/getMediaFileExtension';
import { shareContent } from '@/utils/shareContent';
import WhatsAppIcon from '../../../../assets/icons/whatsapp.svg';

interface AutoplayFeedCardProps {
  feed: Feed;
  isActive: boolean;
}

// --- Sizing (Phase 3, reworked) ---
// Reduced from 0.88 as part of the audio-card redesign (blur background +
// centered square thumbnail + controls row needs far less height than the
// old thumbnail-fills-the-card layout). Kept as the SAME kind of formula
// (a fixed % of usable viewport) rather than switching to a content-derived
// sum - deliberately, for simplicity and a uniform card height regardless of
// thumbnail content. 0.75 was chosen (not the originally-proposed 0.65)
// after checking real device-height math: FeedList's viewport-autoplay
// election (FeedList.tsx) picks the topmost item that's ≥60% visible: two
// cards can simultaneously satisfy that threshold whenever
// cardHeight ≤ usableViewportHeight / 1.2 (≈0.833). At 0.65 this held on
// every common device checked (iPhone SE through Pro Max, mid-range
// Android) - a real, non-edge-case risk of a second card looking visible
// but staying inert. 0.75 stays safely under that risk on all of them.
const AUDIO_CONTENT_HEIGHT_RATIO = 0.75; // of the usable viewport
const VISUAL_ASPECT_RATIO = 16 / 9; // height = width * this, for wallpaper/thought/video
// Header row's own footprint (added this session, above contentArea): 20px
// text line height + 8px (styles.headerRow's marginBottom, spacing.sm).
// The 20 is deterministic, not an estimate - both header texts go through
// the shared Text atom with no explicit lineHeight override, so they inherit
// its 'body' variant's lineHeight: 20 (Text.tsx), and since CONTENT_TYPE_LABELS
// and "See all" are always hardcoded English (never resolved through the
// language system), the atom's Hindi-aware dynamic line-height path never
// triggers - this can't drift per-device or per-language the way raw
// unstyled Text would. Subtracted from contentAreaHeight below so adding the
// header didn't grow the card's total height (and shrink next-card-peek) -
// audio's ratio was tuned against the pre-header pixel budget, so this
// restores it exactly; visual's 16:9 becomes a smaller, no-longer-exact
// ratio, an accepted trade-off (consistent peek across all card types over
// aspect-ratio purity - real content doesn't hit 16:9 exactly anyway).
const HEADER_ROW_HEIGHT = 28;
const FOOTER_HEIGHT = 56;

// --- Playback ---
const AUDIO_PLAYBACK_CAP_SECONDS = 30;

const { width: screenWidth, height: windowHeight } = Dimensions.get('window');
// All cards (audio and visual alike) now share the same horizontal gutter -
// wallpaper/video cards are no longer full-bleed. This also feeds the 16:9
// height math below, so visual cards are proportionally shorter than before
// (a direct, intended side effect: better "next card peeks" behavior).
// Bumped from spacing.md to spacing.lg so the card's edges match Home's
// search bar/quick-links grid/horoscope card alignment above it in the same
// scroll view (those all use spacing.lg; this was the one outlier at .md).
const CARD_WIDTH = screenWidth - goldenTempleTheme.spacing.lg * 2;

// Audio cards' centered thumbnail - proportional to CARD_WIDTH (screen
// width varies far less across devices than screen height does), not to
// contentAreaHeight/viewport. It's a fixed floating square now, not
// something the card's own height is derived from - contentAreaHeight for
// audio still comes from AUDIO_CONTENT_HEIGHT_RATIO above, just a smaller %.
// 0.66, not the originally-proposed 0.62 - a slight bump for more presence.
// Still comfortably fits the smallest realistic device's budget alongside
// the controls row below it (checked: ~84px of vertical slack remains on
// an iPhone SE-class screen even after this bump).
const THUMBNAIL_SIZE = CARD_WIDTH * 0.66;

// Native RN Image blurRadius (no new dependency - see the earlier
// investigation this session). Applied only to the full-bleed background
// copy of the thumbnail, never the sharp centered one.
const AUDIO_BACKGROUND_BLUR_RADIUS = 20;

const getAudioFileExtension = (audioUri: string): string => {
  const pathWithoutQuery = audioUri.split('?')[0];
  const urlParts = pathWithoutQuery.split('.');
  const extension = urlParts.length > 1 ? urlParts[urlParts.length - 1].toLowerCase() : 'mp3';
  const supportedExtensions = ['mp3', 'wav', 'aac', 'm4a', 'ogg'];
  return supportedExtensions.includes(extension) ? extension : 'mp3';
};

// Deliberately the SAME cache path convention audio-player.tsx uses
// (`audio_player_${feedId}.<ext>`, not a card-specific prefix) so a mantra
// played here and later opened via the "Listen" CTA - or vice versa - reuses
// one cached file on disk instead of downloading it twice. The in-flight
// download/cancellation bookkeeping below is intentionally NOT shared across
// the two files (that would mean exporting mutable module state out of a
// route screen, which is unusual) - worst case on a genuine collision is two
// components briefly racing to write the same path, the same accepted-low-risk
// gap RingtoneFeedCard's own ensureLocalFile already documents elsewhere in
// this codebase. If audio-player.tsx's naming convention ever changes, this
// needs to change with it.
const getLocalCachePath = (feedId: string, audioUri: string): string =>
  `${FileSystem.documentDirectory}audio_player_${feedId}.${getAudioFileExtension(audioUri)}`;

const inFlightBackgroundDownloads = new Map<string, FileSystem.DownloadResumable>();
const inFlightCancellations = new Map<string, Promise<void>>();
const queuedForBackgroundDownload = new Set<string>();

// Fast, local-only check - mirrors audio-player.tsx/RingtoneFeedCard's
// identical pattern. Returns the cached URI on a hit, null on a miss, without
// blocking on a download either way.
const getCachedLocalUri = async (feedId: string, audioUri: string): Promise<string | null> => {
  const pendingCancellation = inFlightCancellations.get(feedId);
  if (pendingCancellation) {
    await pendingCancellation;
  }
  const localFileUri = getLocalCachePath(feedId, audioUri);
  const fileInfo = await FileSystem.getInfoAsync(localFileUri);
  return fileInfo.exists ? localFileUri : null;
};

// Fire-and-forget, non-blocking - primes the cache after a fresh play has
// already started from the remote URL. Never touches a player instance, so
// it's safe to keep running (or be cancelled) after this card unmounts.
const downloadToCacheInBackground = (feedId: string, audioUri: string): void => {
  if (inFlightBackgroundDownloads.has(feedId) || queuedForBackgroundDownload.has(feedId)) {
    return;
  }

  const startDownload = () => {
    queuedForBackgroundDownload.delete(feedId);
    const localFileUri = getLocalCachePath(feedId, audioUri);
    const resumable = FileSystem.createDownloadResumable(audioUri, localFileUri);
    inFlightBackgroundDownloads.set(feedId, resumable);

    resumable
      .downloadAsync()
      .then((result) => {
        if (!result) return; // cancelled - cancelBackgroundDownload already cleans up
        if (result.status !== 200) {
          throw new Error(`Download failed with status ${result.status}`);
        }
      })
      .catch((error) => {
        console.error('AutoplayFeedCard: background cache download failed:', feedId, error);
        FileSystem.deleteAsync(localFileUri, { idempotent: true }).catch(() => {});
      })
      .finally(() => {
        inFlightBackgroundDownloads.delete(feedId);
      });
  };

  const pendingCancellation = inFlightCancellations.get(feedId);
  if (pendingCancellation) {
    queuedForBackgroundDownload.add(feedId);
    pendingCancellation.then(startDownload);
    return;
  }
  startDownload();
};

const cancelBackgroundDownload = (feedId: string): void => {
  const resumable = inFlightBackgroundDownloads.get(feedId);
  if (!resumable) return;

  inFlightBackgroundDownloads.delete(feedId);
  const cleanup = resumable
    .cancelAsync()
    .catch(() => {})
    .then(() => FileSystem.deleteAsync(resumable.fileUri, { idempotent: true }).catch(() => {}))
    .finally(() => {
      inFlightCancellations.delete(feedId);
    });
  inFlightCancellations.set(feedId, cleanup);
};

// Header row (above the thumbnail): plain content-type identity, not an
// action description - deliberately separate from the CTA pill's own
// verb-based label ("Listen"/"Set as Ringtone"/"Set as Wallpaper" below),
// which describes what tapping the pill does, not what this content is.
const CONTENT_TYPE_LABELS: Record<Feed['type'], string> = {
  general: 'General',
  mantra: 'Mantra',
  ringtone: 'Ringtone',
  wallpaper: 'Wallpaper',
  aarti: 'Aarti',
  bhajan: 'Bhajan',
  thought: 'Thought',
};

// 'See all' target per content type - reuses the exact same hub routes/subTab
// params Home's own quick-links already navigate to (app/(main)/index.tsx).
// 'general' has no matching hub screen, so it deliberately has no entry here;
// the header row hides the 'See all' link for it (see seeAllTarget below).
const SEE_ALL_TARGETS: Partial<Record<Feed['type'], { pathname: string; params?: Record<string, string> }>> = {
  mantra: { pathname: '/(main)/mantras' },
  ringtone: { pathname: '/(main)/ringtones', params: { subTab: 'ringtones' } },
  aarti: { pathname: '/(main)/ringtones', params: { subTab: 'aarti' } },
  bhajan: { pathname: '/(main)/ringtones', params: { subTab: 'bhajan' } },
  wallpaper: { pathname: '/(main)/daily-status', params: { subTab: 'wallpapers' } },
  thought: { pathname: '/(main)/daily-status', params: { subTab: 'thought' } },
};

/**
 * Phase 4: real content. Own isolated player (no playbackStore involvement,
 * per CLAUDE.md §29), content-type-aware playback, real action row.
 */
export default function AutoplayFeedCard({ feed, isActive }: AutoplayFeedCardProps) {
  const { language } = useTranslation();
  const insets = useSafeAreaInsets();
  const { tabBarHeight } = useTabBarHeight();
  const { toggleLike, incrementDownload, incrementView } = useFeedStore();
  const isVideoMuted = useSoundPreferenceStore((s) => s.isVideoMuted);
  const setVideoMuted = useSoundPreferenceStore((s) => s.setVideoMuted);
  // Consolidated onto the shared store - see premiumStore.ts's
  // DEV_OVERRIDE_IS_PREMIUM comment. Was a local `const isPremiumUser =
  // false;` here; the store's own default is also false, so this is a
  // behavior-identical swap.
  const { isPremium: isPremiumUser } = usePremiumStore();

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Stop-on-blur: `isActive` only tracks election WITHIN Home (FeedList's
  // viewability logic, see CLAUDE.md §30) - it says nothing about whether
  // Home itself is the focused screen. Without this, navigating to a
  // different tab left the elected card's isActive untouched, so its
  // audio/video kept playing off-screen. Mirrors RingtoneFeedCard.tsx's
  // identical useFocusEffect stop-on-blur pattern - fires on tab-navigation
  // blur and on unmount (react-navigation runs the last-returned cleanup for
  // both, per that component's own comment on the same hook). This only
  // covers in-app navigation - OS-level backgrounding is a separate signal,
  // handled by the isAppActive tracking right below.
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => {
        setIsScreenFocused(false);
      };
    }, [])
  );

  // Stop-on-background: mirrors RingtoneFeedCard.tsx's AppState listener -
  // without this, minimizing the app or switching to a different app left a
  // playing card's audio/video running, since isActive/isScreenFocused above
  // have no visibility into OS-level backgrounding at all. Scoped to
  // subscribe only while this card is the elected one (isActive), same
  // reasoning RingtoneFeedCard uses for scoping on status.playing - idle
  // cards in the list shouldn't each hold their own AppState listener. Synced
  // fresh off AppState.currentState whenever isActive flips true (rather than
  // trusting whatever isAppActive was last set to) so a stale value from a
  // previous active stint can't leak in.
  const [isAppActive, setIsAppActive] = useState(true);
  useEffect(() => {
    if (!isActive) return;
    setIsAppActive(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setIsAppActive(nextAppState === 'active');
    });
    return () => {
      subscription.remove();
    };
  }, [isActive]);

  const isEffectivelyActive = isActive && isScreenFocused && isAppActive;

  const feedIdStr = feed.id.toString();
  const usableViewportHeight = windowHeight - insets.top - tabBarHeight;

  const audioMedia = feed.media?.find((m) => m.type === 'audio' || m.type === 'image_audio');
  const hasAudioMedia = !!audioMedia;
  const audioSourceUri = audioMedia?.audioUrl || audioMedia?.mediaUrl;
  // Ringtone gets its own CTA (direct set-as-ringtone, no navigation) -
  // mantra/aarti/bhajan share the 'Listen'-into-full-player behavior.
  const isRingtoneType = feed.type === 'ringtone';

  const visualMedia =
    feed.media?.find((m) => m.type === 'video') || feed.media?.find((m) => m.type === 'image') || feed.media?.[0];

  const title = feed.title?.[language] || feed.title?.en || feed.caption || 'Untitled';

  const contentTypeLabel = CONTENT_TYPE_LABELS[feed.type];
  const seeAllTarget = SEE_ALL_TARGETS[feed.type];
  const handleSeeAllPress = () => {
    if (!seeAllTarget) return;
    // Cast needed: SEE_ALL_TARGETS is a plain lookup table, so its pathname
    // strings aren't narrowed to expo-router's generated typed-route union.
    router.push(seeAllTarget as any);
  };

  const contentAreaHeight =
    (hasAudioMedia
      ? usableViewportHeight * AUDIO_CONTENT_HEIGHT_RATIO
      : CARD_WIDTH * VISUAL_ASPECT_RATIO) - HEADER_ROW_HEIGHT;

  // Audio only: the thumbnail is centered on its OWN (both axes) within
  // contentArea - NOT as part of a combined thumbnail+controls block. The
  // controls row just sits directly below wherever the thumbnail lands,
  // aligned to its left/right edges, uninvolved in the centering itself.
  // Computed here rather than in StyleSheet since contentAreaHeight is a
  // per-render value (driven by usableViewportHeight).
  const audioThumbnailTop = (contentAreaHeight - THUMBNAIL_SIZE) / 2;
  const audioThumbnailLeft = (CARD_WIDTH - THUMBNAIL_SIZE) / 2;
  const audioControlsRowTop = audioThumbnailTop + THUMBNAIL_SIZE + goldenTempleTheme.spacing.md;

  // --- Isolated audio player (mantra/ringtone/aarti/bhajan only) ---
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const hasLoadedSourceRef = useRef(false);

  useEffect(() => {
    if (!hasAudioMedia || !audioSourceUri) return;
    let isEffectCurrent = true;

    const activate = async () => {
      try {
        if (!hasLoadedSourceRef.current) {
          const cachedUri = await getCachedLocalUri(feedIdStr, audioSourceUri);
          if (!isEffectCurrent) return; // deactivated again while the cache check was in flight
          const sourceUri = cachedUri ?? audioSourceUri;
          player.replace({ uri: sourceUri });
          hasLoadedSourceRef.current = true;
          if (!cachedUri) {
            downloadToCacheInBackground(feedIdStr, audioSourceUri);
          }
          feedService.viewFeed(feedIdStr).then(() => incrementView(feedIdStr)).catch((e) =>
            console.error('AutoplayFeedCard: view tracking error:', e)
          );
          feedService.playFeed(feedIdStr).catch((e) =>
            console.error('AutoplayFeedCard: play tracking error:', e)
          );
        }
        player.seekTo(0);
        player.play();
      } catch (error) {
        console.error('AutoplayFeedCard: error activating audio playback:', error);
      }
    };

    const deactivate = async () => {
      try {
        player.pause();
        await player.seekTo(0);
      } catch (error) {
        console.error('AutoplayFeedCard: error deactivating audio playback:', error);
      }
      cancelBackgroundDownload(feedIdStr);
    };

    if (isEffectivelyActive) {
      activate();
    } else {
      deactivate();
    }

    return () => {
      isEffectCurrent = false;
    };
  }, [isEffectivelyActive, hasAudioMedia, audioSourceUri, feedIdStr, player, incrementView]);

  // Shared with handleToggleAudioPlayPause below - both need the exact same
  // "has this track reached its cap" definition, kept as one function so
  // the two can't drift apart.
  const getPlaybackCapSeconds = () =>
    status.duration > 0 ? Math.min(AUDIO_PLAYBACK_CAP_SECONDS, status.duration) : AUDIO_PLAYBACK_CAP_SECONDS;

  // 30s-or-natural-length cap, audio only - pauses, no further prompt (the
  // CTA pill already covers "want more").
  useEffect(() => {
    if (!hasAudioMedia || !isEffectivelyActive || !status.playing) return;
    if (status.currentTime >= getPlaybackCapSeconds()) {
      try {
        player.pause();
      } catch (error) {
        console.error('AutoplayFeedCard: error pausing at playback cap:', error);
      }
    }
  }, [status.currentTime, status.playing, status.duration, hasAudioMedia, isEffectivelyActive, player]);

  // Track a view once when visual (non-audio) content becomes active -
  // audio's own view tracking already happens above, tied to its first load.
  const hasTrackedVisualViewRef = useRef(false);
  useEffect(() => {
    if (hasAudioMedia || !isActive || hasTrackedVisualViewRef.current) return;
    hasTrackedVisualViewRef.current = true;
    feedService.viewFeed(feedIdStr).then(() => incrementView(feedIdStr)).catch((e) =>
      console.error('AutoplayFeedCard: view tracking error:', e)
    );
  }, [hasAudioMedia, isActive, feedIdStr, incrementView]);

  // Defensive - this card mounts/unmounts far more often than any existing
  // card (viewport scroll, not just tab switches). player.isLoaded read is
  // guarded the same way RingtoneFeedCard's unmount cleanup guards it: by the
  // time this runs, useAudioPlayer's own internal release may have already
  // fired (React runs effect cleanups in declaration order), so merely
  // reading player.isLoaded can throw "already released."
  useEffect(() => {
    return () => {
      try {
        if (player.isLoaded) {
          player.pause();
        }
      } catch (error) {
        console.error('AutoplayFeedCard: error pausing on unmount (player likely already released):', error);
      }
      cancelBackgroundDownload(feedIdStr);
    };
  }, [player, feedIdStr]);

  // Manual play/pause tap, independent of the isEffectivelyActive-driven
  // autoplay effect above - since neither `isEffectivelyActive` nor any of
  // that effect's other deps change when the user taps this, the effect
  // never refires and doesn't fight this. Scrolling away and back still
  // resets to 0 and autoplays again as before (unrelated to this manual
  // override).
  const handleToggleAudioPlayPause = () => {
    try {
      if (status.playing) {
        player.pause();
      } else {
        // If the cap already fired, currentTime is parked at/past the cap -
        // calling play() alone would immediately get paused right back by
        // the cap effect above (its guard sees currentTime >= cap again the
        // instant playing flips true), making the button look unresponsive.
        // Seek to 0 first so this is a genuine restart. A normal mid-track
        // manual pause (currentTime still under the cap) is untouched -
        // resumes exactly where it left off, same as before.
        if (status.currentTime >= getPlaybackCapSeconds()) {
          player.seekTo(0);
        }
        player.play();
      }
    } catch (error) {
      console.error('AutoplayFeedCard: error toggling play/pause:', error);
    }
  };

  // --- Action row (Like / Share / Views) ---
  const [localIsLiked, setLocalIsLiked] = useState(feed.isLiked);
  const [localLikesCount, setLocalLikesCount] = useState(feed.likesCount);
  useEffect(() => {
    setLocalIsLiked(feed.isLiked);
    setLocalLikesCount(feed.likesCount);
  }, [feed.isLiked, feed.likesCount]);

  const handleLike = async () => {
    const wasLiked = localIsLiked;
    const currentCount = localLikesCount;
    try {
      if (isMountedRef.current) {
        setLocalIsLiked(!wasLiked);
        setLocalLikesCount(wasLiked ? Math.max(0, currentCount - 1) : currentCount + 1);
      }
      if (wasLiked) {
        await feedService.unlikeFeed(feedIdStr);
      } else {
        await feedService.likeFeed(feedIdStr);
      }
      toggleLike(feedIdStr);
    } catch (error) {
      console.error('AutoplayFeedCard: error liking feed:', error);
      if (isMountedRef.current) {
        setLocalIsLiked(feed.isLiked);
        setLocalLikesCount(feed.likesCount);
      }
      Alert.alert('Error', 'Failed to like this. Please try again.');
    }
  };

  // shareContent resolves audio-vs-visual and thumbnail-vs-file itself from
  // feed.media - no need to pass hasAudioMedia/audioSourceUri/visualMedia
  // through, and it already handles its own errors (see its own doc
  // comment), so no try/catch needed here either.
  const [isSharing, setIsSharing] = useState(false);
  const handleShare = async () => {
    if (isSharing) return;
    if (isMountedRef.current) setIsSharing(true);

    await shareContent(feed, {
      // Reverts the loading state once the OS share sheet is about to
      // present, rather than waiting for Share.open()'s own promise (which
      // only resolves once the user dismisses that sheet).
      onSharePresenting: () => {
        if (isMountedRef.current) setIsSharing(false);
      },
    });

    // Safety net for any path that never reaches onSharePresenting (e.g.
    // nothing shareable on this feed) - shareContent's promise always
    // eventually settles, so this always runs; a no-op if already reverted.
    if (isMountedRef.current) setIsSharing(false);
  };

  // --- CTA pill ---
  const [isSettingWallpaper, setIsSettingWallpaper] = useState(false);
  const [isSettingRingtone, setIsSettingRingtone] = useState(false);

  const handleListenPress = () => {
    router.push({
      pathname: '/(main)/audio-player',
      params: {
        feedId: feedIdStr,
        title,
        audioUrl: audioSourceUri || '',
        thumbnailUrl: audioMedia?.thumbnailUrl || '',
        autoPlay: 'true',
        returnTo: '/(main)/',
      },
    });
  };

  const handleSetAsWallpaperPress = async () => {
    if (isSettingWallpaper || !visualMedia?.mediaUrl) return;
    if (isMountedRef.current) setIsSettingWallpaper(true);
    try {
      const { status: permissionStatus } = await MediaLibrary.requestPermissionsAsync();
      if (permissionStatus !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to save this to your gallery.');
        return;
      }
      const extension = getMediaFileExtension(visualMedia.mediaUrl, visualMedia.type);
      // Timestamp suffix guarantees a unique local path on every attempt -
      // see useWallpaperActions.ts's handleDownload for the full explanation
      // (MediaStore's own collision handling otherwise silently reused an
      // existing gallery entry for a repeated deterministic filename).
      const fileUri = `${FileSystem.documentDirectory}autoplay_visual_${feed.id}_${Date.now()}.${extension}`;
      const downloadResult = await FileSystem.downloadAsync(visualMedia.mediaUrl, fileUri);
      if (downloadResult.status === 200) {
        await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
        // Clean up the local staging copy now that it's safely in the
        // gallery - best-effort, since the gallery save already succeeded
        // either way.
        FileSystem.deleteAsync(downloadResult.uri, { idempotent: true }).catch(() => {});
        // No OS-level "set wallpaper" API exists anywhere in this app yet
        // (same honest limitation RingtoneFeedCard's "Set as ringtone" already
        // has for iOS) - this saves to the gallery and hands off manually,
        // rather than implying full automation.
        Alert.alert('Saved to Gallery', 'Open your Gallery/Photos app and set it as your wallpaper from there.');
        await feedService.downloadFeed(feedIdStr);
        incrementDownload(feedIdStr);
      }
    } catch (error) {
      console.error('AutoplayFeedCard: error saving wallpaper:', error);
      Alert.alert('Error', 'Failed to save this. Please try again.');
    } finally {
      if (isMountedRef.current) setIsSettingWallpaper(false);
    }
  };

  // Blocking download-if-missing check, reusing this card's own feedId-keyed
  // cache path (the same one the streaming/autoplay path above already
  // populates) rather than RingtoneFeedCard's separate sanitized-title-keyed
  // file - same user-facing behavior as "the existing Ringtones tab's
  // set-ringtone flow," but backed by whichever cache entry this card
  // already has, so a ringtone already played here doesn't get downloaded a
  // second time under a different filename.
  const ensureLocalAudioFile = async (): Promise<string> => {
    if (!audioSourceUri) {
      throw new Error('No audio file found for this ringtone.');
    }
    const localFileUri = getLocalCachePath(feedIdStr, audioSourceUri);
    const fileInfo = await FileSystem.getInfoAsync(localFileUri);
    if (fileInfo.exists) return localFileUri;

    const downloadResult = await FileSystem.downloadAsync(audioSourceUri, localFileUri);
    if (downloadResult.status !== 200) {
      throw new Error(`Download failed with status ${downloadResult.status}`);
    }
    return downloadResult.uri;
  };

  // Mirrors RingtoneFeedCard.tsx's handleSetRingtone exactly (same
  // platform-specific messaging and manual-steps fallback, since neither
  // platform has a real automated "set ringtone" API available here) - the
  // only difference is the cache file this pulls from, per the comment above.
  const handleSetRingtone = async () => {
    if (isSettingRingtone) return;
    if (isMountedRef.current) setIsSettingRingtone(true);
    try {
      const { status: permissionStatus } = await MediaLibrary.requestPermissionsAsync();
      if (permissionStatus !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to set ringtone.');
        return;
      }

      const localUri = await ensureLocalAudioFile();

      if (Platform.OS === 'android') {
        try {
          await MediaLibrary.saveToLibraryAsync(localUri);
          Alert.alert(
            'Ringtone Downloaded & Saved',
            'The ringtone has been saved to your device. To set it as your ringtone:\n\n1. Go to Settings > Sounds\n2. Select Phone Ringtone\n3. Choose the downloaded file',
            [
              { text: 'Open Sound Settings', onPress: () => Linking.openSettings() },
              { text: 'OK', style: 'default' },
            ]
          );
        } catch (mediaError) {
          console.log('AutoplayFeedCard: could not save to media library, file is still downloaded:', mediaError);
          Alert.alert(
            'Ringtone Downloaded',
            'The ringtone has been downloaded to your device. To set it as your ringtone:\n\n1. Go to Settings > Sounds\n2. Select Phone Ringtone\n3. Look for the ringtone file in your downloads',
            [
              { text: 'Open Sound Settings', onPress: () => Linking.openSettings() },
              { text: 'OK', style: 'default' },
            ]
          );
        }
      } else if (Platform.OS === 'ios') {
        try {
          await MediaLibrary.saveToLibraryAsync(localUri);
          Alert.alert(
            'Ringtone Downloaded & Saved',
            'The ringtone has been saved to your device. To set it as your ringtone:\n\n1. Go to Settings > Sounds & Haptics\n2. Select Ringtone\n3. Choose the downloaded file from "Custom" section',
            [
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
              { text: 'OK', style: 'default' },
            ]
          );
        } catch (mediaError) {
          console.log('AutoplayFeedCard: MediaLibrary does not support this audio format on iOS:', mediaError);
          Alert.alert(
            'Ringtone Downloaded',
            'The ringtone has been downloaded successfully!\n\nFor iOS ringtones:\n• Connect to iTunes/Finder\n• Convert to .m4r format\n• Sync to set as ringtone\n\nOr use GarageBand to import and set as ringtone.',
            [
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
              { text: 'Got It', style: 'default' },
            ]
          );
        }
      }
    } catch (error) {
      console.error('AutoplayFeedCard: error setting ringtone:', error);
      Alert.alert('Error', 'Failed to set ringtone. Please try again.');
    } finally {
      if (isMountedRef.current) setIsSettingRingtone(false);
    }
  };

  const showPaywallPlaceholder = () => {
    // TEMPORARY/PLACEHOLDER - stands in for the real paywall/upsell screen.
    Alert.alert('Premium Feature', 'This will be available with Bhav Bhakti Premium. Stay tuned!');
  };

  // Single dispatcher behind the CTA pill - gates all three real actions
  // behind the placeholder premium check above, then routes to whichever of
  // the three real handlers applies to this feed.
  const handleCtaPress = () => {
    if (!isPremiumUser) {
      showPaywallPlaceholder();
      return;
    }
    if (hasAudioMedia) {
      if (isRingtoneType) {
        handleSetRingtone();
      } else {
        handleListenPress();
      }
    } else {
      handleSetAsWallpaperPress();
    }
  };

  const ctaIcon: keyof typeof Ionicons.glyphMap = hasAudioMedia
    ? isRingtoneType
      ? 'notifications-outline'
      : 'play'
    : 'download-outline';

  const ctaLabel = hasAudioMedia
    ? isRingtoneType
      ? (isSettingRingtone ? 'Setting...' : 'Set as Ringtone')
      : 'Listen'
    : (isSettingWallpaper ? 'Saving...' : 'Set as Wallpaper');

  const ctaDisabled = (isRingtoneType && isSettingRingtone) || (!hasAudioMedia && isSettingWallpaper);

  return (
    // Audio and visual cards now share the same horizontal gutter (styles.card) -
    // see CARD_WIDTH above for how that feeds the visual branch's height math.
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTypeLabel}>{contentTypeLabel}</Text>
        {seeAllTarget && (
          <TouchableOpacity
            onPress={handleSeeAllPress}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.headerSeeAllText}>See all</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.contentArea, { height: contentAreaHeight }]}>
        {hasAudioMedia ? (
          <>
            {/* Blurred background - same thumbnail, scaled to fill, blurred.
                Falls back to a flat color (no image to blur) when there's no
                thumbnail at all. */}
            {audioMedia?.thumbnailUrl ? (
              <Image
                source={{ uri: audioMedia.thumbnailUrl }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                blurRadius={AUDIO_BACKGROUND_BLUR_RADIUS}
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.audioFallback]} />
            )}

            {/* Sharp thumbnail - centered on both axes within contentArea,
                independent of the controls row below it (see
                audioThumbnailTop/Left above). */}
            {audioMedia?.thumbnailUrl ? (
              <Image
                source={{ uri: audioMedia.thumbnailUrl }}
                style={[styles.audioThumbnail, { top: audioThumbnailTop, left: audioThumbnailLeft }]}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.audioThumbnail,
                  styles.audioFallback,
                  { top: audioThumbnailTop, left: audioThumbnailLeft },
                ]}
              >
                <Ionicons name="musical-notes" size={40} color={goldenTempleTheme.colors.primary.DEFAULT} />
              </View>
            )}

            {/* Controls row - anchored directly below the thumbnail's own
                bottom edge, aligned to its left/right edges (width matches
                THUMBNAIL_SIZE exactly). Not part of any centering
                calculation of its own - it just follows the thumbnail. */}
            <View
              style={[
                styles.audioControlsRow,
                { top: audioControlsRowTop, left: audioThumbnailLeft, width: THUMBNAIL_SIZE },
              ]}
            >
              {/* Manual override on top of the isEffectivelyActive-driven
                  autoplay, per handleToggleAudioPlayPause above. */}
              <TouchableOpacity
                style={styles.audioPlayPauseButton}
                onPress={handleToggleAudioPlayPause}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={status.playing ? 'pause' : 'play'}
                  size={26}
                  color="#fff"
                  style={status.playing ? undefined : styles.playIconNudge}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.audioCtaPill}
                onPress={handleCtaPress}
                disabled={ctaDisabled}
                activeOpacity={0.85}
              >
                <Ionicons name={ctaIcon} size={16} color="#fff" />
                <Text style={styles.ctaPillText}>{ctaLabel}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : visualMedia?.type === 'video' ? (
          <Video
            source={{ uri: visualMedia.mediaUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.COVER}
            isLooping
            shouldPlay={isEffectivelyActive}
            isMuted={isVideoMuted}
            posterSource={visualMedia.thumbnailUrl ? { uri: visualMedia.thumbnailUrl } : undefined}
          />
        ) : visualMedia?.mediaUrl ? (
          <Image source={{ uri: visualMedia.mediaUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.audioFallback]}>
            <Ionicons name="image" size={48} color={goldenTempleTheme.colors.primary.DEFAULT} />
          </View>
        )}

        {/* Mute toggle - video content only */}
        {!hasAudioMedia && visualMedia?.type === 'video' && (
          <TouchableOpacity
            style={styles.muteButton}
            onPress={() => setVideoMuted(!isVideoMuted)}
            activeOpacity={0.8}
          >
            <Ionicons name={isVideoMuted ? 'volume-mute' : 'volume-high'} size={18} color="#fff" />
          </TouchableOpacity>
        )}

        {/* CTA pill - visual content only (Set as Wallpaper). Audio has its
            own inline CTA pill inside audioControlsRow above, no longer
            this shared centered-overlay version. */}
        {!hasAudioMedia && (
          <View style={styles.ctaPillWrapper} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.ctaPill}
              onPress={handleCtaPress}
              disabled={ctaDisabled}
              activeOpacity={0.85}
            >
              {isSettingWallpaper ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name={ctaIcon} size={16} color="#fff" />
              )}
              <Text style={styles.ctaPillText}>{ctaLabel}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={[styles.footer, { height: FOOTER_HEIGHT }]}>
        <TouchableOpacity style={styles.footerAction} onPress={handleLike} activeOpacity={0.7}>
          <Ionicons
            name={localIsLiked ? 'heart' : 'heart-outline'}
            size={24}
            // Red-on-like unchanged; default (unliked) color moved to
            // literal black, matching the Share/Views icons.
            color={localIsLiked ? '#FF4444' : '#000000'}
          />
          {localLikesCount > 0 && (
            <Text variant="caption" style={styles.footerActionCount}>
              {formatCount(localLikesCount)}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerAction} onPress={handleShare} disabled={isSharing} activeOpacity={0.7}>
          {isSharing ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <WhatsAppIcon width={22} height={22} fill="#000000" />
          )}
          {feed.sharesCount > 0 && (
            <Text variant="caption" style={styles.footerActionCount}>
              {formatCount(feed.sharesCount)}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.footerAction}>
          <Ionicons name="eye-outline" size={20} color="#000000" />
          {feed.viewsCount > 0 && (
            <Text variant="caption" style={styles.footerActionCount}>
              {formatCount(feed.viewsCount)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: goldenTempleTheme.spacing.md,
    // Bumped from spacing.md - matches the search bar/quick-links grid/
    // horoscope card edge alignment above this list on Home.
    marginHorizontal: goldenTempleTheme.spacing.lg,
    // Minimum gap before the divider - the footer's own fixed 56px height
    // already centers its icons with ~16px of empty space above/below them,
    // so the hairline doesn't need much added room to read as deliberate
    // rather than cramped. Was spacing.md (16px), which ate into the
    // next-card-peek spacing tuned into contentAreaHeight's viewport math.
    paddingBottom: goldenTempleTheme.spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: goldenTempleTheme.colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: goldenTempleTheme.spacing.sm,
    // Matches Home's chooseStartHeader/recommendedHeader 'See all' link's own
    // paddingHorizontal (index.tsx's styles.seeAllButton, 8 === spacing.sm) -
    // without this the type label/See all text sit flush against the card's
    // now-rounded edges.
    paddingHorizontal: goldenTempleTheme.spacing.sm,
  },
  headerTypeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: goldenTempleTheme.colors.text.primary,
  },
  headerSeeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: goldenTempleTheme.colors.primary.DEFAULT,
  },
  contentArea: {
    overflow: 'hidden',
    backgroundColor: goldenTempleTheme.colors.muted[200],
    // Rounds only the thumbnail/media area - header/footer stay square,
    // since neither has a background fill to clash against (see the
    // investigation this session: partial rounding only reads cleanly when
    // the surrounding regions are transparent, which they are here).
    borderRadius: goldenTempleTheme.borderRadius.md,
  },
  audioFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: goldenTempleTheme.colors.primary[100],
  },
  muteButton: {
    position: 'absolute',
    top: goldenTempleTheme.spacing.md,
    right: goldenTempleTheme.spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioThumbnail: {
    position: 'absolute',
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: goldenTempleTheme.borderRadius.sm,
    overflow: 'hidden',
  },
  // top/left/width are all supplied per-render (audioThumbnailTop/Left,
  // audioControlsRowTop in the component body) - width matches
  // THUMBNAIL_SIZE exactly so the row's edges align with the thumbnail's,
  // not the card's.
  audioControlsRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  audioPlayPauseButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioCtaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    // Slightly taller than the original 10 - closer to (but still under)
    // audioPlayPauseButton's 48px, for a more balanced controls row.
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: goldenTempleTheme.borderRadius.full,
    backgroundColor: goldenTempleTheme.colors.primary.DEFAULT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  playIconNudge: {
    marginLeft: 3, // optically centers the play triangle within the circle
  },
  ctaPillWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: goldenTempleTheme.spacing.md,
    alignItems: 'center',
  },
  ctaPill: {
    width: '70%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: goldenTempleTheme.borderRadius.full,
    backgroundColor: goldenTempleTheme.colors.primary.DEFAULT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  ctaPillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: goldenTempleTheme.spacing.md,
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerActionCount: {
    color: goldenTempleTheme.colors.text.secondary,
    fontWeight: '600',
  },
});
