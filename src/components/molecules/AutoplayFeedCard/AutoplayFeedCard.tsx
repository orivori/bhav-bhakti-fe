import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Alert, Dimensions, Platform, Linking, AppState, ActivityIndicator } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/atoms';
import { Feed } from '@/types/feed';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { useI18nStore } from '@/shared/stores/i18nStore';
import { containsDevanagari } from '@/utils/textUtils';
import { feedService } from '@/features/feed/services/feedService';
import { useFeedStore } from '@/store/feedStore';
import { useSoundPreferenceStore } from '@/store/soundPreferenceStore';
import { usePremiumStore } from '@/store/premiumStore';
import { formatCount } from '@/utils/formatCount';
import { getMediaFileExtension } from '@/utils/getMediaFileExtension';
import { shareContent } from '@/utils/shareContent';
import { ensureMediaLibraryPermission } from '@/utils/mediaLibraryPermission';
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
// Header row's own footprint (added this session, above contentArea): text
// line height + 8px (styles.headerRow's marginBottom, spacing.sm). The text
// line height is NOT a fixed constant - both header texts go through the
// shared Text atom with no explicit lineHeight override, so they inherit its
// 'body' variant's lineHeight, which is 20 for plain text but jumps to 24 the
// moment the text is Devanagari (Text.tsx's hasHindiText branch, via
// getEnhancedLineHeight - see textUtils.ts). Now that the header row's own
// content (content-type label, "See all") is real translated text rather
// than always-hardcoded English, this can genuinely be either value
// depending on the active language - computed per-render in the component
// body below (see headerRowTextLineHeight) rather than hardcoded here, so it
// can't silently drift out of sync with the Text atom's own logic. Subtracted
// from contentAreaHeight below so adding the header didn't grow the card's
// total height (and shrink next-card-peek) - audio's ratio was tuned against
// the pre-header pixel budget, so this restores it exactly; visual's 16:9
// becomes a smaller, no-longer-exact ratio, an accepted trade-off (consistent
// peek across all card types over aspect-ratio purity - real content doesn't
// hit 16:9 exactly anyway).
const HEADER_ROW_TEXT_LINE_HEIGHT_EN = 20;
const HEADER_ROW_TEXT_LINE_HEIGHT_HI = 24;
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

