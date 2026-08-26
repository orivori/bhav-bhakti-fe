import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
  Linking,
  Dimensions,
  AppState} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import WhatsAppIcon from '../../../../assets/icons/whatsapp.svg';

const { width } = Dimensions.get('window');
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as IntentLauncher from 'expo-intent-launcher';
// Removed expo-intent-launcher dependency for smaller bundle size
import { ensureMediaLibraryPermission } from '@/utils/mediaLibraryPermission';
import { Text } from '@/components/atoms';
import { Feed } from '@/types/feed';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { feedService } from '@/features/feed/services/feedService';
import { useFeedStore } from '@/store/feedStore';
import { usePlaybackStore } from '@/store/playbackStore';
import { useI18nStore } from '@/shared/stores/i18nStore';

// Module-scope (not component state) so it's shared across every rendered
// RingtoneFeedCard instance and reachable from every place playback for a
// given cached file can stop: handlePlayPause's own pause branch, the
// registered playback-coordinator stop/pause closures (called externally -
// by ringtones.tsx's sub-tab-switch stop effect, and by this card's own
// useFocusEffect blur cleanup when it's the currently-registered ephemeral
// item), the AppState backgrounding handler, and the unmount cleanup. Keyed
// by the target cache file path (localFileUri) - this component's existing
// per-item key, same as ensureLocalFile below already uses. A plain
// DownloadResumable handle is stored (not just a boolean) specifically so
// any of those call sites can cancel it. Mirrors the identical pattern in
// app/(main)/audio-player.tsx.
const inFlightBackgroundDownloads = new Map<string, FileSystem.DownloadResumable>();

// Fire-and-forget: downloads to the local cache without blocking playback,
// called on a cache miss right after playback has already started from the
// remote URL. Deliberately never touches a player instance - it only writes
// to the filesystem, so it has no exposure to the "shared object already
// released" crash class and can safely keep running (or be cancelled and
// clean up) even after the card that triggered it unmounts. This is new
// code, unlike the pre-existing ensureLocalFile below (left untouched for
// handleSetRingtone), so unlike that function it cleans up a
// failed download's partial file itself rather than leaving it in place.
const downloadRingtoneInBackground = (cacheKey: string, audioUri: string): void => {
  if (inFlightBackgroundDownloads.has(cacheKey)) {
    return;
  }

  console.log('⬇️ Background ringtone download starting:', cacheKey);
  const resumable = FileSystem.createDownloadResumable(audioUri, cacheKey);
  inFlightBackgroundDownloads.set(cacheKey, resumable);

  resumable
    .downloadAsync()
    .then((result) => {
      // A cancelled resumable download resolves to `undefined` rather than
      // rejecting (confirmed in expo-file-system's own types) -
      // cancelBackgroundDownload below handles cleanup for that case, so
      // there's nothing further to do here.
      if (!result) {
        console.log('⏹️ Background ringtone download cancelled:', cacheKey);
        return;
      }
      if (result.status !== 200) {
        throw new Error(`Download failed with status ${result.status}`);
      }
      console.log('✅ Background ringtone download complete:', cacheKey);
    })
    .catch((error) => {
      console.error('Background ringtone download failed:', cacheKey, error);
      FileSystem.deleteAsync(cacheKey, { idempotent: true }).catch((cleanupError) => {
        console.error('Error cleaning up partial ringtone download:', cleanupError);
      });
    })
    .finally(() => {
      inFlightBackgroundDownloads.delete(cacheKey);
    });
};

// Cancels an in-flight background cache download for this cache path, if
// any, and deletes the partial file it left behind - cancelAsync() only
// stops the native transfer, it doesn't clean up (DownloadResumable is
// designed around pause/resume, where keeping the partial file is the whole
// point, but a genuine cancel here means "stop spending bandwidth on this,"
// not "pause for later"). Mirrors the identical function in
// app/(main)/audio-player.tsx.
const cancelBackgroundDownload = (cacheKey: string): void => {
  const resumable = inFlightBackgroundDownloads.get(cacheKey);
  if (!resumable) return;

  inFlightBackgroundDownloads.delete(cacheKey);
  resumable
    .cancelAsync()
    .catch((error) => console.error('Error cancelling background ringtone download:', error))
    .finally(() => {
      FileSystem.deleteAsync(resumable.fileUri, { idempotent: true }).catch((cleanupError) => {
        console.error('Error cleaning up cancelled partial ringtone download:', cleanupError);
      });
    });
};

