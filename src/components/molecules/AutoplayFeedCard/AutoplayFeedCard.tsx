import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Alert, Share, Dimensions, Platform, Linking } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/atoms';
import { Feed, FeedMedia } from '@/types/feed';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { useTranslation } from '@/hooks/useTranslation';
import { feedService } from '@/features/feed/services/feedService';
import { useFeedStore } from '@/store/feedStore';
import { useSoundPreferenceStore } from '@/store/soundPreferenceStore';
import { formatCount } from '@/utils/formatCount';

interface AutoplayFeedCardProps {
  feed: Feed;
  isActive: boolean;
}

// --- Sizing (Phase 3, reworked) ---
const AUDIO_CONTENT_HEIGHT_RATIO = 0.88; // of the usable viewport
const VISUAL_ASPECT_RATIO = 16 / 9; // height = width * this, for wallpaper/thought/video
const FOOTER_HEIGHT = 56;

// --- Playback ---
const AUDIO_PLAYBACK_CAP_SECONDS = 30;

// TEMPORARY/PLACEHOLDER - there is no real entitlement/paywall system
// anywhere in this app yet. This hardcoded flag is a clearly-marked seam so
// the real paywall check can be wired in here later without touching this
// card (or its callers) again. Do not read this constant from anywhere else.
const isPremiumUser = false;

const { width: screenWidth, height: windowHeight } = Dimensions.get('window');
// All cards (audio and visual alike) now share the same horizontal gutter -
// wallpaper/video cards are no longer full-bleed. This also feeds the 16:9
// height math below, so visual cards are proportionally shorter than before
// (a direct, intended side effect: better "next card peeks" behavior).
const CARD_WIDTH = screenWidth - goldenTempleTheme.spacing.md * 2;

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

// Top-left overlay is a per-TYPE descriptor (informational, "plain text not a
// button"). Now that the CTA pill also branches ringtone vs. other-audio
// (see ctaLabel below), this label and the pill text agree for every type.
const getTypeMeta = (
  feed: Feed,
  hasAudioMedia: boolean,
  visualMediaType: FeedMedia['type'] | undefined
): { icon: keyof typeof Ionicons.glyphMap; label: string } => {
  if (hasAudioMedia) {
    return feed.type === 'ringtone'
      ? { icon: 'notifications-outline', label: 'Set as Ringtone' }
      : { icon: 'musical-notes-outline', label: 'Listen' };
  }
  if (visualMediaType === 'video') {
    return { icon: 'videocam-outline', label: 'Video' };
  }
  if (feed.type === 'thought') {
    return { icon: 'chatbox-ellipses-outline', label: 'Thought' };
  }
  return { icon: 'image-outline', label: 'Wallpaper' };
};

/**
 * Phase 4: real content. Own isolated player (no playbackStore involvement,
 * per CLAUDE.md §29), content-type-aware playback, real action row.
 */