// Fixed width for the audio row's CTA pill (Listen/Set as Ringtone) -
// derived once from the row's own fixed width (THUMBNAIL_SIZE), not left to
// grow/shrink with whatever ctaLabel text happens to be showing. 48 =
// audioPlayPauseButton's own fixed width; the remaining spacing.xs is the
// minimum breathing room kept between it and the pill (audioControlsRow's
// justifyContent: 'space-between' otherwise has nothing stopping the two
// from touching once the pill's width is no longer content-driven). Still
// screen-width-responsive like everything else on this card - only content
// (text length, language) is prevented from affecting it, per the pill's own
// styles below.
const AUDIO_CTA_PILL_WIDTH = THUMBNAIL_SIZE - 48 - goldenTempleTheme.spacing.xs;

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
// needs to change with it (including which directory it uses - both must
// agree, or the two screens silently stop sharing a cache hit).
// cacheDirectory, not documentDirectory - this is a re-downloadable playback
// cache, not permanent data; documentDirectory meant Android's "Clear Cache"
// had no effect on it and it accumulated forever. See cacheEviction.ts for
// the startup age-based sweep that now backstops this too.
const getLocalCachePath = (feedId: string, audioUri: string): string =>
  `${FileSystem.cacheDirectory}audio_player_${feedId}.${getAudioFileExtension(audioUri)}`;

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
  const { language } = useI18nStore();
  const { t } = useTranslation();
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

  // Header row (above the thumbnail): plain content-type identity, not an
  // action description - deliberately separate from the CTA pill's own
  // verb-based label ("Listen"/"Set as Ringtone"/"Set as Wallpaper" below),
  // which describes what tapping the pill does, not what this content is.
  // mantra/aarti/bhajan reuse the existing spiritual.* keys (exact wording
  // match, avoids a redundant duplicate string); ringtone/wallpaper/thought/
  // general have no existing singular equivalent, so those are new feedCard.*
  // keys.
  const contentTypeLabels: Record<Feed['type'], string> = {
    general: t('feedCard.typeGeneral'),
    mantra: t('spiritual.mantra'),
    ringtone: t('feedCard.typeRingtone'),
    wallpaper: t('feedCard.typeWallpaper'),
    aarti: t('spiritual.aarti'),
    bhajan: t('spiritual.bhajan'),
    thought: t('feedCard.typeThought'),
  };
  const contentTypeLabel = contentTypeLabels[feed.type];
  const seeAllTarget = SEE_ALL_TARGETS[feed.type];
  const handleSeeAllPress = () => {
    if (!seeAllTarget) return;
    // Cast needed: SEE_ALL_TARGETS is a plain lookup table, so its pathname
    // strings aren't narrowed to expo-router's generated typed-route union.
    router.push(seeAllTarget as any);
  };

  // See HEADER_ROW_TEXT_LINE_HEIGHT_EN/HI's comment above - derived from the
  // header row's own real (now-translated) text rather than assumed English,
  // so this can't drift out of sync with the Text atom's own Hindi-aware
  // line-height logic.
  const headerRowTextLineHeight = containsDevanagari(contentTypeLabel)
    ? HEADER_ROW_TEXT_LINE_HEIGHT_HI
    : HEADER_ROW_TEXT_LINE_HEIGHT_EN;
  const headerRowHeight = headerRowTextLineHeight + goldenTempleTheme.spacing.sm;

  const contentAreaHeight =
    (hasAudioMedia
      ? usableViewportHeight * AUDIO_CONTENT_HEIGHT_RATIO
      : CARD_WIDTH * VISUAL_ASPECT_RATIO) - headerRowHeight;

  // Audio only: the thumbnail is centered on its OWN (both axes) within
  // contentArea - NOT as part of a combined thumbnail+controls block. The
  // controls row just sits directly below wherever the thumbnail lands,
  // aligned to its left/right edges, uninvolved in the centering itself.
  // Computed here rather than in StyleSheet since contentAreaHeight is a
  // per-render value (driven by usableViewportHeight).
  const audioThumbnailTop = (contentAreaHeight - THUMBNAIL_SIZE) / 2;
  const audioThumbnailLeft = (CARD_WIDTH - THUMBNAIL_SIZE) / 2;
  const audioControlsRowTop = audioThumbnailTop + THUMBNAIL_SIZE + goldenTempleTheme.spacing.md;

  // --- Player leak fix ---
  // Previously useAudioPlayer(null) was called unconditionally for every
  // rendered card - including wallpaper/video-only cards with no audio at
  // all, and including cards that were merely mounted by FlatList's
  // windowing but never actually elected/relevant. Since (main) is a Tabs
  // group that never unmounts (CLAUDE.md §17) and FlatList's
  // initialNumToRender is 5, this created 5 real, never-released native
  // ExoPlayer instances on every app launch (confirmed via logcat), growing
  // further as the user scrolled and more cards entered the render window.
  // useAudioPlayer's useReleasingSharedObject DOES release the native
  // instance on unmount - the bug was never a missing release, it was
  // creating a player at all for cards that didn't need one yet. The real
  // fix is downstream: the player now lives in AudioPlaybackController
  // (below), only rendered when shouldMountAudioPlayer is true, so simply
  // not mounting it for an irrelevant card is what prevents the leak.
  //
  // "Relevant" is isActive (FeedList's viewport election - see FeedList.tsx)
  // OR userRequestedPlayback (a manual tap on this card's play button while
  // it wasn't the elected card - preserves the pre-existing manual-override
  // behavior documented below at AudioPlaybackController's own
  // handleToggleAudioPlayPause). Once set, userRequestedPlayback is
  // deliberately never reset back to false for the life of this component
  // instance - if a user explicitly asked a card to play, losing election a
  // moment later (e.g. scrolling half a card's height) shouldn't yank its
  // audio out from under it. This bounds the "extra" players to cards a user
  // actually interacted with, a small, user-driven set - nowhere near the
  // "every rendered card, unconditionally" scope of the original leak.
  const [userRequestedPlayback, setUserRequestedPlayback] = useState(false);
  const shouldMountAudioPlayer = hasAudioMedia && (isActive || userRequestedPlayback);
  // Separate from isEffectivelyActive above (which stays isActive-only,
  // still correct for video's shouldPlay) - audio's "should this actually be
  // playing" needs to fold in the manual-tap override too, or a manually
  // requested, non-elected card's player would mount but its own
  // isEffectivelyActive prop would read false and immediately deactivate
  // itself right back to paused, defeating the tap.
  const shouldPlayAudio = (isActive || userRequestedPlayback) && isScreenFocused && isAppActive;

  // Track a view/play once when audio genuinely becomes relevant for the
  // first time (elected OR manually tapped) - deliberately parent-owned and
  // decoupled from AudioPlaybackController's own mount/unmount, so losing
  // and regaining election within the same scroll session (which now
  // unmounts/remounts the player, see above) can't double-count a view.
  // Mirrors hasTrackedVisualViewRef below exactly, audio's counterpart.
  const hasTrackedAudioViewRef = useRef(false);
  useEffect(() => {
    if (!shouldMountAudioPlayer || hasTrackedAudioViewRef.current) return;
    hasTrackedAudioViewRef.current = true;
    feedService.viewFeed(feedIdStr).then(() => incrementView(feedIdStr)).catch((e) =>
      console.error('AutoplayFeedCard: view tracking error:', e)
    );
    feedService.playFeed(feedIdStr).catch((e) =>
      console.error('AutoplayFeedCard: play tracking error:', e)
    );
  }, [shouldMountAudioPlayer, feedIdStr, incrementView]);

  // Track a view once when visual (non-audio) content becomes active -
  // audio's own view tracking is the hasTrackedAudioViewRef effect above.
  const hasTrackedVisualViewRef = useRef(false);
  useEffect(() => {
    if (hasAudioMedia || !isActive || hasTrackedVisualViewRef.current) return;
    hasTrackedVisualViewRef.current = true;
    feedService.viewFeed(feedIdStr).then(() => incrementView(feedIdStr)).catch((e) =>
      console.error('AutoplayFeedCard: view tracking error:', e)
    );
  }, [hasAudioMedia, isActive, feedIdStr, incrementView]);

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
      Alert.alert(t('common.error'), t('feedCard.likeErrorMessage'));
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
        // encodeURIComponent: these Firebase Storage URLs already contain
        // their own legitimate %2F/%20 sequences - useLocalSearchParams() on
        // the receiving screen unconditionally decodeURIComponent's every
        // string param once on the way out, with no matching encode ever
        // applied on the way in, which silently corrupts the URL (%2F ->
        // literal /) without this - see CLAUDE.md's route-param URL
        // corruption investigation. Every other real entry point into
        // audio-player.tsx does the same encode at its own params site.
        audioUrl: encodeURIComponent(audioSourceUri || ''),
        thumbnailUrl: encodeURIComponent(audioMedia?.thumbnailUrl || ''),
        autoPlay: 'true',
        returnTo: '/(main)/',
      },
    });
  };

  const handleSetAsWallpaperPress = async () => {
    if (isSettingWallpaper || !visualMedia?.mediaUrl) return;
    if (isMountedRef.current) setIsSettingWallpaper(true);
    try {
      const hasPermission = await ensureMediaLibraryPermission('common.permissionReasonSetWallpaper');
      if (!hasPermission) {
        return;
      }
      const extension = getMediaFileExtension(visualMedia.mediaUrl, visualMedia.type);
      // Timestamp suffix guarantees a unique local path on every attempt -
      // see useWallpaperActions.ts's handleDownload for the full explanation
      // (MediaStore's own collision handling otherwise silently reused an
      // existing gallery entry for a repeated deterministic filename).
      // cacheDirectory, not documentDirectory - staging copy on its way into
      // MediaLibrary, deleted right after on success below; cacheDirectory
      // means a failed/skipped delete doesn't leak into persistent storage
      // forever. See cacheEviction.ts for the startup age-based sweep.
      const fileUri = `${FileSystem.cacheDirectory}autoplay_visual_${feed.id}_${Date.now()}.${extension}`;
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
        Alert.alert(t('feedCard.wallpaperSavedTitle'), t('feedCard.wallpaperSavedMessage'));
        await feedService.downloadFeed(feedIdStr);
        incrementDownload(feedIdStr);
      }
    } catch (error) {
      console.error('AutoplayFeedCard: error saving wallpaper:', error);
      Alert.alert(t('common.error'), t('feedCard.wallpaperErrorMessage'));
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
      const hasPermission = await ensureMediaLibraryPermission('common.permissionReasonSetRingtone');
      if (!hasPermission) {
        return;
      }

      const localUri = await ensureLocalAudioFile();

      if (Platform.OS === 'android') {
        try {
          await MediaLibrary.saveToLibraryAsync(localUri);
          Alert.alert(
            t('feedCard.ringtoneSavedTitle'),
            t('feedCard.ringtoneSavedMessageAndroid'),
            [
              { text: t('feedCard.openSoundSettings'), onPress: () => Linking.openSettings() },
              { text: t('feedCard.ok'), style: 'default' },
            ]
          );
        } catch (mediaError) {
          console.log('AutoplayFeedCard: could not save to media library, file is still downloaded:', mediaError);
          Alert.alert(
            t('feedCard.ringtoneDownloadedTitle'),
            t('feedCard.ringtoneDownloadedMessageAndroid'),
            [
              { text: t('feedCard.openSoundSettings'), onPress: () => Linking.openSettings() },
              { text: t('feedCard.ok'), style: 'default' },
            ]
          );
        }
      } else if (Platform.OS === 'ios') {
        try {
          await MediaLibrary.saveToLibraryAsync(localUri);
          Alert.alert(
            t('feedCard.ringtoneSavedTitle'),
            t('feedCard.ringtoneSavedMessageIos'),
            [
              { text: t('common.openSettings'), onPress: () => Linking.openSettings() },
              { text: t('feedCard.ok'), style: 'default' },
            ]
          );
        } catch (mediaError) {
          console.log('AutoplayFeedCard: MediaLibrary does not support this audio format on iOS:', mediaError);
          Alert.alert(
            t('feedCard.ringtoneDownloadedTitle'),
            t('feedCard.ringtoneDownloadedMessageIos'),
            [
              { text: t('common.openSettings'), onPress: () => Linking.openSettings() },
              { text: t('feedCard.gotIt'), style: 'default' },
            ]
          );
        }
      }
    } catch (error) {
      console.error('AutoplayFeedCard: error setting ringtone:', error);
      Alert.alert(t('common.error'), t('feedCard.ringtoneErrorMessage'));
    } finally {
      if (isMountedRef.current) setIsSettingRingtone(false);
    }
  };

  const showPaywallPlaceholder = () => {
    // TEMPORARY/PLACEHOLDER - stands in for the real paywall/upsell screen.
    Alert.alert(t('feedCard.premiumFeatureTitle'), t('feedCard.premiumFeatureMessage'));
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
      ? (isSettingRingtone ? t('feedCard.settingRingtone') : t('feedCard.setAsRingtone'))
      : t('feedCard.listen')
    : (isSettingWallpaper ? t('feedCard.savingWallpaper') : t('feedCard.setAsWallpaper'));

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
            <Text style={styles.headerSeeAllText}>{t('chooseStart.seeAll')}</Text>
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
              {/* The real player only exists once this card is genuinely
                  relevant (see shouldMountAudioPlayer above) - until then this
                  renders a static, tappable Play affordance that requests
                  playback (mounting AudioPlaybackController) rather than
                  eagerly holding a native player instance no one asked for. */}
              {shouldMountAudioPlayer ? (
                <AudioPlaybackController
                  feedIdStr={feedIdStr}
                  audioSourceUri={audioSourceUri}
                  isEffectivelyActive={shouldPlayAudio}
                />
              ) : (
                <TouchableOpacity
                  style={styles.audioPlayPauseButton}
                  onPress={() => setUserRequestedPlayback(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="play" size={26} color="#fff" style={styles.playIconNudge} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.audioCtaPill}
                onPress={handleCtaPress}
                disabled={ctaDisabled}
                activeOpacity={0.85}
              >
                <Ionicons name={ctaIcon} size={14} color="#fff" />
                {/* numberOfLines={1} - a fixed-width pill with variable text
                    (English vs. Hindi, or a longer future translation) must
                    truncate rather than wrap/grow. Belt-and-suspenders with
                    ctaPillText's own sizing below, which is chosen to fit the
                    known real strings without this ever actually kicking in
                    under normal use. */}
                <Text style={styles.ctaPillText} numberOfLines={1}>{ctaLabel}</Text>
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
                <Ionicons name={ctaIcon} size={14} color="#fff" />
              )}
              <Text style={styles.ctaPillText} numberOfLines={1}>{ctaLabel}</Text>
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

interface AudioPlaybackControllerProps {
  feedIdStr: string;
  audioSourceUri: string | undefined;
  isEffectivelyActive: boolean;
}

// Owns the actual native player - only ever rendered by the parent while
// shouldMountAudioPlayer is true (see the comment there for the full leak
// fix). useAudioPlayer's useReleasingSharedObject already releases the
// native instance automatically on unmount, so simply not rendering this
// component when the card is irrelevant is the entire fix - no manual
// release() call is needed here.
function AudioPlaybackController({ feedIdStr, audioSourceUri, isEffectivelyActive }: AudioPlaybackControllerProps) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const hasLoadedSourceRef = useRef(false);

  useEffect(() => {
    if (!audioSourceUri) return;
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
  }, [isEffectivelyActive, audioSourceUri, feedIdStr, player]);

  // Shared with handleToggleAudioPlayPause below - both need the exact same
  // "has this track reached its cap" definition, kept as one function so
  // the two can't drift apart.
  const getPlaybackCapSeconds = () =>
    status.duration > 0 ? Math.min(AUDIO_PLAYBACK_CAP_SECONDS, status.duration) : AUDIO_PLAYBACK_CAP_SECONDS;

  // 30s-or-natural-length cap - pauses, no further prompt (the CTA pill
  // already covers "want more").
  useEffect(() => {
    if (!isEffectivelyActive || !status.playing) return;
    if (status.currentTime >= getPlaybackCapSeconds()) {
      try {
        player.pause();
      } catch (error) {
        console.error('AutoplayFeedCard: error pausing at playback cap:', error);
      }
    }
  }, [status.currentTime, status.playing, status.duration, isEffectivelyActive, player]);

  // Defensive - this component now mounts/unmounts exactly as often as it
  // becomes relevant/irrelevant (see shouldMountAudioPlayer in the parent).
  // player.isLoaded read is guarded the same way RingtoneFeedCard's unmount
  // cleanup guards it: by the time this runs, useAudioPlayer's own internal
  // release may have already fired (React runs effect cleanups in
  // declaration order), so merely reading player.isLoaded can throw
  // "already released."
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

  return (
    <TouchableOpacity style={styles.audioPlayPauseButton} onPress={handleToggleAudioPlayPause} activeOpacity={0.8}>
      <Ionicons
        name={status.playing ? 'pause' : 'play'}
        size={26}
        color="#fff"
        style={status.playing ? undefined : styles.playIconNudge}
      />
    </TouchableOpacity>
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
  // CLAUDE.md real root cause (adb-confirmed): "सभी देखें" was measuring to
  // a box only wide enough for "सभी" - the earlier textAlignVertical-only
  // change here did NOT fix it (same clipped-second-word signature as Up
  // Next/Logout before their own width fixes). minWidth applies the same
  // proven fix, sized modestly for this row (headerRow has ~344dp available,
  // shared with headerTypeLabel on the left with plenty of gap to spare -
  // no risk of collision).
  // textAlign is 'right', not 'center' - this Text sits as the LAST child of
  // a space-between row, so its box's right edge is already flush with the
  // row's right boundary regardless of width. Centering the glyphs inside a
  // wider-than-needed box would leave visible blank space to their right,
  // making the link appear to float away from the edge instead of sitting
  // flush the way the (broken, narrower) "सभी"-only render used to. Right-
  // aligning keeps the visible text hugging that same edge; the extra
  // minWidth padding is invisibly absorbed on the left instead, which only
  // eats into the harmless gap toward headerTypeLabel.
  headerSeeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: goldenTempleTheme.colors.primary.DEFAULT,
    textAlignVertical: 'auto',
    minWidth: 100,
    textAlign: 'right',
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
    gap: 4,
    // Slightly taller than the original 10 - closer to (but still under)
    // audioPlayPauseButton's 48px, for a more balanced controls row.
    paddingVertical: 12,
    // Reduced from 20 - a fixed-width pill needs more of its own width left
    // over for the icon+text, not eaten by padding on both sides.
    paddingHorizontal: 8,
    // Fixed, not content-driven - see AUDIO_CTA_PILL_WIDTH's own comment
    // above. This is the actual fix for the pill growing/shrinking with
    // whatever ctaLabel text was showing (English "Listen" vs. Hindi
    // "रिंगटोन सेट करें" vs. "Setting..." all used to produce visibly
    // different pill widths/positions in the same row).
    width: AUDIO_CTA_PILL_WIDTH,
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
    // Already fixed/content-independent (a percentage of this pill's own
    // parent, ctaPillWrapper - not of the text inside it), unlike
    // audioCtaPill above before its fix. gap matched to audioCtaPill's for
    // visual consistency between the two CTA pill variants.
    width: '70%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
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
    // Reduced from 13 so the longest real CTA string (English "Set as
    // Ringtone" / Hindi "रिंगटोन सेट करें") comfortably fits inside
    // audioCtaPill's fixed width - see AUDIO_CTA_PILL_WIDTH's comment.
    // Reasoned through width math against a typical device's THUMBNAIL_SIZE,
    // not yet confirmed on a real device; numberOfLines={1} at each usage
    // site is the safety net (ellipsis) if a specific device ever comes up
    // short.
    fontSize: 11,
    // Explicit, NOT left to the shared Text atom's default 'body' variant
    // lineHeight - that default is dynamic (20 for plain text, but jumps to
    // 24 for any Devanagari text via the atom's Hindi-aware
    // getEnhancedLineHeight path, meant for multi-line headings with matras
    // headroom - see Text.tsx). Left unset, this pill's own height would
    // genuinely differ between English and Hindi even with a fixed width -
    // pinning it here is what makes the pill "fixed size/shape regardless of
    // language," not just regardless of text length.
    lineHeight: 14,
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