interface RingtoneFeedCardProps {
  feed: Feed;
  onLike?: (feedId: string) => void;
  onShare?: (feedId: string) => void;
}

export default function RingtoneFeedCard({
  feed,
  onLike,
  onShare,
}: RingtoneFeedCardProps) {
  const { language } = useI18nStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingRingtone, setIsSettingRingtone] = useState(false);

  // Player is created once (with no source) for this card's lifetime and
  // released automatically on unmount by the hook itself. The real source is
  // only loaded via player.replace() on the first play tap, preserving the
  // previous lazy-load-on-tap behavior (createAsync was never called until
  // the user pressed play) instead of eagerly loading audio for every card
  // as soon as the list renders.
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  // Local state for like management
  const [localIsLiked, setLocalIsLiked] = useState(feed.isLiked);
  const [localLikesCount, setLocalLikesCount] = useState(feed.likesCount);

  // Sync local state with feed prop changes
  useEffect(() => {
    setLocalIsLiked(feed.isLiked);
    setLocalLikesCount(feed.likesCount);
  }, [feed.isLiked, feed.likesCount]);

  const { toggleLike, incrementShare, incrementView } = useFeedStore();

  // Get the main audio media - optional-chained since some sources (e.g.
  // getUserLikedFeeds, before its own fix) can omit `media` entirely; a
  // missing/empty array now degrades to no playable source instead of
  // throwing during render.
  const audioMedia = feed.media?.find(m => m.type === 'audio') || feed.media?.[0];
  const audioSourceUri = audioMedia?.audioUrl || audioMedia?.mediaUrl;

  // One stable, predictable local filename per ringtone - derived from the
  // title, not the feed ID/a timestamp - so playback caching, download, and
  // set-as-ringtone all resolve to and share the exact same cached file.
  const sanitizeForFilename = (text: string): string =>
    text
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\p{L}\p{N}_]/gu, '');

  const getAudioFileExtension = (audioUri: string): string => {
    const pathWithoutQuery = audioUri.split('?')[0];
    const urlParts = pathWithoutQuery.split('.');
    const extension = urlParts.length > 1 ? urlParts[urlParts.length - 1].toLowerCase() : 'mp3';
    const supportedExtensions = ['mp3', 'wav', 'aac', 'm4a', 'ogg'];
    return supportedExtensions.includes(extension) ? extension : 'mp3';
  };

  const rawTitle = feed.title?.en || Object.values(feed.title || {}).find(Boolean) || '';
  const sanitizedTitle = sanitizeForFilename(rawTitle);
  const localFileName = `${sanitizedTitle || `ringtone_${feed.id}`}.${
    audioSourceUri ? getAudioFileExtension(audioSourceUri) : 'mp3'
  }`;
  const localFileUri = FileSystem.documentDirectory + localFileName;

  // Returns the local cached copy of this ringtone, downloading it once if
  // it isn't already on disk. Used by handleSetRingtone, which genuinely
  // needs a completed local file to hand to MediaLibrary - handlePlayPause
  // no longer routes through this (see getCachedRingtoneUri and
  // downloadRingtoneInBackground above instead), since playback itself
  // shouldn't block on a full download.
  //
  // Known gap, deliberately deferred: no concurrency guard against this
  // racing Play's own background download (both can pass the getInfoAsync
  // check and independently downloadAsync to the same path before either
  // finishes). Low real-world risk (worst case is a harmless redundant
  // download, not corruption) - Play's own download is tracked in
  // inFlightBackgroundDownloads above and cancellable, but this function
  // doesn't check that map before starting its own download.
  const ensureLocalFile = async (): Promise<string> => {
    const fileInfo = await FileSystem.getInfoAsync(localFileUri);
    if (fileInfo.exists) {
      console.log('📦 Using cached ringtone file:', localFileUri);
      return localFileUri;
    }

    if (!audioSourceUri) {
      throw new Error('No audio file found for this ringtone.');
    }

    console.log('⬇️ No cached file found, downloading to:', localFileUri);
    const downloadResult = await FileSystem.downloadAsync(audioSourceUri, localFileUri);
    if (downloadResult.status !== 200) {
      throw new Error(`Download failed with status ${downloadResult.status}`);
    }
    return downloadResult.uri;
  };

  // Fast, local-only check - no network involved. Returns the cached URI if
  // this ringtone's audio is already on disk, or null on a cache miss. Used
  // by handlePlayPause so a miss can fall straight through to streaming the
  // remote URL instead of blocking playback on a download - matches the
  // identical restructure applied to app/(main)/audio-player.tsx.
  const getCachedRingtoneUri = async (): Promise<string | null> => {
    const fileInfo = await FileSystem.getInfoAsync(localFileUri);
    if (fileInfo.exists) {
      console.log('📦 Using cached ringtone file:', localFileUri);
      return localFileUri;
    }
    return null;
  };

  // Fire clearNowPlaying if this card had a source loaded when it unmounts,
  // so the shared playback store doesn't keep pointing at a gone card.
  // player.isLoaded is a live property on the persistent player instance
  // (not a snapshot), so reading it inside the cleanup always reflects the
  // latest state at actual unmount time. The player itself needs no manual
  // unload/release here - useAudioPlayer disposes it automatically. Audio
  // session mode (background playback, ducking, etc.) is configured once,
  // app-wide, in app/_layout.tsx - this component intentionally does not
  // call setAudioModeAsync, since that would overwrite the shared session
  // for the whole app.
  //
  // Defensive try/catch, not just belt-and-suspenders: useAudioPlayer's own
  // internal cleanup (expo-modules-core's useReleasingSharedObject, wired up
  // via a useEffect declared earlier in this component, at the top of the
  // file) runs its release() BEFORE this cleanup fires - React runs effect
  // cleanups in the same order the effects were declared, and useAudioPlayer
  // is called above this effect. So by the time this cleanup runs, `player`
  // is already a released native shared object, and merely reading
  // player.isLoaded throws "Cannot use shared object that was already
  // released" (it's a native-bridged getter, not a plain JS property - there
  // is no separate isValid/isReleased flag to pre-check with). This was
  // always latently possible but never actually fired in practice while
  // Ringtones was a whole screen (Tabs don't unmount inactive screens, so
  // cards never unmounted this way) - the Audio hub's sub-tab switch is the
  // first code path that unmounts every rendered card at once, on demand.
  useEffect(() => {
    return () => {
      try {
        if (player.isLoaded) {
          usePlaybackStore.getState().clearNowPlaying(feed.id.toString());
        }
      } catch (error) {
        console.error('Error checking player state during unmount cleanup (player likely already released):', error);
      }
      // Unlike the player.isLoaded check above, this never touches the
      // native player - only the filesystem - so it's safe to call
      // regardless of whether that check threw.
      cancelBackgroundDownload(localFileUri);
    };
  }, [player, feed.id, localFileUri]);

  // Reset to 0 on natural end-of-track. Unlike expo-av, expo-audio does not
  // auto-rewind position when playback finishes - didJustFinish only flips
  // true for one status tick, so this only fires once per completed play.
  useEffect(() => {
    if (status.didJustFinish) {
      console.log('🏁 Audio finished playing');
      player.seekTo(0);
      usePlaybackStore.getState().clearNowPlaying(feed.id.toString());
    }
  }, [status.didJustFinish, player, feed.id]);

  // Stop this ringtone if the app is backgrounded/inactive while it's
  // playing. The app-wide session is configured to survive backgrounding
  // (for future long-form content), so without this, a playing ringtone
  // would keep going after the phone is locked or the user switches apps.
  // Scoped to only subscribe while THIS card is actually playing, so idle
  // cards in the list never hold an AppState listener.
  useEffect(() => {
    if (!status.playing) {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState !== 'active') {
        console.log('📵 App backgrounded/inactive, stopping ringtone playback...');
        player.pause();
        player.seekTo(0);
        usePlaybackStore.getState().clearNowPlaying(feed.id.toString());
        cancelBackgroundDownload(localFileUri);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [status.playing, player, feed.id, localFileUri]);

  // Stop this ringtone if the screen it's rendered on loses focus via
  // in-app tab navigation (e.g. Home -> Mantra, or the Ringtones tab
  // itself -> anywhere else). useFocusEffect works based on the nearest
  // focused-screen ancestor, so this fires correctly no matter which screen
  // renders this card - previously this lived only in ringtones.tsx's own
  // useFocusEffect, so Home/Search Results instances of this card never got
  // it, which was the actual bug. Guarded to only stop THIS card if it's
  // genuinely the one currently registered in the store's ephemeral slot -
  // idle cards in a list all run this hook too, but only the one matching
  // feedId (if any) ever actually calls stop(). Does not fire on OS-level
  // backgrounding - the AppState effect above already covers that.
  //
  // Also fires on plain unmount, not just navigator blur - react-navigation's
  // useFocusEffect runs its last-returned cleanup when ITS OWN outer effect
  // unmounts too (see its source), not only on a 'blur' event. So this hits
  // the exact same released-player hazard as the cleanup above: if this card
  // is the currently-playing ephemeral item at the moment of a mass unmount
  // (e.g. switching away from the Ringtones sub-tab mid-playback),
  // ephemeral.controls.stop() below calls player.pause()/seekTo() on a
  // player useAudioPlayer's own cleanup has already released. Same
  // defensive try/catch for the same reason.
  useFocusEffect(
    useCallback(() => {
      return () => {
        try {
          const { ephemeral } = usePlaybackStore.getState();
          if (ephemeral?.nowPlaying.feedId === feed.id.toString()) {
            ephemeral.controls.stop();
            usePlaybackStore.getState().clearNowPlaying(feed.id.toString());
          }
        } catch (error) {
          console.error('Error stopping ringtone during unmount cleanup (player likely already released):', error);
        }
      };
    }, [feed.id])
  );

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCount = (count: number) => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
  };

  // Registers this ringtone as the app-wide "now playing" item, purely for
  // cross-screen exclusivity (a mantra/aarti/bhajan playing elsewhere must
  // stop, and vice versa) - mode: 'ephemeral' means the shared mini-player
  // will never render this, per its own render-condition check.
  const registerRingtonePlayback = () => {
    const title = feed.title ? (feed.title[language] || feed.title.en || 'Untitled Ringtone') : 'Untitled Ringtone';

    usePlaybackStore.getState().registerPlaybackStart(
      {
        feedId: feed.id.toString(),
        type: feed.type,
        mode: 'ephemeral',
        title,
        thumbnailUrl: audioMedia?.thumbnailUrl ?? undefined,
      },
      {
        isPlaying: true,
        positionSeconds: 0,
        durationSeconds: audioMedia?.duration || 0,
      },
      {
        // stop/pause below are also called externally (e.g. ringtones.tsx's
        // sub-tab-switch stop effect, and this card's own useFocusEffect
        // blur cleanup when it's the currently-registered ephemeral item),
        // not just from this card's own handlePlayPause - cancelling any
        // in-flight background cache download has to live here too, since
        // the user leaving/switching away is exactly as much "not actively
        // interested right now" as pausing from this card directly.
        stop: () => {
          player.pause();
          player.seekTo(0);
          cancelBackgroundDownload(localFileUri);
        },
        pause: () => {
          player.pause();
          cancelBackgroundDownload(localFileUri);
        },
        resume: () => player.play(),
        seekTo: (seconds: number) => {
          player.seekTo(seconds);
        },
      }
    );
  };

  const handlePlayPause = async () => {
    console.log('🎵 Play/Pause button pressed, isPlaying:', status.playing, 'loaded:', status.isLoaded);

    try {
      if (status.isLoaded) {
        if (status.playing) {
          console.log('⏸️ Pausing audio, resetting position...');
          // pause + explicit seekTo(0) (expo-audio has no stopAsync, and
          // unlike expo-av it doesn't auto-rewind) so this behaves as a
          // quick-preview list, not a resumable player: re-pressing play
          // after a manual pause starts from 0, it doesn't resume where it
          // left off.
          player.pause();
          await player.seekTo(0);
          usePlaybackStore.getState().clearNowPlaying(feed.id.toString());
          // User showed disinterest (at least for now) - stop spending their
          // bandwidth on a background cache download for this ringtone.
          cancelBackgroundDownload(localFileUri);
        } else {
          console.log('▶️ Resuming audio...');
          registerRingtonePlayback();
          player.play();
        }
        return;
      }

      // No source loaded yet - check the cache (fast, local-only) but don't
      // block playback on a full download: play immediately (from cache if
      // we have it, otherwise streamed directly from the remote URL), and on
      // a cache miss, download to disk in the background so the *next* play
      // of this ringtone is instant. Matches the identical restructure
      // applied to app/(main)/audio-player.tsx.
      setIsLoading(true);
      console.log('🎧 Audio source URI:', audioSourceUri);
      console.log('🎼 Audio media:', audioMedia);

      if (audioSourceUri) {
        const cachedUri = await getCachedRingtoneUri();
        const sourceUri = cachedUri ?? audioSourceUri;
        console.log(cachedUri ? '📱 Loading audio into player from local file:' : '🌐 Cache miss - streaming from remote URL:', sourceUri);
        player.replace({ uri: sourceUri });
        player.play();

        if (!cachedUri) {
          // Cache miss: already streaming from audioSourceUri above, so this
          // just primes the cache for next time - not awaited, doesn't
          // block playback, and doesn't touch `player` at all.
          downloadRingtoneInBackground(localFileUri, audioSourceUri);
        }

        registerRingtonePlayback();

        // Track view
        try {
          await feedService.viewFeed(feed.id.toString());
          incrementView(feed.id.toString());
          console.log('📊 View tracked successfully');
        } catch (viewError) {
          console.error('Error tracking view:', viewError);
          // Don't show alert for view tracking errors
        }

        // Track play (fresh play-start only, not resume-from-pause -
        // matches viewFeed's behavior above; additive, not a replacement)
        try {
          await feedService.playFeed(feed.id.toString());
          console.log('▶️ Play tracked successfully');
        } catch (playError) {
          console.error('Error tracking play:', playError);
          // Don't show alert for play tracking errors
        }
      } else {
        console.error('❌ No audio URI found');
        Alert.alert('Error', 'No audio file found for this ringtone.');
      }
    } catch (error) {
      console.error('❌ Error playing audio:', error);
      Alert.alert('Error', 'Failed to play ringtone. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async () => {
    console.log('❤️ Like button pressed for ringtone:', feed.id, 'current localIsLiked:', localIsLiked, 'localCount:', localLikesCount);

    if (onLike) {
      // Use parent's like handler (recommended approach)
      onLike(feed.id.toString());
    } else {
      // Manage like state locally for immediate UI feedback
      try {
        // Store current state
        const wasLiked = localIsLiked;
        const currentCount = localLikesCount;

        // Optimistically update UI immediately
        if (wasLiked) {
          console.log('🔄 Unliking ringtone...');
          setLocalIsLiked(false);
          setLocalLikesCount(Math.max(0, currentCount - 1)); // Ensure count doesn't go below 0

          // Make API call
          await feedService.unlikeFeed(feed.id.toString());
          console.log('✅ Successfully unliked ringtone');
        } else {
          console.log('🔄 Liking ringtone...');
          setLocalIsLiked(true);
          setLocalLikesCount(currentCount + 1);

          // Make API call
          await feedService.likeFeed(feed.id.toString());
          console.log('✅ Successfully liked ringtone');
        }

        // Also update the store for consistency (optional)
        toggleLike(feed.id.toString());
      } catch (error) {
        console.error('❌ Error with like API, reverting local state:', error);

        // Revert local state on error
        setLocalIsLiked(feed.isLiked);
        setLocalLikesCount(feed.likesCount);

        Alert.alert('Error', 'Failed to like the ringtone. Please try again.');
      }
    }
  };

  const handleShare = async () => {
    try {
      await feedService.shareFeed(feed.id.toString(), { platform: 'native_share' });
      incrementShare(feed.id.toString());

      const result = await Share.share({
        // Real title first, caption only as a last resort (CLAUDE.md §56
        // Phase 0) - matches AutoplayFeedCard/AudioContentCard's already-
        // correct pattern; caption is no longer a reliable title proxy.
        message: (feed.title?.[language] || feed.title?.en || feed.caption)
          ? `Check out this ringtone: ${feed.title?.[language] || feed.title?.en || feed.caption}\n\nShared from Bhav Bhakti App`
          : 'Check out this amazing ringtone from Bhav Bhakti App!',
        url: audioMedia?.mediaUrl,
      });

      if (result.action === Share.sharedAction) {
        onShare?.(feed.id.toString());
      }
    } catch (error) {
      console.error('Error sharing ringtone:', error);
      Alert.alert('Error', 'Failed to share the ringtone. Please try again.');
    }
  };

  const handleSetRingtone = async () => {
    if (isSettingRingtone) return;

    setIsSettingRingtone(true);
    try {
      const hasPermission = await ensureMediaLibraryPermission('common.permissionReasonSetRingtone');
      if (!hasPermission) {
        return;
      }

      console.log('🎧 Starting ringtone setup...');
      console.log('📱 Audio source URI:', audioSourceUri);
      console.log('🎵 Audio media details:', audioMedia);

      const localUri = await ensureLocalFile();
      const fileName = localUri.split('/').pop() || localFileName;
      console.log('✅ Local file ready:', localUri);

      // Known gap, deliberately deferred: saveToLibraryAsync (both branches
      // below) has no native dedup - repeated taps create separate,
      // uniquified entries in the OS media library even though localUri
      // above is the same reused cached file each time. Cosmetic only, not
      // a functional or cost issue. Deferred until real user feedback
      // justifies the fix.
      if (Platform.OS === 'android') {
        try {
          // On Android, try to save to media library
          console.log('💾 Attempting to save audio file to media library...');
          await MediaLibrary.saveToLibraryAsync(localUri);
          console.log('✅ Audio saved to media library successfully');

          Alert.alert(
            'Ringtone Downloaded & Saved',
            'The ringtone has been saved to your device. To set it as your ringtone:\n\n1. Go to Settings > Sounds\n2. Select Phone Ringtone\n3. Choose the downloaded file',
            [
              {
                text: 'Open Sound Settings',
                onPress: () => {
                  // Restores the original, correct mechanism this feature
                  // had before expo-intent-launcher was accidentally
                  // removed in a broad unrelated dependency cleanup
                  // (commit ba65ddc, 2026-04-03) - Linking.openSettings()
                  // only opens this app's own app-info page, never real
                  // Sound settings, which was the actual reported bug.
                  IntentLauncher.startActivityAsync(
                    IntentLauncher.ActivityAction.SOUND_SETTINGS
                  ).catch(() => Linking.openSettings());
                },
              },
              { text: 'OK', style: 'default' },
            ]
          );
        } catch (mediaError) {
          const errorMessage = mediaError instanceof Error ? mediaError.message : 'Unknown error';
          console.log('⚠️ Could not save to media library, but file is downloaded:', errorMessage);
          // File is still downloaded, just not in media library
          Alert.alert(
            'Ringtone Downloaded',
            'The ringtone has been downloaded to your device. To set it as your ringtone:\n\n1. Go to Settings > Sounds\n2. Select Phone Ringtone\n3. Look for the ringtone file in your downloads',
            [
              {
                text: 'Open Sound Settings',
                onPress: () => {
                  IntentLauncher.startActivityAsync(
                    IntentLauncher.ActivityAction.SOUND_SETTINGS
                  ).catch(() => Linking.openSettings());
                },
              },
              { text: 'OK', style: 'default' },
            ]
          );
        }
      } else if (Platform.OS === 'ios') {
        try {
          // On iOS, try to save to media library (may not work for audio files)
          console.log('💾 Attempting to save audio file to media library (iOS)...');
          await MediaLibrary.saveToLibraryAsync(localUri);
          console.log('✅ Audio saved to media library (iOS)');

          Alert.alert(
            'Ringtone Downloaded & Saved',
            'The ringtone has been saved to your device. To set it as your ringtone:\n\n1. Go to Settings > Sounds & Haptics\n2. Select Ringtone\n3. Choose the downloaded file from "Custom" section',
            [
              {
                text: 'Open Settings',
                onPress: () => Linking.openSettings(),
              },
              { text: 'OK', style: 'default' },
            ]
          );
        } catch (mediaError) {
          const errorMessage = mediaError instanceof Error ? mediaError.message : 'Unknown error';
          console.log('⚠️ MediaLibrary doesn\'t support this audio format on iOS:', errorMessage);
          // iOS has restrictions on audio files in media library
          Alert.alert(
            'Ringtone Downloaded',
            `The ringtone has been downloaded successfully!\n\nFile location: ${fileName}\n\nFor iOS ringtones:\n• Connect to iTunes/Finder\n• Convert to .m4r format\n• Sync to set as ringtone\n\nOr use GarageBand to import and set as ringtone.`,
            [
              {
                text: 'Open Settings',
                onPress: () => Linking.openSettings(),
              },
              { text: 'Got It', style: 'default' },
            ]
          );
        }
      }

      // Track the action (optional)
      console.log('✅ Ringtone set for feed:', feed.id);
    } catch (error) {
      console.error('Error setting ringtone:', error);
      Alert.alert('Error', 'Failed to set ringtone. Please try again.');
    } finally {
      setIsSettingRingtone(false);
    }
  };

  // Handle progress bar seeking
  const handleSeek = async (event: any) => {
    if (status.isLoaded && status.duration > 0) {
      try {
        const { locationX } = event.nativeEvent;
        const progressBarWidth = width - 80; // Account for card padding
        const percentage = Math.max(0, Math.min(locationX / progressBarWidth, 1));
        const seekPositionSeconds = status.duration * percentage;

        await player.seekTo(seekPositionSeconds);
      } catch (error) {
        console.error('Error seeking:', error);
      }
    }
  };

  const formatTime = (millis: number): string => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };


  return (
    <View style={styles.container}>
      {/* Main Layout: Image on left, content on right */}
      <View style={styles.mainLayout}>
        {/* Thumbnail */}
        <View style={styles.thumbnailContainer}>
          {audioMedia?.thumbnailUrl ? (
            <Image
              source={{ uri: audioMedia.thumbnailUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.defaultThumbnail}>
              <Ionicons
                name="musical-notes"
                size={40}
                color="#C41E3A"
              />
            </View>
          )}
        </View>

        {/* Right Content Area */}
        <View style={styles.rightContent}>
          {/* Title */}
          <Text style={styles.title} numberOfLines={1}>
            {feed.title ? (feed.title[language] || feed.title.en || 'Untitled Ringtone') : 'Untitled Ringtone'}
          </Text>

          {/* Play Controls Row */}
          <View style={styles.playControlsContainer}>
            {/* Play Button */}
            <TouchableOpacity
              style={styles.playButton}
              onPress={handlePlayPause}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={goldenTempleTheme.colors.primary.DEFAULT} size="small" />
              ) : (
                <Ionicons
                  name={status.playing ? 'pause' : 'play'}
                  size={20}
                  color={goldenTempleTheme.colors.primary.DEFAULT}
                  style={{ marginLeft: status.playing ? 0 : 2 }}
                />
              )}
            </TouchableOpacity>

            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <TouchableOpacity
                style={styles.progressBar}
                onPress={handleSeek}
                activeOpacity={0.8}
              >
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: status.duration > 0 ? `${(status.currentTime / status.duration) * 100}%` : '0%' },
                    ]}
                  />
                  {status.duration > 0 && (
                    <View
                      style={[
                        styles.progressThumb,
                        {
                          left: `${Math.max(0, Math.min((status.currentTime / status.duration) * 100, 100))}%`,
                        }
                      ]}
                    />
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* Duration */}
            <Text style={styles.duration}>
              {formatTime((status.duration || audioMedia?.duration || 0) * 1000)} sec
            </Text>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.actionsContainer}>
            {/* Set as Ringtone Button - same shared gradient treatment as
                QuickLinkCard's boxes (Mantra/Rashifal/Status/Ringtone) */}
            <TouchableOpacity
              onPress={handleSetRingtone}
              disabled={isSettingRingtone}
              activeOpacity={0.8}
              style={styles.ringtoneButtonWrapper}
            >
              <LinearGradient
                colors={['#E76A4A', '#FFA241']}
                style={styles.ringtoneButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isSettingRingtone ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons
                    name="notifications-outline"
                    size={16}
                    color="#fff"
                  />
                )}
                <Text style={styles.ringtoneButtonText}>
                  {isSettingRingtone ? 'Setting...' : 'Set as ringtone'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Share Button - local whatsapp.svg, same icon/fill already used
                by AutoplayFeedCard's footer */}
            <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.8}>
              <WhatsAppIcon width={20} height={20} fill="#000000" />
            </TouchableOpacity>

            {/* Like Button */}
            <TouchableOpacity
              style={styles.likeButton}
              onPress={handleLike}
              activeOpacity={0.7}
            >
              <Ionicons
                name={localIsLiked ? 'heart' : 'heart-outline'}
                size={20}
                color={localIsLiked ? '#FF4444' : '#8B7355'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f7ebc4',
    borderRadius: 16,
    padding: 6,
    marginBottom: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E8DDD1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  thumbnailContainer: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 0,
  },
  defaultThumbnail: {
    width: 80,
    height: 80,
    backgroundColor: '#F5E6D3',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8DDD1',
  },
  content: {
    flex: 1,
    paddingTop: 4,
  },
  title: {
    fontWeight: '700',
    fontSize: 18,
    color: '#000000',
    lineHeight: 22,
    includeFontPadding: false,
  },
  duration: {
    color: '#8B7355',
    fontSize: 14,
    fontWeight: '500',
    minWidth: 60,
    textAlign: 'right',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  tag: {
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 0,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tagText: {
    fontSize: 11,
    color: '#4A90E2',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  // gap widened (6->10) and a right inset added now that only 3 elements
  // share this row (was 4, with Download as the last one flush against the
  // card's own outer padding) - the ringtone pill's existing flex:1 already
  // absorbs the width Download used to occupy, this just keeps Share/Like
  // from feeling cramped against each other and the card's right edge.
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    paddingRight: 4,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  // The gradient itself now renders on this style (moved from a plain
  // TouchableOpacity backgroundColor to a LinearGradient) - the wrapper
  // below carries flex:1 so the gradient still fills the same layout slot.
  ringtoneButtonWrapper: {
    flex: 1,
  },
  ringtoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    justifyContent: 'center',
  },
  ringtoneButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 0.1,
  },
  likeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E8DDD1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeCount: {
    color: '#1A1A1A',
    fontWeight: '600',
    fontSize: 13,
  },
  // Progress Bar Styles
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    marginBottom: 8,
    position: 'relative',
  },
  progressTrack: {
    height: '100%',
    backgroundColor: '#E8DDD1',
    borderRadius: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#C41E3A',
    borderRadius: 3,
  },
  progressThumb: {
    position: 'absolute',
    top: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#C41E3A',
    marginLeft: -6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },

  // New styles for horizontal layout
  mainLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rightContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingLeft: 4,
  },
  playControlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    gap: 8,
  },
  progressSection: {
    flex: 1,
    height: 6,
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E8DDD1',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