export default function AutoplayFeedCard({ feed, isActive }: AutoplayFeedCardProps) {
  const { language } = useTranslation();
  const insets = useSafeAreaInsets();
  const { tabBarHeight } = useTabBarHeight();
  const { toggleLike, incrementDownload, incrementShare, incrementView } = useFeedStore();
  const isVideoMuted = useSoundPreferenceStore((s) => s.isVideoMuted);
  const setVideoMuted = useSoundPreferenceStore((s) => s.setVideoMuted);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
  const typeMeta = getTypeMeta(feed, hasAudioMedia, hasAudioMedia ? undefined : visualMedia?.type);

  const contentAreaHeight = hasAudioMedia
    ? usableViewportHeight * AUDIO_CONTENT_HEIGHT_RATIO
    : CARD_WIDTH * VISUAL_ASPECT_RATIO;

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

    if (isActive) {
      activate();
    } else {
      deactivate();
    }

    return () => {
      isEffectCurrent = false;
    };
  }, [isActive, hasAudioMedia, audioSourceUri, feedIdStr, player, incrementView]);

  // 30s-or-natural-length cap, audio only - pauses, no further prompt (the
  // CTA pill already covers "want more").
  useEffect(() => {
    if (!hasAudioMedia || !isActive || !status.playing) return;
    const cap = status.duration > 0 ? Math.min(AUDIO_PLAYBACK_CAP_SECONDS, status.duration) : AUDIO_PLAYBACK_CAP_SECONDS;
    if (status.currentTime >= cap) {
      try {
        player.pause();
      } catch (error) {
        console.error('AutoplayFeedCard: error pausing at playback cap:', error);
      }
    }
  }, [status.currentTime, status.playing, status.duration, hasAudioMedia, isActive, player]);

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

  // Manual play/pause tap, independent of the isActive-driven autoplay effect
  // above - since neither `isActive` nor any of that effect's other deps
  // change when the user taps this, the effect never refires and doesn't
  // fight this. Scrolling away and back still resets to 0 and autoplays
  // again as before (unrelated to this manual override).
  const handleToggleAudioPlayPause = () => {
    try {
      if (status.playing) {
        player.pause();
      } else {
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

  const handleShare = async () => {
    try {
      await feedService.shareFeed(feedIdStr, { platform: 'native_share' });
      incrementShare(feedIdStr);
      const shareUrl = hasAudioMedia ? audioSourceUri : visualMedia?.mediaUrl;
      await Share.share({
        message: `Check out this: ${title}\n\nShared from Bhav Bhakti App`,
        url: shareUrl,
      });
    } catch (error) {
      console.error('AutoplayFeedCard: error sharing feed:', error);
      Alert.alert('Error', 'Failed to share. Please try again.');
    }
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
      const fileUri = `${FileSystem.documentDirectory}autoplay_visual_${feed.id}.jpg`;
      const downloadResult = await FileSystem.downloadAsync(visualMedia.mediaUrl, fileUri);
      if (downloadResult.status === 200) {
        await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
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
      <View style={[styles.contentArea, { height: contentAreaHeight }]}>
        {hasAudioMedia ? (
          audioMedia?.thumbnailUrl ? (
            <Image source={{ uri: audioMedia.thumbnailUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.audioFallback]}>
              <Ionicons name="musical-notes" size={48} color={goldenTempleTheme.colors.primary.DEFAULT} />
            </View>
          )
        ) : visualMedia?.type === 'video' ? (
          <Video
            source={{ uri: visualMedia.mediaUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.COVER}
            isLooping
            shouldPlay={isActive}
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

        {/* Top-left overlay: plain text, not a button */}
        <View style={styles.topLeftOverlay} pointerEvents="none">
          <View style={styles.typeRow}>
            <View style={styles.typeIconCircle}>
              <Ionicons name={typeMeta.icon} size={14} color="#fff" />
            </View>
            <Text style={styles.typeLabel}>{typeMeta.label}</Text>
          </View>
          <Text style={styles.titleText} numberOfLines={1}>
            {title}
          </Text>
        </View>

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

        {/* Play/pause overlay - audio content only. Manual override on top of
            the isActive-driven autoplay, per handleToggleAudioPlayPause above. */}
        {hasAudioMedia && (
          <TouchableOpacity
            style={styles.playPauseOverlay}
            onPress={handleToggleAudioPlayPause}
            activeOpacity={0.8}
          >
            <Ionicons
              name={status.playing ? 'pause' : 'play'}
              size={32}
              color="#fff"
              style={status.playing ? undefined : styles.playIconNudge}
            />
          </TouchableOpacity>
        )}

        {/* CTA pill - centered, ~70% of card width, same styling across all
            three variants (Listen / Set as Ringtone / Set as Wallpaper) */}
        <View style={styles.ctaPillWrapper} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.ctaPill}
            onPress={handleCtaPress}
            disabled={ctaDisabled}
            activeOpacity={0.85}
          >
            <Ionicons name={ctaIcon} size={16} color="#fff" />
            <Text style={styles.ctaPillText}>{ctaLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.footer, { height: FOOTER_HEIGHT }]}>
        <TouchableOpacity style={styles.footerAction} onPress={handleLike} activeOpacity={0.7}>
          <Ionicons
            name={localIsLiked ? 'heart' : 'heart-outline'}
            size={24}
            color={localIsLiked ? '#FF4444' : goldenTempleTheme.colors.text.secondary}
          />
          {localLikesCount > 0 && (
            <Text variant="caption" style={styles.footerActionCount}>
              {formatCount(localLikesCount)}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.footerAction} onPress={handleShare} activeOpacity={0.7}>
          <Ionicons name="share-social-outline" size={22} color={goldenTempleTheme.colors.text.secondary} />
          {feed.sharesCount > 0 && (
            <Text variant="caption" style={styles.footerActionCount}>
              {formatCount(feed.sharesCount)}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.footerAction}>
          <Ionicons name="eye-outline" size={20} color={goldenTempleTheme.colors.text.muted} />
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
    marginHorizontal: goldenTempleTheme.spacing.md,
  },
  contentArea: {
    overflow: 'hidden',
    backgroundColor: goldenTempleTheme.colors.muted[200],
  },
  audioFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: goldenTempleTheme.colors.primary[100],
  },
  topLeftOverlay: {
    position: 'absolute',
    top: goldenTempleTheme.spacing.md,
    left: goldenTempleTheme.spacing.md,
    maxWidth: '65%',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  typeIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  titleText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '400',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
  playPauseOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -30,
    marginLeft: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
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
