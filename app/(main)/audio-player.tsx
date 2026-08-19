import React, { useState, useEffect, useCallback, useId } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Animated,
  ActivityIndicator,
  Alert,
  AppState,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from '@/components/atoms';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { designSystemTheme } from '@/styles/designSystemTheme';
import { feedService } from '@/features/feed/services/feedService';
import { Feed } from '@/types/feed';
import { useTranslation } from 'react-i18next';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { CounterSheet, InfoSheet, QueueSheet } from '@/components/molecules/AudioPlayerSheets';
import { usePlaybackStore, QueueItem } from '@/store/playbackStore';

const { width } = Dimensions.get('window');

// Target count options for mantras
const TARGET_COUNT_OPTIONS = [27, 54, 108, 216, 324, 540, 1008];

// Pure functions of their arguments (no component state closed over), so
// these live at module scope rather than being recreated every render.

const getAudioFileExtension = (audioUri: string): string => {
  const pathWithoutQuery = audioUri.split('?')[0];
  const urlParts = pathWithoutQuery.split('.');
  const extension = urlParts.length > 1 ? urlParts[urlParts.length - 1].toLowerCase() : 'mp3';
  const supportedExtensions = ['mp3', 'wav', 'aac', 'm4a', 'ogg'];
  return supportedExtensions.includes(extension) ? extension : 'mp3';
};

// Confirmed via a real on-device crash: expo-audio's native lock-screen
// metadata (setActiveForLockScreen) tries to parse artworkUrl as a URL and
// throws MalformedURLException on Android if it's an empty string - which is
// exactly what contentData.thumbnailUrl resolves to for queue items with no
// thumbnail (route params carry '' rather than undefined for a missing
// value, see AudioContentCard/navigateToQueueItem's `|| ''` fallback), not
// undefined. A plain truthy/falsy check would treat '' correctly but so
// would `!!url`, without confirming it's actually URL-shaped - this checks
// both, since any other malformed-but-truthy string would hit the exact same
// native crash.
const isValidArtworkUrl = (url: string | undefined): url is string =>
  !!url && /^https?:\/\/.+/i.test(url);

// feedId rather than sanitized title text keys the cache path below -
// mirrors RingtoneFeedCard.tsx's cache-key choice, but avoids its latent
// collision risk (two feeds sharing/sanitizing down to the same title would
// silently share one cache file). feedId is guaranteed unique and is already
// this screen's own established per-item key elsewhere (see
// getCounterKey/getTargetKey below).
const getLocalCachePath = (feedIdForCache: string, audioUri: string): string =>
  `${FileSystem.documentDirectory}audio_player_${feedIdForCache}.${getAudioFileExtension(audioUri)}`;

// Module-scope (not component state) so it's shared across remounts of this
// screen (e.g. navigating between two different mantras reuses the same
// route) and reachable from every place playback for a feedId can stop:
// togglePlayback's own pause path, the coordinator's stop/pause closures
// (called externally by the MiniPlayer, which can pause/stop this content
// without this screen's own handlers ever running), the "preempted by
// another persistent item" effect, and the unmount cleanup. A plain
// DownloadResumable handle (not just a boolean/Set entry) is stored per
// feedId specifically so any of those call sites can cancel it.
const inFlightBackgroundDownloads = new Map<string, FileSystem.DownloadResumable>();

// Tracks, per feedId, the cleanup Promise for a cancellation that's still
// settling - cancelAsync() and the partial-file delete it triggers are both
// async and nothing awaits them at the point cancelBackgroundDownload is
// called, so without this, a fresh attempt for the SAME feedId landing in
// that window could either collide with the still-in-flight native cancel
// (two DownloadResumables racing over the same destination file - this is
// what produced real "Download failed with status 400" / "Network request
// failed" errors on-device) or mistake a not-yet-deleted partial file for a
// valid cache hit. getCachedLocalUri and downloadToCacheInBackground below
// both check this before touching the same feedId's cache file again.
// Deliberately a Promise that never rejects (see cancelBackgroundDownload)
// so awaiting it elsewhere can never throw.
const inFlightCancellations = new Map<string, Promise<void>>();

// Marks a feedId whose download has been deferred until a pending
// cancellation clears (see downloadToCacheInBackground below), but hasn't
// actually started yet - without this, a second call to
// downloadToCacheInBackground for the same feedId arriving during that same
// wait would ALSO defer and attach its own start, and both would fire once
// the cancellation clears, recreating the exact same two-downloads-one-file
// collision this whole mechanism exists to prevent.
const queuedForBackgroundDownload = new Set<string>();

// Fast, local-only check - no network involved. Returns the cached URI if
// this feed's audio is already on disk, or null on a cache miss. Used by
// togglePlayback's fresh-play path so a miss can fall straight through to
// streaming the remote URL instead of blocking playback on a download -
// expo-audio plays a remote https URL directly (this is exactly how this
// screen worked before local caching was added), so there's no need to wait
// for a local copy before starting playback.
const getCachedLocalUri = async (feedIdForCache: string, audioUri: string): Promise<string | null> => {
  // Only waits when a cancellation for THIS SPECIFIC feedId is still
  // settling - inFlightCancellations.get() is a synchronous Map lookup, so
  // for the overwhelming majority of calls (a first-ever play, or a replay
  // of content that was never actively cancelled) this `if` is false and NO
  // await ever executes: the function falls straight through to the
  // getInfoAsync check below exactly as it did before this fix, with zero
  // added delay on the common path.
  const pendingCancellation = inFlightCancellations.get(feedIdForCache);
  if (pendingCancellation) {
    await pendingCancellation;
  }

  const localFileUri = getLocalCachePath(feedIdForCache, audioUri);
  const fileInfo = await FileSystem.getInfoAsync(localFileUri);
  if (fileInfo.exists) {
    console.log('📦 Using cached audio file:', localFileUri);
    return localFileUri;
  }
  return null;
};

// Fire-and-forget: downloads this feed's audio to the local cache without
// blocking playback, called on a cache miss right after playback has already
// started from the remote URL. Deliberately never touches `player` - it only
// ever writes to the filesystem, so unlike togglePlayback's own cache check,
// it has no exposure to the "shared object already released" crash class at
// all, and can safely keep running (or be cancelled and clean up) even after
// this screen unmounts. Guarded against duplicate concurrent downloads for
// the same feedId, since backgrounding the download (rather than blocking
// the UI on it) makes it newly possible for the user to revisit this same
// content before the first download finishes.
const downloadToCacheInBackground = (feedIdForCache: string, audioUri: string): void => {
  if (inFlightBackgroundDownloads.has(feedIdForCache) || queuedForBackgroundDownload.has(feedIdForCache)) {
    return;
  }

  const startDownload = () => {
    queuedForBackgroundDownload.delete(feedIdForCache);
    const localFileUri = getLocalCachePath(feedIdForCache, audioUri);
    console.log('⬇️ Background download starting:', localFileUri);
    const resumable = FileSystem.createDownloadResumable(audioUri, localFileUri);
    inFlightBackgroundDownloads.set(feedIdForCache, resumable);

    resumable
      .downloadAsync()
      .then((result) => {
        // A cancelled resumable download resolves to `undefined` rather
        // than rejecting (confirmed in expo-file-system's own types) -
        // cancellation is handled entirely by cancelBackgroundDownload
        // below, including its own partial-file cleanup, so there's
        // nothing further to do here.
        if (!result) {
          console.log('⏹️ Background cache download cancelled for feed:', feedIdForCache);
          return;
        }
        if (result.status !== 200) {
          throw new Error(`Download failed with status ${result.status}`);
        }
        console.log('✅ Background cache download complete for feed:', feedIdForCache);
      })
      .catch((error) => {
        console.error('Background cache download failed for feed:', feedIdForCache, error);
        FileSystem.deleteAsync(localFileUri, { idempotent: true }).catch((cleanupError) => {
          console.error('Error cleaning up partial audio download:', cleanupError);
        });
      })
      .finally(() => {
        inFlightBackgroundDownloads.delete(feedIdForCache);
      });
  };

  // Same reasoning as getCachedLocalUri above, and the same "only waits when
  // something is actually pending" shape: if this feedId's previous download
  // was just cancelled, defer starting a NEW DownloadResumable until that
  // cleanup genuinely finishes, rather than racing it over the same
  // destination file. queuedForBackgroundDownload is marked BEFORE returning
  // so a second call for the same feedId arriving during this same wait
  // bails out via the guard above instead of scheduling its own duplicate
  // start. When nothing is pending (the common case), this whole block is
  // skipped and startDownload() runs immediately, synchronously - no added
  // delay to a normal fresh download.
  const pendingCancellation = inFlightCancellations.get(feedIdForCache);
  if (pendingCancellation) {
    queuedForBackgroundDownload.add(feedIdForCache);
    pendingCancellation.then(startDownload);
    return;
  }

  startDownload();
};

// Cancels this feed's in-flight background cache download, if any, and
// deletes the partial file it left behind. cancelAsync() only stops the
// native transfer - it doesn't clean up after itself, since DownloadResumable
// is designed around pause/resume, where keeping the partial file around is
// the whole point. A genuine cancel here means "the user stopped/paused/left
// - stop spending their bandwidth on this," not "pause for later," so this
// matches the existing failed-download cleanup instead of leaving a
// resumable partial file sitting on disk indefinitely.
//
// The cleanup work (native cancel + file delete) is stored in
// inFlightCancellations, keyed by feedId, so getCachedLocalUri and
// downloadToCacheInBackground can wait for it to actually finish before a
// fresh attempt for this same feedId touches the same cache file again -
// this function itself still returns immediately (fire-and-forget), it just
// now leaves a trace of "still cleaning up" behind for other callers to
// check. The stored promise deliberately never rejects (both steps catch
// their own errors) so awaiting it elsewhere can never throw.
const cancelBackgroundDownload = (feedIdForCache: string): void => {
  const resumable = inFlightBackgroundDownloads.get(feedIdForCache);
  if (!resumable) return;

  inFlightBackgroundDownloads.delete(feedIdForCache);

  const cleanup = resumable
    .cancelAsync()
    .catch((error) => {
      console.error('Error cancelling background audio download:', error);
    })
    .then(() =>
      FileSystem.deleteAsync(resumable.fileUri, { idempotent: true }).catch((cleanupError) => {
        console.error('Error cleaning up cancelled partial audio download:', cleanupError);
      })
    )
    .finally(() => {
      inFlightCancellations.delete(feedIdForCache);
    });

  inFlightCancellations.set(feedIdForCache, cleanup);
};

export default function AudioPlayerScreen() {
  const params = useLocalSearchParams();
  const feedId = params.feedId?.toString();
  const autoPlay = params.autoPlay === 'true';
  const { t } = useTranslation('player');
  const { contentPadding } = useTabBarHeight();

  // Known bug (see CLAUDE.md): the plain router.back() this screen used to
  // call unconditionally always landed on Home regardless of which tab the
  // user actually opened the player from - Mantra Explorer hit this too, not
  // just Aarti/Bhajan. Rather than relying on the Tabs navigator's implicit
  // back-history (whatever's misbehaving there isn't diagnosed), every real
  // entry point now explicitly passes where "back" should go. router.back()
  // is kept as the fallback for any caller that doesn't pass returnTo, so
  // this is purely additive - no existing call site regresses.
  const handleBack = useCallback(() => {
    const returnTo = params.returnTo?.toString();
    if (returnTo) {
      let returnParams: Record<string, string> | undefined;
      const rawReturnParams = params.returnParams?.toString();
      if (rawReturnParams) {
        try {
          returnParams = JSON.parse(rawReturnParams);
        } catch (error) {
          console.error('Failed to parse returnParams, navigating without them:', error);
        }
      }
      router.replace({ pathname: returnTo as any, params: returnParams });
      return;
    }
    router.back();
  }, [params.returnTo, params.returnParams]);

  // Feed data state
  const [feedData, setFeedData] = useState<Feed | null>(null);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);

  // Counter state
  const [chantCount, setChantCount] = useState(0);
  const [targetCount, setTargetCount] = useState(108);
  const [showTargetSelector, setShowTargetSelector] = useState(false);

  // Audio state. Playback position/duration/playing/loaded state all come
  // reactively from `status` below - no local state mirrors them, matching
  // the pattern already proven in RingtoneFeedCard.tsx (avoids the class of
  // desync bug where a manually-toggled flag drifts from the real player
  // state). `isAudioLoading` is the one true local flag: expo-audio's
  // AudioStatus has no `error` field the way expo-av's did, so there's no
  // native "it failed" signal to react to - this is purely a "waiting for
  // status.isLoaded to flip" UI flag, resolved by the effect further down.
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  // Gates the 10s "did it ever load" timeout below - only flips true once
  // togglePlayback has actually handed a resolved local URI to the native
  // player, so a slow cache-miss download isn't unfairly counted against
  // the same budget as expo-audio's own load time.
  const [nativeLoadStarted, setNativeLoadStarted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isLooping, setIsLooping] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isAutoLooping, setIsAutoLooping] = useState(false); // Auto-loop until target reached
  // Keyed by feedId, not a plain boolean - this screen is a reused
  // Tabs.Screen (see loadedFeedIdRef's comment below), so a plain
  // "have we ever auto-played" flag would permanently latch true after the
  // first mantra and silently block autoPlay for every mantra tapped after
  // it in the same app session.
  const autoPlayTriggeredForFeedIdRef = React.useRef<string | null>(null);

  // Tracks whether the app is genuinely, stably foregrounded - guards the
  // lock-screen activation call below against Android 12+'s
  // ForegroundServiceStartNotAllowedException, which throws if
  // startForeground() (which setActiveForLockScreen triggers under the hood
  // on Android) is called outside a confirmed-foreground window. Concretely
  // observed: tapping the lock-screen notification to return to the app can
  // land this call inside that restricted window if it fires around the
  // same moment as the transition.
  const isAppActiveRef = React.useRef(AppState.currentState === 'active');

  // Tracks whether this screen is still mounted, for togglePlayback's cache
  // check below: this screen only ever unmounts on a genuine app-tree
  // unmount (e.g. logout - see the cleanup effect further down), not on
  // ordinary tab navigation (Tabs don't unmount inactive screens), but if
  // that unmount happens to land while getCachedLocalUri's await is still in
  // flight, touching `player` after it resolves would throw "Cannot use
  // shared object that was already released" - the same class of crash
  // already found and fixed for RingtoneFeedCard.tsx during the Audio hub
  // restructure. Note this only guards the (fast, local-only) cache check -
  // the actual download runs separately in the background and never touches
  // `player`, so it has no exposure to this crash class at all.
  const isMountedRef = React.useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Player is created once (with no source) for this screen's lifetime.
  // expo-audio's useAudioPlayer auto-releases the player on unmount via
  // useReleasingSharedObject - there is no manual unload/release call to
  // write here, and (importantly) no way to opt out of that auto-release
  // from within this file. See the migration notes for why that means this
  // change alone does not make playback survive back-navigation.
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  // Identifies THIS mounted player instance (not the content playing on it)
  // to the playback coordinator - see playbackStore.ts's NowPlayingIdentity
  // comment. Stable across every feedId change on this screen (Tabs don't
  // unmount it - same reasoning as loadedFeedIdRef just below), so the
  // coordinator can tell "a skip within this same shared player" apart from
  // "a genuinely different player instance took over," and only stop()/
  // clearLockScreenControls() in the latter case.
  const playerInstanceId = useId();

  // Tracks which feedId's audio is actually attached to `player` right now.
  // status.isLoaded alone only tells us SOMETHING is loaded, not WHETHER
  // it's the currently-requested content - since this screen is a
  // Tabs.Screen (registered in app/(main)/_layout.tsx), navigating here
  // again with a different feedId reuses this exact component instance
  // rather than remounting it, so `player`/`status.isLoaded` persist
  // unchanged across a mantra switch on their own. Without this ref,
  // togglePlayback's `if (status.isLoaded)` branch has no way to tell "a
  // different mantra is already loaded" apart from "this same mantra is
  // already loaded," and would just resume/pause whatever was loaded first.
  const loadedFeedIdRef = React.useRef<string | null>(null);

  // Bottom sheet refs
  const counterSheetRef = React.useRef<BottomSheetModal>(null);
  const infoSheetRef = React.useRef<BottomSheetModal>(null);
  const queueSheetRef = React.useRef<BottomSheetModal>(null);

  // Refs to store current state values for callback access (fixes stale closure issue)
  const isAutoLoopingRef = React.useRef(isAutoLooping);
  const chantCountRef = React.useRef(chantCount);
  const targetCountRef = React.useRef(targetCount);
  const feedIdRef = React.useRef(feedId);

  // Animation values
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  // Interpolate rotation for proper string format
  const rotateInterpolation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Counter storage key
  const getCounterKey = (feedId: string) => `mantra_counter_${feedId}`;
  const getTargetKey = (feedId: string) => `mantra_target_${feedId}`;

  // Load saved counter progress
  const loadCounterProgress = async (feedId: string) => {
    try {
      const [savedCount, savedTarget] = await Promise.all([
        AsyncStorage.getItem(getCounterKey(feedId)),
        AsyncStorage.getItem(getTargetKey(feedId)),
      ]);

      if (savedCount) {
        setChantCount(parseInt(savedCount, 10));
      }
      if (savedTarget) {
        setTargetCount(parseInt(savedTarget, 10));
      }
    } catch (error) {
      console.error('Error loading counter progress:', error);
    }
  };

  // Save counter progress
  const saveCounterProgress = async (feedId: string, count: number, target: number) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(getCounterKey(feedId), count.toString()),
        AsyncStorage.setItem(getTargetKey(feedId), target.toString()),
      ]);
    } catch (error) {
      console.error('Error saving counter progress:', error);
    }
  };

  // Fetch feed data from API
  const fetchFeedData = async () => {
    if (!feedId) {
      console.log('❌ Audio Player: No feed ID provided');
      setFeedError('No feed ID provided');
      setIsFeedLoading(false);
      return;
    }

    try {
      console.log('🔄 Audio Player: Fetching feed data for ID:', feedId);
      setIsFeedLoading(true);
      setFeedError(null);

      const feed = await feedService.getFeedById(feedId);
      console.log('✅ Audio Player: Feed data received:', feed);

      setFeedData(feed);

      // Load saved progress for this mantra
      await loadCounterProgress(feedId);

      // Track view
      await feedService.viewFeed(feedId);
      console.log('👁️ Audio Player: View tracked for feed:', feedId);
    } catch (error) {
      console.error('❌ Audio Player: Error fetching feed:', error);
      setFeedError('Failed to load mantra details');
    } finally {
      setIsFeedLoading(false);
    }
  };

  // Helper function to get localized text from JSON field
  const getLocalizedText = (jsonField: any, fallback: string): string => {
    if (!jsonField) return fallback;

    if (typeof jsonField === 'string') return jsonField;

    if (typeof jsonField === 'object' && !Array.isArray(jsonField)) {
      const keys = Object.keys(jsonField);
      if (keys.length === 0) return fallback;

      // Try current language first, then English, then Hindi, then first available
      return jsonField['en'] || jsonField['hi'] || Object.values(jsonField)[0] || fallback;
    }

    return fallback;
  };

  // Resolve the currently-active content's display data from the fetched feed
  // (or fallback route params before the fetch resolves). Kept as a single
  // generic shape so this screen can serve any repeatable/non-repeatable
  // audio content type (Mantra today, Aarti/Bhajan later) without a rewrite.
  //
  // The feedData.id.toString() === feedId check is deliberate, not
  // redundant: fetchFeedData is async, and since this screen is a reused
  // Tabs.Screen (see loadedFeedIdRef's comment above), feedData can still
  // hold the PREVIOUS mantra's data for a brief window after feedId has
  // already changed to a new one, right up until that fetch resolves.
  // Without this check, this function would keep returning the old mantra's
  // title/audioUrl/feedId under the new feedId during that window - which
  // is exactly what let stale content leak into togglePlayback and the
  // playback-coordinator registration effect below. Falling back to route
  // params instead is safe here: every real navigation call site into this
  // screen (Home, Mantra Explorer, Search Results) already passes
  // title/audioUrl/thumbnailUrl alongside feedId, so the fallback is
  // accurate for the new content, not just a placeholder.
  const getContentData = () => {
    if (feedData && feedData.media && Array.isArray(feedData.media) && feedData.id.toString() === feedId) {
      const audioMedia = feedData.media.find(media =>
        media.type === 'audio' || media.type === 'image_audio'
      );

      // Get deity name from the deity relationship or fallback
      const deityName = feedData.deity?.displayName
        ? getLocalizedText(feedData.deity.displayName, feedData.deity.name || t('unknownDeity'))
        : t('unknownDeity');

      // Get description from feed's multilingual description field
      const description = getLocalizedText(feedData.description, t('mantraDescription'));

      // Get objective from feed's multilingual objective field
      const objective = getLocalizedText(feedData.objective, t('spiritualGrowth'));

      return {
        // CLAUDE.md §56 Phase 0 (Aarti/Bhajan player redesign): title now
        // comes from the real bilingual `title` field, not `caption` - the
        // CSV importer had been writing a copy of the English title into
        // `caption`, which is why this screen's title only ever showed
        // English regardless of language. `deity` (below) is deliberately
        // UNTOUCHED - it still feeds the native lock-screen metadata's own
        // `artist` field and InfoSheet's deity display, both load-bearing
        // and unrelated to this on-screen `artist` field.
        title: getLocalizedText(feedData.title, t('sacredMantra')),
        // The new on-screen "artist" subtitle - `caption`'s intended role
        // going forward. Not yet real per-content artist data (caption
        // currently still holds the same English-title copy caption always
        // has), so this will visibly duplicate the title until the CSV
        // pipeline's write-side is updated separately - a known, accepted
        // consequence of this data-routing fix, not a bug in it.
        artist: feedData.caption || '',
        description,
        tags: feedData.tags,
        deity: deityName,
        objective,
        audioUrl: audioMedia?.mediaUrl || audioMedia?.audioUrl,
        thumbnailUrl: audioMedia?.thumbnailUrl,
        feedId: feedData.id.toString(),
      };
    }

    // Fallback to params if feed data not loaded
    return {
      title: params.title || t('sacredMantra'),
      // See the loaded branch's comment above - params.artist is already
      // sent by every real entry point (mantras.tsx/index.tsx/search-
      // results.tsx, updated alongside this), sourced from caption.
      artist: params.artist ? params.artist.toString() : '',
      description: params.description || t('mantraDescription'),
      tags: params.tags ? params.tags.toString().split(',') : [t('mantras')],
      deity: params.deity || t('unknownDeity'),
      objective: params.objective || t('spiritualGrowth'),
      audioUrl: params.audioUrl,
      thumbnailUrl: params.thumbnailUrl,
      feedId: params.feedId,
    };
  };

  const contentData = getContentData();
  // Same staleness guard as getContentData above, for the two places below
  // that read feedData directly (feedData?.type, feedData?.isRepeatable)
  // instead of through contentData - null during the same brief
  // feedId-changed-but-not-yet-refetched window, so the coordinator
  // registration and status-mirroring effects can't attach a previous
  // mantra's type/counter shape to the newly-requested feedId either.
  const currentFeedData = feedData && feedData.id.toString() === feedId ? feedData : null;

  // Update refs whenever state changes to avoid stale closure issues
  useEffect(() => {
    isAutoLoopingRef.current = isAutoLooping;
    console.log('🔄 Updated isAutoLoopingRef to:', isAutoLooping);
  }, [isAutoLooping]);

  useEffect(() => {
    chantCountRef.current = chantCount;
    console.log('🔢 Updated chantCountRef to:', chantCount);
  }, [chantCount]);

  useEffect(() => {
    targetCountRef.current = targetCount;
    console.log('🎯 Updated targetCountRef to:', targetCount);
  }, [targetCount]);

  useEffect(() => {
    feedIdRef.current = feedId;
  }, [feedId]);

  // Fetch feed data on component mount
  useEffect(() => {
    fetchFeedData();
  }, [feedId]);

  // Initialize audio session for persistent (background-surviving) playback,
  // unlike Ringtones' deliberately ephemeral, foreground-only mode. Runs
  // once on mount - no cleanup/unload here, and no [player]-keyed rerun, on
  // purpose: this only configures the shared native audio session, it does
  // not own the player's lifecycle (useAudioPlayer already does that).
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        console.log('🔊 Audio Player: Setting up persistent audio session...');

        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          shouldRouteThroughEarpiece: false,
          interruptionMode: 'duckOthers',
        });

        console.log('✅ Audio Player: Audio session configured for persistent playback');
      } catch (error) {
        console.error('❌ Audio Player: Failed to set audio mode:', error);
      }
    };

    initializeAudio();
  }, []);

  // Animations
  useEffect(() => {
    // Pulse animation for play button
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (status.playing) pulse();
      });
    };

    // Spin animation for loading
    const spin = () => {
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (isAudioLoading) spin();
      });
    };

    console.log('🎵 Animation Effect: playing =', status.playing, 'isAudioLoading =', isAudioLoading);

    if (status.playing) {
      pulse();
    } else {
      pulseAnim.setValue(1);
    }

    if (isAudioLoading) {
      spin();
    } else {
      rotateAnim.setValue(0);
    }
  }, [status.playing, isAudioLoading]);

  // Resolve isAudioLoading once the player actually finishes loading. There
  // is no `status.error` field in expo-audio the way expo-av had - so unlike
  // the old retry/fallback scaffolding this replaces, a load that never
  // resolves has no distinct failure signal to react to, and this timeout is
  // the only safety net available for that case. Gated on nativeLoadStarted,
  // not just isAudioLoading, so the 10s budget only starts counting once
  // togglePlayback has actually handed a resolved local URI to the native
  // player - not from the top of that function, which would otherwise also
  // count a slow cache-miss download against the same 10s window.
  useEffect(() => {
    if (!isAudioLoading || !nativeLoadStarted) return;

    if (status.isLoaded) {
      setIsAudioLoading(false);
      return;
    }

    const timeout = setTimeout(() => {
      setIsAudioLoading(false);
      Alert.alert(t('audioNotAvailableTitle'), t('audioConnectionError'));
    }, 10000);

    return () => clearTimeout(timeout);
  }, [isAudioLoading, nativeLoadStarted, status.isLoaded]);

  // Handle audio playback. Async since the "not yet loaded" branch checks the
  // local cache (getCachedLocalUri, above) before attaching a source to the
  // player - isMountedRef guards the code that runs after that await, per
  // its own comment above.
  const togglePlayback = async () => {
    try {
      // Only pause/resume the already-loaded source if it's actually THIS
      // feedId's content - loadedFeedIdRef is what makes that distinction
      // (status.isLoaded alone can't, see its own comment above). If
      // something is loaded but for a DIFFERENT feedId, fall through to the
      // load path below exactly as if nothing were loaded at all.
      if (status.isLoaded && loadedFeedIdRef.current === feedId) {
        if (status.playing) {
          console.log('⏸️ Pausing audio - stopping auto-loop');
          player.pause();
          setIsAutoLooping(false);
          // User showed disinterest (at least for now) - stop spending their
          // bandwidth on a background cache download for this content.
          if (feedId) cancelBackgroundDownload(feedId);
        } else {
          console.log('▶️ Resuming audio');

          // Check if we should restart auto-looping. Gated on isRepeatable -
          // auto-loop is mantra's chant-counter behavior; without this gate,
          // Aarti/Bhajan (isRepeatable: false, chantCount/targetCount just
          // sitting at their unused defaults) would silently auto-loop too.
          const shouldAutoLoop = !!currentFeedData?.isRepeatable && chantCount < targetCount && !isLooping;
          setIsAutoLooping(shouldAutoLoop);
          // Auto-loop always restarts manually on natural finish (see the
          // didJustFinish effect below) - it never uses the native loop
          // flag, which is reserved for the manual "repeat" toggle.
          player.loop = shouldAutoLoop ? false : isLooping;
          console.log(shouldAutoLoop ? '🔄 Resuming with auto-loop' : '▶️ Resuming with manual loop setting', '- Count:', chantCount, 'Target:', targetCount);

          player.play();
        }
        return;
      }

      if (!contentData.audioUrl) {
        console.log('❌ Audio Player: No audio URL provided');
        Alert.alert(t('audioPlaybackError'), t('noAudioUrlError'));
        return;
      }

      if (!feedId) {
        console.log('❌ Audio Player: No feed ID available for caching');
        Alert.alert(t('audioPlaybackError'), t('noAudioUrlError'));
        return;
      }

      // Switching away from a different mantra that was still loaded (not
      // just a fresh, never-loaded player) - stop it audibly right away
      // rather than leaving it playing through the cache-check await below,
      // and stop spending bandwidth caching content the user just left.
      if (loadedFeedIdRef.current && loadedFeedIdRef.current !== feedId) {
        console.log('🔀 Switching mantras - stopping previously loaded feed:', loadedFeedIdRef.current);
        player.pause();
        cancelBackgroundDownload(loadedFeedIdRef.current);
      }

      console.log('🎵 Audio Player: Loading audio from URL:', contentData.audioUrl);
      setIsAudioLoading(true);
      setNativeLoadStarted(false);

      // Determine if we should auto-loop (when count < target). Gated on
      // isRepeatable, same reasoning as the resume branch above - without
      // it, a fresh Aarti/Bhajan play (chantCount/targetCount at their
      // never-saved defaults of 0/108) would auto-loop by default with no
      // way to turn it off, since this content type has no counter UI to
      // even reveal that a "target" is silently driving playback.
      const shouldAutoLoop = !!currentFeedData?.isRepeatable && chantCount < targetCount;
      setIsAutoLooping(shouldAutoLoop);
      console.log('🎵 Audio setup - Count:', chantCount, 'Target:', targetCount, 'Auto-loop:', shouldAutoLoop);

      const audioUrl = contentData.audioUrl.toString();
      // Fast, local-only cache check - not a download. On a miss, play from
      // the remote URL immediately below and cache in the background instead
      // of blocking playback on a full download first.
      const cachedUri = await getCachedLocalUri(feedId, audioUrl);

      if (!isMountedRef.current) {
        console.log('⚠️ Audio Player: unmounted while checking audio cache, aborting load');
        return;
      }

      const sourceUri = cachedUri ?? audioUrl;

      player.loop = isLooping && !shouldAutoLoop; // Only the manual loop uses the native loop flag
      player.volume = volume;
      player.shouldCorrectPitch = false;
      player.setPlaybackRate(playbackSpeed); // playbackRate is a getter-only property at runtime - must go through setPlaybackRate()

      // Declared at load time so the native MediaItem - and therefore the
      // system lock screen - starts with correct data instead of empty.
      // Same title/artist/artwork mapping and the same isValidArtworkUrl
      // guard as activateLockScreenControls below, kept deliberately
      // consistent. `as any`: expo-audio's shipped TS types don't yet
      // reflect this patched native field.
      const artworkUrlForLoad = contentData.thumbnailUrl?.toString();
      const nativeMetadata = {
        title: contentData.title?.toString() ?? (t('sacredMantra') as string),
        artist: contentData.deity?.toString(),
        ...(isValidArtworkUrl(artworkUrlForLoad) ? { artworkUrl: artworkUrlForLoad } : {}),
      };

      // Only now - once we're handing a resolved source to the native
      // player - start the 10s "did it ever load" timeout (see the effect
      // above), not from the top of this function.
      setNativeLoadStarted(true);
      player.replace({ uri: sourceUri, metadata: nativeMetadata } as any);
      player.play();
      // Mark this feedId as the one now actually attached to `player`, so
      // the next tap correctly takes the pause/resume branch above instead
      // of reloading, and so a LATER switch to yet another mantra can tell
      // this one apart as "different, needs replacing" too.
      loadedFeedIdRef.current = feedId;

      if (!cachedUri) {
        // Cache miss: already streaming from audioUrl above, so this just
        // primes the cache for next time - not awaited, doesn't block
        // playback, and doesn't touch `player` at all (see the function's
        // own comment for why that makes it safe post-unmount too).
        downloadToCacheInBackground(feedId, audioUrl);
      }
    } catch (error: any) {
      console.error('❌ Audio Player: Error playing audio:', error);
      if (!isMountedRef.current) return;

      setIsAudioLoading(false);

      Alert.alert(t('audioPlaybackError'), 'Failed to play audio. Please try again.', [
        { text: t('cancel'), style: 'cancel' },
        { text: t('retry'), onPress: () => togglePlayback() },
      ]);
    }
  };

  // Auto-start playback when navigated here with autoPlay=true (e.g. Home's "Play now").
  // togglePlayback is otherwise only ever invoked by a user tap, so without this effect
  // the autoPlay param would have nothing to trigger it.
  //
  // Gated on loadedFeedIdRef, not status.isLoaded: since this screen is a
  // reused Tabs.Screen, status.isLoaded stays true forever once ANY mantra
  // has ever been loaded - gating on it alone meant autoPlay silently never
  // fired for the second (or third...) mantra tapped in a session, because
  // the guard was already false before this effect even ran. Comparing
  // against loadedFeedIdRef.current correctly re-opens the gate whenever
  // feedId points at content that isn't the one actually attached to
  // `player` yet - the same distinction togglePlayback itself now makes.
  useEffect(() => {
    if (
      autoPlay &&
      autoPlayTriggeredForFeedIdRef.current !== feedId &&
      !isFeedLoading &&
      contentData.audioUrl &&
      loadedFeedIdRef.current !== feedId
    ) {
      autoPlayTriggeredForFeedIdRef.current = feedId ?? null;
      togglePlayback();
    }
  }, [autoPlay, isFeedLoading, contentData.audioUrl, feedId]);

  // Reactive so the Previous/Next buttons' disabled state (and the row
  // itself, if the queue clears) updates live as position changes -
  // computing the "current" item requires the same originalItems[playOrder
  // [position]] resolution playbackStore.ts documents, not just `position`
  // alone, so this subscribes to the whole queue slot rather than picking
  // out individual fields. Declared here (rather than nearer the JSX that
  // also uses it, further down) because the didJustFinish effect below
  // needs it too - a `const` referenced by an effect defined earlier in this
  // function body must itself be declared even earlier, or TypeScript
  // (correctly) flags a temporal-dead-zone violation.
  const queue = usePlaybackStore((state) => state.queue);

  // One derived flag, not scattered type checks - see CLAUDE.md's
  // player-cleanup notes for why (mirrors the existing feedData?.isRepeatable
  // gate already used for the counter button below). Mantra never has a
  // queue (Phase 3 never calls setQueue for it), so gating on type alone -
  // rather than on `queue` being present - is what keeps this hidden for
  // mantra even in a hypothetical future where queue ends up non-null there.
  const showTrackNav = currentFeedData?.type === 'aarti' || currentFeedData?.type === 'bhajan';
  const canGoPrevious = !!queue && queue.position > 0;
  const canGoNext = !!queue && queue.position < queue.playOrder.length - 1;

  // Shared by handlePrevious/handleNext and the didJustFinish auto-advance
  // branch below - reuses the exact same load path any other tap into this
  // screen already uses (fetchFeedData/loadedFeedIdRef/autoPlay effect all
  // key off feedId route params changing), so no new playback logic is
  // needed here. router.replace, not push, so repeated skips/auto-advances
  // don't grow the back stack - handleBack's returnTo/returnParams still
  // point at the ORIGINAL entry screen either way, re-passed through
  // unchanged on every hop.
  const navigateToQueueItem = useCallback((item: QueueItem) => {
    router.replace({
      pathname: '/(main)/audio-player',
      params: {
        feedId: item.feedId,
        title: item.title,
        audioUrl: item.audioUrl,
        thumbnailUrl: item.thumbnailUrl || '',
        autoPlay: 'true',
        ...(params.returnTo ? { returnTo: params.returnTo.toString() } : {}),
        ...(params.returnParams ? { returnParams: params.returnParams.toString() } : {}),
      },
    });
  }, [params.returnTo, params.returnParams]);

  const handlePrevious = useCallback(() => {
    if (!canGoPrevious) return;
    usePlaybackStore.getState().goToPrevious();
    const updatedQueue = usePlaybackStore.getState().queue;
    if (!updatedQueue) return;
    navigateToQueueItem(updatedQueue.originalItems[updatedQueue.playOrder[updatedQueue.position]]);
  }, [canGoPrevious, navigateToQueueItem]);

  const handleNext = useCallback(() => {
    if (!canGoNext) return;
    usePlaybackStore.getState().advanceQueue();
    const updatedQueue = usePlaybackStore.getState().queue;
    if (!updatedQueue) return;
    navigateToQueueItem(updatedQueue.originalItems[updatedQueue.playOrder[updatedQueue.position]]);
  }, [canGoNext, navigateToQueueItem]);

  // QueueSheet renders in ACTIVE order (playOrder-resolved, so shuffled when
  // shuffled) - it's a pure list with no knowledge of originalItems/playOrder
  // itself, so this is computed here and passed down as plain arrays/index.
  const queueDisplayItems = queue ? queue.playOrder.map((originalIndex) => queue.originalItems[originalIndex]) : [];
  const queueDisplayIndex = queue?.position ?? 0;

  // jumpToIndex takes a position WITHIN playOrder (see its own comment in
  // playbackStore.ts) - exactly what QueueSheet's onSelectIndex reports,
  // since queueDisplayItems above IS playOrder in list form. Same
  // read-back-after-write plus navigateToQueueItem pattern as
  // handlePrevious/handleNext. Deliberately does NOT dismiss the sheet -
  // the new track loads/plays with the sheet still open, so browsing several
  // items in a row doesn't mean reopening it each time. QueueSheet's own
  // `isActive` highlight (keyed off currentIndex, which re-renders from the
  // reactive `queue` selector once the store updates) is what shows the
  // selection actually landed, in place of a dismiss-on-tap confirmation.
  const handleJumpToQueueIndex = useCallback((index: number) => {
    usePlaybackStore.getState().jumpToIndex(index);
    const updatedQueue = usePlaybackStore.getState().queue;
    if (!updatedQueue) return;
    navigateToQueueItem(updatedQueue.originalItems[updatedQueue.playOrder[updatedQueue.position]]);
  }, [navigateToQueueItem]);

  // Handle natural end-of-track: auto-loop restart + counter increment.
  // Unlike expo-av, expo-audio does not auto-rewind position on finish, and
  // there's no setOnPlaybackStatusUpdate registration to close over stale
  // values - useAudioPlayerStatus already re-renders this effect with fresh
  // state on every status change, so the ref reads below are a belt-and-
  // braces match for today's exact logic rather than a strict requirement.
  useEffect(() => {
    if (!status.didJustFinish) return;

    console.log('🎵 Audio Player: Audio playback finished');

    // Aarti/Bhajan only, and only early-returns when there's actually
    // somewhere to advance to - showTrackNav is false for mantra (see its
    // own definition below), so this can never fire for mantra content and
    // the untouched auto-loop/counter logic beneath it. A queue with nothing
    // left (or no queue at all - e.g. reached via Search/Home, which never
    // call setQueue) falls straight through to the existing clean-stop
    // behavior in the unchanged branches below, unchanged.
    if (showTrackNav && queue && queue.position < queue.playOrder.length - 1) {
      console.log('⏭️ Audio Player: track finished, advancing queue');
      usePlaybackStore.getState().advanceQueue();
      const updatedQueue = usePlaybackStore.getState().queue;
      if (updatedQueue) {
        navigateToQueueItem(updatedQueue.originalItems[updatedQueue.playOrder[updatedQueue.position]]);
      }
      return;
    }

    const currentAutoLooping = isAutoLoopingRef.current;
    const currentCount = chantCountRef.current;
    const currentTarget = targetCountRef.current;
    const currentFeedId = feedIdRef.current;

    console.log('🔄 Using ref values - Auto-looping:', currentAutoLooping, 'Count:', currentCount, 'Target:', currentTarget);

    if (currentAutoLooping && currentCount < currentTarget) {
      const newCount = currentCount + 1;
      console.log('🔄 Auto-looping active - incrementing count from', currentCount, 'to', newCount);
      setChantCount(newCount);

      if (currentFeedId) {
        saveCounterProgress(currentFeedId, newCount, currentTarget).catch(console.error);
      }

      if (newCount >= currentTarget) {
        console.log('🎯 Target reached! Stopping auto-loop');
        setIsAutoLooping(false);
        player.seekTo(0).catch(console.error);

        setTimeout(() => {
          Alert.alert(
            t('congratulations'),
            t('mantraChantCompleted').replace('{count}', currentTarget.toString()),
            [
              { text: t('continue'), style: 'default' },
              { text: t('resetCounter'), onPress: handleResetCounter, style: 'destructive' },
            ]
          );
        }, 500);
      } else {
        console.log('🔄 Target not reached, restarting audio for repetition', newCount);

        (async () => {
          try {
            await player.seekTo(0);
            player.play();
            console.log('✅ Audio restarted successfully for repetition', newCount);
          } catch (error) {
            console.error('❌ Restart failed, stopping auto-loop:', error);
            setIsAutoLooping(false);
          }
        })();
      }
    } else {
      console.log('⏹️ Not auto-looping or target reached - stopping playback');
      // pause() before seekTo(0): ExoPlayer's playWhenReady isn't cleared just
      // because playbackState reaches STATE_ENDED, so seeking alone would
      // exit STATE_ENDED and auto-resume playback from 0 - looking exactly
      // like an unwanted restart instead of a clean stop.
      player.pause();
      player.seekTo(0).catch(console.error);

      // Manual increment if not looping and count < target
      if (!isLooping && currentCount < currentTarget) {
        console.log('📈 Manual increment after song finish');
        handleIncrementCount();
      }
    }
  }, [status.didJustFinish, player, showTrackNav, queue, navigateToQueueItem]);

  // Tracks whether THIS player instance already has an active native
  // lock-screen/notification session, so activateLockScreenControls (below)
  // can update it in place on subsequent skips instead of unconditionally
  // tearing down and rebuilding the whole MediaSession every time - that
  // rebuild (release + new MediaSession.Builder + hideNotification()'s
  // unconditional cancel) is what caused the remaining, legitimate
  // vanish-and-reappear on skip, separate from the coordinator's own
  // spurious-stop bug fixed earlier. Reset to false wherever
  // clearLockScreenControls() is called, so a later reactivation correctly
  // goes through the full setActiveForLockScreen path again rather than
  // silently no-opping against a session that no longer exists (see
  // updateLockScreenMetadata's own doc comment: "only has an effect if this
  // player is currently active for lock screen controls").
  const hasActiveLockScreenSessionRef = React.useRef(false);

  // Activates lock-screen/notification controls with fresh metadata - only
  // ever called when isAppActiveRef confirms the app is genuinely
  // foregrounded (see the ref's own comment above for why). Wrapped in
  // try/catch as a defensive backstop: this is a real native call capable of
  // throwing (confirmed via the ForegroundServiceStartNotAllowedException
  // crash), and nothing upstream in this app catches a thrown effect
  // exception - there's no Error Boundary anywhere in the tree, so an
  // uncaught throw here would blank the screen rather than just skip a
  // notification. Position and play/pause state on the lock screen update
  // automatically from here on - expo-audio's native side pushes them on
  // its own per-tick status loop once active, so there's no separate "push
  // position to the lock screen" call needed anywhere in this file.
  const activateLockScreenControls = () => {
    try {
      const artworkUrl = contentData.thumbnailUrl?.toString();
      const metadata = {
        title: contentData.title?.toString() ?? (t('sacredMantra') as string),
        artist: contentData.deity?.toString(),
        // Omitted entirely (not passed as '' or undefined) when it isn't a
        // genuine URL - see isValidArtworkUrl's comment for why an empty
        // string specifically crashes the native side.
        ...(isValidArtworkUrl(artworkUrl) ? { artworkUrl } : {}),
      };

      if (hasActiveLockScreenSessionRef.current) {
        // Same player instance, already active - update metadata in place.
        // The Player.Listener attached during the original activation below
        // is still attached (same player.ref throughout, never torn down),
        // so play/pause icon updates keep working correctly with nothing
        // further to re-wire here.
        player.updateLockScreenMetadata(metadata);
      } else {
        player.setActiveForLockScreen(true, metadata, {
          showSeekForward: true,
          showSeekBackward: true,
        });
        hasActiveLockScreenSessionRef.current = true;
      }
    } catch (error) {
      console.error('❌ Audio Player: Failed to activate lock-screen controls:', error);
    }
  };

  // Register with the shared playback coordinator whenever playback
  // (re)starts - initial load, resume-from-pause, and the auto-loop restart
  // after a natural finish all flip status.playing false->true, so keying
  // on that one transition covers all three without extra call sites inside
  // togglePlayback itself. mode: 'persistent' is unconditional here
  // (regardless of isRepeatable) - this screen is the shared full-screen
  // player for any always-on-in-background content (mantra today, aarti/
  // bhajan later), not just repeatable ones. Re-registering with the same
  // feedId is harmless - registerPlaybackStart only stops a PREVIOUS
  // different feedId, so this just refreshes activeControls/nowPlaying.
  useEffect(() => {
    if (!status.playing || !feedId) return;

    usePlaybackStore.getState().registerPlaybackStart(
      {
        feedId,
        type: currentFeedData?.type ?? 'mantra',
        mode: 'persistent',
        title: contentData.title?.toString() ?? (t('sacredMantra') as string),
        thumbnailUrl: contentData.thumbnailUrl?.toString(),
        instanceId: playerInstanceId,
      },
      {
        isPlaying: true,
        positionSeconds: status.currentTime,
        durationSeconds: status.duration,
        counter: currentFeedData?.isRepeatable
          ? { chantCount, targetCount, isAutoLooping }
          : undefined,
      },
      {
        // stop/pause below are called externally too (e.g. by the
        // MiniPlayer's controls), not just from this screen's own UI, so
        // cancelling any in-flight background cache download has to live
        // here rather than only inside togglePlayback's own pause branch -
        // the user stopping/pausing via the mini-player is exactly as much
        // "not actively interested right now" as pausing from this screen.
        // Wrapped in try/catch, not AppState-gated: unlike
        // activateLockScreenControls (which starts a foreground service and
        // is genuinely restricted by Android 12+ during certain background/
        // foreground transitions), these calls only ever fail because
        // `player` itself has already been released - a native shared-object
        // lifecycle issue, not a timing-window issue, so a try/catch is the
        // correct guard here, not AppState gating.
        stop: () => {
          try {
            player.pause();
            player.seekTo(0);
            player.clearLockScreenControls();
            hasActiveLockScreenSessionRef.current = false;
          } catch (error) {
            console.error('Error stopping playback (player likely already released):', error);
          }
          if (feedId) cancelBackgroundDownload(feedId);
        },
        pause: () => {
          try {
            player.pause();
          } catch (error) {
            console.error('Error pausing playback (player likely already released):', error);
          }
          if (feedId) cancelBackgroundDownload(feedId);
        },
        resume: () => player.play(),
        seekTo: (seconds: number) => {
          player.seekTo(seconds);
        },
      }
    );

    // Only activate lock-screen controls if the app is confirmed
    // foreground right now. If it isn't (e.g. this effect happens to fire
    // around a background/foreground transition), skip it here - the
    // AppState-listener effect below will retry once we're confirmed back
    // in a safe, active window, so the notification still reliably appears
    // without risking the restricted-window crash.
    if (isAppActiveRef.current) {
      activateLockScreenControls();
    }
  }, [status.playing, feedId, playerInstanceId]);

  // Retries lock-screen activation on the transition INTO 'active', for
  // whichever attempt above was skipped because the app wasn't confirmed
  // foreground at the time. Also the mechanism that makes returning via the
  // lock-screen notification itself work: by the time this fires, the app
  // has fully completed its foreground transition, so it's a safe window.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasActive = isAppActiveRef.current;
      isAppActiveRef.current = nextState === 'active';

      if (!wasActive && isAppActiveRef.current && status.playing && feedId) {
        activateLockScreenControls();
      }
    });

    return () => subscription.remove();
  }, [status.playing, feedId]);

  // Auto-dismisses the lock-screen/notification entry after a long enough
  // pause that the user has likely moved on, rather than leaving it sitting
  // in the notification shade indefinitely. Deliberately native-only:
  // clears the lock-screen session via clearLockScreenControls() but does
  // NOT touch the playbackStore `persistent` slot or the mini-player - the
  // in-app resumable state stays exactly as it was, this is purely about
  // not leaving an OS notification around forever. Cancelled on any resume
  // or feedId change (a skip while paused restarts the clock rather than
  // dismissing mid-transition to different content), and on unmount, so a
  // stale timer from a previous pause can never fire late.
  const PAUSED_LOCK_SCREEN_DISMISS_MS = 30 * 60 * 1000; // 30 minutes
  const pausedDismissTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (pausedDismissTimerRef.current) {
      clearTimeout(pausedDismissTimerRef.current);
      pausedDismissTimerRef.current = null;
    }

    if (!status.playing && hasActiveLockScreenSessionRef.current) {
      pausedDismissTimerRef.current = setTimeout(() => {
        try {
          player.clearLockScreenControls();
        } catch (error) {
          console.error('Error auto-dismissing paused lock-screen controls (player likely already released):', error);
        }
        hasActiveLockScreenSessionRef.current = false;
        pausedDismissTimerRef.current = null;
      }, PAUSED_LOCK_SCREEN_DISMISS_MS);
    }

    return () => {
      if (pausedDismissTimerRef.current) {
        clearTimeout(pausedDismissTimerRef.current);
        pausedDismissTimerRef.current = null;
      }
    };
  }, [status.playing, feedId, player]);

  // Lock-screen/notification Previous/Next buttons - a native SessionCommand
  // patch (see patches/expo-audio+1.1.1.patch), since expo-audio's own API
  // only ever exposed seek forward/backward, never real track navigation.
  // The native side (AudioMediaSessionCallback/AudioControlsService) only
  // notifies which direction was tapped - it makes no boundary decision of
  // its own. Deliberately reuses the SAME handleNext/handlePrevious the
  // in-app buttons already call, so there's no second boundary check to
  // keep in sync: both paths run through the identical canGoNext/
  // canGoPrevious-gated functions, which already no-op correctly at either
  // end of the queue, or when there's no queue at all (e.g. a single
  // mantra). Per a deliberate scope decision, the lock-screen buttons always
  // show rather than graying out at a boundary - a silent no-op tap there,
  // same as this screen's own buttons would produce if they weren't
  // visually disabled.
  // 'skipCommand' isn't part of expo-audio's own AudioEvents type (it only
  // exists on this patched native build), hence the narrow cast below rather
  // than widening the library's real type declarations.
  useEffect(() => {
    const subscription = (
      player as unknown as {
        addListener: (
          eventName: 'skipCommand',
          listener: (direction: 'next' | 'previous') => void
        ) => { remove: () => void };
      }
    ).addListener('skipCommand', (direction) => {
      if (direction === 'next') {
        handleNext();
      } else {
        handlePrevious();
      }
    });

    return () => subscription.remove();
  }, [player, handleNext, handlePrevious]);

  // Keep the shared store's mirror of this screen's status fresh (position,
  // play state, counter) so the mini-player can reflect it. No-ops safely
  // via updateNowPlayingStatus's own feedId guard if this screen's audio has
  // been pre-empted by something else in the meantime.
  useEffect(() => {
    if (!feedId) return;

    usePlaybackStore.getState().updateNowPlayingStatus(feedId, {
      isPlaying: status.playing,
      positionSeconds: status.currentTime,
      durationSeconds: status.duration,
      counter: currentFeedData?.isRepeatable
        ? { chantCount, targetCount, isAutoLooping }
        : undefined,
    });
  }, [feedId, status.playing, status.currentTime, status.duration, chantCount, targetCount, isAutoLooping]);

  // If a different persistent feedId takes over the store's `persistent`
  // slot while this screen's audio happens to still be playing (e.g. this
  // screen is sitting mounted-but-unfocused in the background Tabs stack),
  // pause locally so this screen's own UI correctly reflects "not playing"
  // rather than silently disagreeing with reality. This is a defensive
  // backstop, not the primary mechanism: registerPlaybackStart already calls
  // this screen's own `pause()` via its stored closure during a same-mode
  // hand-off (a different mantra/aarti/bhajan taking over) - a ringtone
  // preempting this screen also already calls `pause()` on it directly, not
  // `stop()`, per the ringtone-preempts-persistent hand-off rule.
  //
  // The instanceId check matters for the same reason it does in
  // playbackStore.ts's same-mode hand-off: during a skip, this screen's own
  // `feedId` (route param) updates before the store's `persistent.nowPlaying
  // .feedId` catches up (that only happens once registerPlaybackStart
  // re-fires for the new content). Without the instanceId check, that brief
  // window looks identical to a genuine preemption by something else and
  // would incorrectly pause this screen's own just-started new track.
  const preemptedByFeedId = usePlaybackStore((state) =>
    state.persistent &&
    state.persistent.nowPlaying.feedId !== feedId &&
    state.persistent.nowPlaying.instanceId !== playerInstanceId
      ? state.persistent.nowPlaying.feedId
      : null
  );

  useEffect(() => {
    if (preemptedByFeedId && status.playing) {
      console.log('⏸️ Audio Player: preempted by another persistent player, pausing locally:', preemptedByFeedId);
      player.pause();
      // This screen's own content just got bumped - it's no longer the
      // thing the user is actively listening to, so stop caching it.
      if (feedId) cancelBackgroundDownload(feedId);
    }
  }, [preemptedByFeedId, status.playing, player, feedId]);

  // Clear this screen's entry from the shared store - and its lock-screen
  // controls, if active - on unmount (e.g. the whole (main) tree unmounting
  // on logout - see the coordinator design notes on why ordinary in-app tab
  // navigation does NOT reach this). Also cancels any in-flight background
  // cache download for this feedId - cancelBackgroundDownload only touches
  // the filesystem, never `player`, so it's safe to call unconditionally
  // even though this cleanup itself runs after useAudioPlayer's own
  // release() (see the isMountedRef comment above for why that ordering
  // matters for code that DOES touch `player`). clearLockScreenControls()
  // DOES touch `player`, though, and this cleanup is exactly the code path
  // that ordering hazard describes - wrapped in try/catch for the same
  // reason as the coordinator's stop/pause closures above, not AppState-
  // gated (see that comment for why AppState-gating doesn't apply here).
  useEffect(() => {
    return () => {
      try {
        player.clearLockScreenControls();
        hasActiveLockScreenSessionRef.current = false;
      } catch (error) {
        console.error('Error clearing lock-screen controls during unmount cleanup (player likely already released):', error);
      }
      if (feedId) {
        usePlaybackStore.getState().clearNowPlaying(feedId);
        cancelBackgroundDownload(feedId);
      }
    };
  }, [feedId, player]);

  const progress = targetCount > 0 ? (chantCount / targetCount) * 100 : 0;

  const handleIncrementCount = async () => {
    if (chantCount < targetCount) {
      const newCount = chantCount + 1;
      setChantCount(newCount);

      // Save progress
      if (feedId) {
        await saveCounterProgress(feedId, newCount, targetCount);
      }

      // Celebrate completion
      if (newCount === targetCount) {
        setTimeout(() => {
          Alert.alert(
            t('congratulations'),
            t('mantraChantCompleted').replace('{count}', targetCount.toString()),
            [
              { text: t('continue'), style: 'default' },
              { text: t('resetCounter'), onPress: handleResetCounter, style: 'destructive' },
            ]
          );
        }, 500);
      }
    }
  };


  const handleDecrementCount = async () => {
    if (chantCount > 0) {
      const newCount = chantCount - 1;
      console.log('🔽 Manually decremented count from', chantCount, 'to', newCount);
      setChantCount(newCount);

      // Save progress
      if (feedId) {
        await saveCounterProgress(feedId, newCount, targetCount);
      }

      // If we were auto-looping and count was reduced, ensure auto-loop continues if still below target
      if (isAutoLooping && newCount < targetCount && status.isLoaded && !isLooping) {
        player.loop = false; // Auto-loop uses manual restart, not the native loop flag
        console.log('🔄 Continuing auto-loop from adjusted count:', newCount);
      } else if (newCount >= targetCount && isAutoLooping) {
        // If count reached target, stop auto-loop
        setIsAutoLooping(false);
        console.log('🎯 Target reached by manual decrement adjustment - stopping auto-loop');
      }
    }
  };

  const handleTargetCountChange = async (newTarget: number) => {
    console.log('🎯 Target changed from', targetCount, 'to', newTarget, '- Current count:', chantCount);
    setTargetCount(newTarget);
    setShowTargetSelector(false);

    // Check if auto-looping status should change
    if (status.playing && status.isLoaded) {
      const shouldAutoLoop = chantCount < newTarget;

      if (shouldAutoLoop && !isAutoLooping && !isLooping) {
        // Start auto-looping if count < new target
        console.log('🔄 Starting auto-loop due to target change');
        setIsAutoLooping(true);
        player.loop = false; // Auto-loop uses manual restart, not the native loop flag
      } else if (!shouldAutoLoop && isAutoLooping) {
        // Stop auto-looping if count >= new target
        console.log('⏹️ Stopping auto-loop - target reached');
        setIsAutoLooping(false);
        player.loop = isLooping; // Keep manual loop if enabled
      }
    }

    // Save new target
    if (feedId) {
      await saveCounterProgress(feedId, chantCount, newTarget);
    }
  };

  const handleResetCounter = async () => {
    Alert.alert(
      t('resetCounter'),
      t('resetCounterConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('reset'),
          style: 'destructive',
          onPress: async () => {
            console.log('🔄 Resetting counter to 0');
            setChantCount(0);

            // If audio is playing, restart auto-looping since count is now 0 and target > 0
            if (status.playing && status.isLoaded && targetCount > 0 && !isLooping) {
              setIsAutoLooping(true);
              player.loop = false; // Auto-loop uses manual restart
              console.log('🔄 Restarted auto-loop after counter reset');
            }

            if (feedId) {
              await saveCounterProgress(feedId, 0, targetCount);
            }
          },
        },
      ]
    );
  };

  // expo-audio reports position/duration in seconds, not milliseconds like
  // expo-av did - converted only here, at the display boundary, matching the
  // pattern already used in the Ringtones migration.
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Seek to position in audio. No optimistic local position state is kept
  // during the seek (unlike the old expo-av code) - status.currentTime is
  // the single source of truth, so there's up to ~500ms of visual lag before
  // the thumb reflects a tap-to-seek. Same accepted trade-off as the
  // Ringtones migration, for the same reason: reintroducing manual position
  // state would undo the point of the reactive status hook.
  const seekToPosition = async (positionSeconds: number) => {
    if (status.isLoaded) {
      try {
        await player.seekTo(positionSeconds);
        // Haptic feedback for seeking
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.error('Error seeking audio:', error);
      }
    }
  };

  // Toggle playback speed
  const togglePlaybackSpeed = () => {
    if (status.isLoaded) {
      try {
        const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
        const currentIndex = speeds.indexOf(playbackSpeed);
        const nextSpeed = speeds[(currentIndex + 1) % speeds.length];

        player.shouldCorrectPitch = true;
        player.setPlaybackRate(nextSpeed);
        setPlaybackSpeed(nextSpeed);
      } catch (error) {
        console.error('Error changing playback speed:', error);
      }
    }
  };

  // Toggle loop mode
  const toggleLoop = () => {
    if (status.isLoaded) {
      try {
        const newLoopState = !isLooping;
        setIsLooping(newLoopState);

        if (newLoopState) {
          // Manual loop enabled - disable auto-loop
          console.log('🔁 Manual loop enabled - disabling auto-loop');
          setIsAutoLooping(false);
          player.loop = true;
        } else {
          // Manual loop disabled - check if we should enable auto-loop
          const shouldAutoLoop = chantCount < targetCount && status.playing;
          console.log('🔁 Manual loop disabled - Auto-loop:', shouldAutoLoop);
          setIsAutoLooping(shouldAutoLoop);
          player.loop = false; // Auto-loop doesn't use the native loop flag
        }
      } catch (error) {
        console.error('Error toggling loop:', error);
      }
    }
  };

  // Handle progress bar press for seeking
  const handleProgressBarPress = (event: any) => {
    if (status.duration > 0) {
      const { locationX } = event.nativeEvent;
      const progressBarWidth = width - 48; // Account for padding
      const percentage = locationX / progressBarWidth;
      const seekPosition = status.duration * percentage;
      seekToPosition(Math.max(0, Math.min(seekPosition, status.duration)));
    }
  };

  // Change volume
  const changeVolume = (newVolume: number) => {
    if (status.isLoaded) {
      try {
        player.volume = newVolume;
        setVolume(newVolume);
      } catch (error) {
        console.error('Error changing volume:', error);
      }
    }
  };

  // Toggle volume slider
  const toggleVolumeSlider = () => {
    setShowVolumeSlider(!showVolumeSlider);
  };

  // Mirrors WallpaperFeedCard's handleLike: no pre-call optimism, the local
  // state only changes once the API call has actually succeeded - reads
  // currentFeedData (not raw feedData) so this can never act on a stale
  // previous item's isLiked/likesCount during the brief refetch window a
  // feedId change opens (same staleness class getContentData's own guard
  // exists for). feedIdRef is re-checked after the await, not just before -
  // a skip/auto-advance while this call was in flight means feedData has
  // already moved on to different content by the time it resolves, and
  // patching it here would corrupt THAT content's like state instead.
  const handleLike = () => {
    if (!currentFeedData || isLiking) return;

    const likedFeedId = currentFeedData.id.toString();
    const wasLiked = currentFeedData.isLiked;
    const previousLikesCount = currentFeedData.likesCount;

    setIsLiking(true);

    (async () => {
      try {
        if (wasLiked) {
          await feedService.unlikeFeed(likedFeedId);
        } else {
          await feedService.likeFeed(likedFeedId);
        }

        if (isMountedRef.current && feedIdRef.current === likedFeedId) {
          setFeedData((prev) =>
            prev && prev.id.toString() === likedFeedId
              ? {
                  ...prev,
                  isLiked: !wasLiked,
                  likesCount: Math.max(0, wasLiked ? previousLikesCount - 1 : previousLikesCount + 1),
                }
              : prev
          );
        }
      } catch (error) {
        console.error('❌ Audio Player: Error toggling like:', error);
        Alert.alert('Error', 'Failed to update like. Please try again.');
      } finally {
        if (isMountedRef.current) setIsLiking(false);
      }
    })();
  };

  // Mirrors WallpaperFeedCard's handleShare (call the API, bump the count,
  // then open the native share sheet) - same staleness guard as handleLike
  // above around the local setFeedData patch, since (unlike
  // WallpaperFeedCard's version, which only touches the Zustand feed store)
  // this one touches this screen's own React state.
  const handleShare = async () => {
    if (!currentFeedData) return;

    const sharedFeedId = currentFeedData.id.toString();

    try {
      await feedService.shareFeed(sharedFeedId, { platform: 'native_share' });

      if (isMountedRef.current && feedIdRef.current === sharedFeedId) {
        setFeedData((prev) =>
          prev && prev.id.toString() === sharedFeedId
            ? { ...prev, sharesCount: prev.sharesCount + 1 }
            : prev
        );
      }

      const shareTitle = contentData.title?.toString();
      await Share.share({
        message: shareTitle
          ? `Check out this: ${shareTitle}\n\nShared from Bhav Bhakti App`
          : 'Check out this amazing content from Bhav Bhakti App!',
        url: contentData.audioUrl?.toString(),
      });
    } catch (error) {
      console.error('❌ Audio Player: Error sharing:', error);
      Alert.alert('Error', 'Failed to share. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={'#5D4E37'} />
          <Text weight="medium" style={styles.backButtonText}>{t('back')}</Text>
        </TouchableOpacity>
      </View>

      {/* Separator Line */}
      <View style={styles.separator} />

      {/* Loading State */}
      {isFeedLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={goldenTempleTheme.colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>{t('loadingMantraDetails')}</Text>
        </View>
      )}

      {/* Error State */}
      {feedError && !isFeedLoading && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={50} color={goldenTempleTheme.colors.error} />
          <Text style={styles.errorText}>{feedError}</Text>
          <TouchableOpacity onPress={fetchFeedData} style={styles.retryButton}>
            <Text weight="semibold" style={styles.retryButtonText}>{t('retryButtonText')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content - fixed three-region layout, no scrolling */}
      {!isFeedLoading && !feedError && (
        <View style={[styles.playerBody, { paddingBottom: contentPadding }]}>
          {/* Compact content header strip */}
          <View style={styles.contentHeaderStrip}>
            <View style={styles.contentHeaderTextBlock}>
              <Text weight="bold" numberOfLines={1} style={styles.contentTitleCompact}>{contentData.title}</Text>
              {/* Artist subtitle (caption-sourced), not deity - CLAUDE.md §56
                  Phase 0. Deity still displays in InfoSheet, and separately
                  still drives the native lock-screen "artist" field. */}
              <Text numberOfLines={1} style={styles.contentSubtitleCompact}>{contentData.artist}</Text>
            </View>
            <View style={styles.headerIconsRow}>
              <TouchableOpacity
                onPress={handleLike}
                disabled={isLiking}
                style={styles.headerIconButton}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={currentFeedData?.isLiked ? 'heart' : 'heart-outline'}
                  size={22}
                  color={currentFeedData?.isLiked ? '#C41E3A' : '#8B7355'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShare}
                style={styles.headerIconButton}
                activeOpacity={0.7}
              >
                <Ionicons name="share-outline" size={22} color="#8B7355" />
              </TouchableOpacity>

              {showTrackNav && (
                <TouchableOpacity
                  onPress={() => queueSheetRef.current?.present()}
                  style={styles.headerIconButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="list-outline" size={22} color={'#5D4E37'} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => infoSheetRef.current?.present()}
                style={styles.headerIconButton}
                activeOpacity={0.7}
              >
                <Ionicons name="information-circle-outline" size={22} color={'#5D4E37'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Visual Area - flexible, fills remaining space */}
          <View style={styles.lyricsSection}>
            <LinearGradient
              colors={goldenTempleTheme.gradients.sunrise}
              style={styles.lyricsContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Background Image */}
              {contentData.thumbnailUrl ? (
                <Image
                  source={{ uri: contentData.thumbnailUrl.toString() }}
                  style={styles.lyricsBackground}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.lyricsDefaultBg}>
                  <Ionicons name="musical-notes" size={120} color="rgba(255,255,255,0.3)" />
                </View>
              )}

              {/* Overlay Gradient */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.lyricsOverlay}
              />

              {/* Content */}
              <View style={styles.lyricsContent}>
                <Text weight="bold" style={styles.lyricsText}>{contentData.title}</Text>

                {/* Audio Progress */}
                <View style={styles.progressSection}>
                  <TouchableOpacity
                    style={styles.progressBar}
                    onPress={handleProgressBarPress}
                    activeOpacity={0.7}
                  >
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
                            left: `${(status.currentTime / status.duration) * 100}%`,
                            opacity: 0.8,
                          }
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                  <View style={styles.timeContainer}>
                    <Text weight="medium" style={styles.timeText}>{formatTime(status.currentTime)}</Text>
                    <Text weight="medium" style={styles.timeText}>{formatTime(status.duration)}</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Compact Control Bar - fixed */}
          <View style={styles.audioControls}>
            {/* Secondary Controls Row */}
            <View style={styles.secondaryControls}>
              <TouchableOpacity onPress={toggleLoop} style={styles.secondaryControlButton}>
                <Ionicons
                  name="repeat"
                  size={20}
                  color={isLooping ? '#FF5722' : '#8B7355'}
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={togglePlaybackSpeed} style={styles.secondaryControlButton}>
                <Text weight="semibold" style={styles.speedText}>{playbackSpeed}x</Text>
              </TouchableOpacity>

              {/* Counter sheet trigger - only for content flagged as repeatable */}
              {feedData?.isRepeatable && (
                <TouchableOpacity
                  onPress={() => counterSheetRef.current?.present()}
                  style={styles.secondaryControlButton}
                >
                  <Ionicons name="stats-chart-outline" size={20} color={designSystemTheme.colors.primary} />
                  <View style={styles.counterBadge}>
                    <Text weight="semibold" style={styles.counterBadgeText}>{chantCount}/{targetCount}</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* Volume Slider */}
            {showVolumeSlider && (
              <View style={styles.volumeContainer}>
                <Text weight="semibold" style={styles.volumeLabel}>Volume</Text>
                <View style={styles.volumeSliderContainer}>
                  <TouchableOpacity
                    style={styles.volumeSlider}
                    onPress={(event) => {
                      const { locationX } = event.nativeEvent;
                      const sliderWidth = 200; // Fixed width
                      const percentage = locationX / sliderWidth;
                      const newVolume = Math.max(0, Math.min(percentage, 1));
                      changeVolume(newVolume);
                    }}
                  >
                    <View style={styles.volumeTrack}>
                      <View
                        style={[
                          styles.volumeFill,
                          { width: `${volume * 100}%` }
                        ]}
                      />
                      <View
                        style={[
                          styles.volumeThumb,
                          { left: `${volume * 100}%` }
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Primary Controls Row */}
            <View style={styles.primaryControls}>
              {showTrackNav && (
                <TouchableOpacity
                  onPress={() => usePlaybackStore.getState().toggleShuffle()}
                  style={styles.trackNavButton}
                >
                  <Ionicons name="shuffle" size={22} color={queue?.isShuffled ? '#FF5722' : '#5D4E37'} />
                </TouchableOpacity>
              )}

              {showTrackNav && (
                <TouchableOpacity
                  onPress={handlePrevious}
                  disabled={!canGoPrevious}
                  style={[styles.trackNavButton, !canGoPrevious && styles.trackNavButtonDisabled]}
                >
                  <Ionicons name="play-skip-back" size={28} color={'#5D4E37'} />
                </TouchableOpacity>
              )}

              <Animated.View
                style={[
                  styles.playButtonContainer,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={togglePlayback}
                  disabled={isAudioLoading}
                >
                  <LinearGradient
                    colors={['#FF5722', '#E64A19']}
                    style={styles.playButtonGradient}
                  >
                    {isAudioLoading ? (
                      <Animated.View style={{ transform: [{ rotate: rotateInterpolation }] }}>
                        <Ionicons name="refresh" size={40} color="#fff" />
                      </Animated.View>
                    ) : (
                      <Ionicons
                        name={status.playing ? 'pause' : 'play'}
                        size={40}
                        color="#fff"
                        style={!status.playing ? { marginLeft: 4 } : {}}
                      />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {showTrackNav && (
                <TouchableOpacity
                  onPress={handleNext}
                  disabled={!canGoNext}
                  style={[styles.trackNavButton, !canGoNext && styles.trackNavButtonDisabled]}
                >
                  <Ionicons name="play-skip-forward" size={28} color={'#5D4E37'} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Chant counter, moved off-screen into an overlay sheet */}
      <CounterSheet
        ref={counterSheetRef}
        chantCount={chantCount}
        targetCount={targetCount}
        isAutoLooping={isAutoLooping}
        onIncrement={handleIncrementCount}
        onDecrement={handleDecrementCount}
        onSelectTarget={handleTargetCountChange}
        onOpenMoreTargets={() => setShowTargetSelector(true)}
      />

      {/* Description/tags/deity/objective, moved off-screen into an overlay sheet */}
      <InfoSheet
        ref={infoSheetRef}
        title={contentData.title as string}
        description={contentData.description as string}
        deity={contentData.deity as string}
        objective={contentData.objective as string}
        tags={(contentData.tags as string[]) || []}
      />

      {/* Active queue (aarti/bhajan only), moved off-screen into an overlay sheet */}
      <QueueSheet
        ref={queueSheetRef}
        items={queueDisplayItems}
        currentIndex={queueDisplayIndex}
        onSelectIndex={handleJumpToQueueIndex}
      />

      {/* Target Count Selector Modal */}
      {showTargetSelector && (
        <View style={styles.targetSelectorOverlay}>
          <View style={styles.targetSelectorModal}>
            <Text weight="semibold" style={styles.targetSelectorTitle}>Select Target Count</Text>
            <View style={styles.targetOptionsContainer}>
              {TARGET_COUNT_OPTIONS.map((count) => (
                <TouchableOpacity
                  key={count}
                  onPress={() => handleTargetCountChange(count)}
                  style={[
                    styles.targetOption,
                    targetCount === count && styles.targetOptionSelected,
                  ]}
                >
                  <Text
                    weight="semibold"
                    style={[
                      styles.targetOptionText,
                      targetCount === count && styles.targetOptionTextSelected,
                    ]}
                  >
                    {count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => setShowTargetSelector(false)}
              style={styles.targetSelectorCancel}
            >
              <Text weight="medium" style={styles.targetSelectorCancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: goldenTempleTheme.colors.background, // Light cream background
  },
  // Header with Back Button
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.md,
    backgroundColor: goldenTempleTheme.colors.background,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: goldenTempleTheme.spacing.sm,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#5D4E37', // Warm brown text
    marginLeft: 4,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(205, 180, 140, 0.2)', // Light brown separator
    marginHorizontal: goldenTempleTheme.spacing.lg,
  },
  // Main player body - fixed three-region layout (header strip / visual area / controls)
  playerBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: goldenTempleTheme.spacing.md,
  },
  // Compact Content Header Strip
  contentHeaderStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: goldenTempleTheme.spacing.sm,
  },
  contentHeaderTextBlock: {
    flex: 1,
    marginRight: goldenTempleTheme.spacing.sm,
  },
  contentTitleCompact: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5D4E37',
  },
  contentSubtitleCompact: {
    fontSize: 13,
    color: '#8B7355',
    marginTop: 2,
  },
  headerIconButton: {
    padding: 6,
  },
  headerIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Lyrics Section - flexible visual area
  lyricsSection: {
    flex: 1,
    marginBottom: goldenTempleTheme.spacing.md,
  },
  lyricsContainer: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    ...goldenTempleTheme.shadows.lg,
  },
  lyricsBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  lyricsDefaultBg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lyricsOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  lyricsContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
  },
  lyricsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  progressSection: {
    width: '100%',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    marginBottom: 8,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#edc77a',
    borderRadius: 3,
  },
  progressThumb: {
    position: 'absolute',
    top: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFD700',
    marginLeft: -7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  // Audio Controls - compact, fixed
  audioControls: {
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 16,
    borderWidth: 0,
    borderColor: 'rgba(218, 165, 32, 0.6)',
    ...goldenTempleTheme.shadows.lg,
  },
  secondaryControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  secondaryControlButton: {
    padding: 10,
    backgroundColor: '#F5E6D3',
    borderRadius: 16,
    borderWidth: 0,
    borderColor: 'rgba(218, 165, 32, 0.5)',
    minWidth: 50,
    alignItems: 'center',
    ...goldenTempleTheme.shadows.sm,
  },
  counterBadge: {
    marginTop: 2,
  },
  counterBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: designSystemTheme.colors.primary,
  },
  speedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5D4E37',
  },
  primaryControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
    marginBottom: 12,
  },
  // Same position/style as the old 10s-seek buttons Phase 1 removed - now a
  // real track-skip, not a seek, so play-skip-back/forward are no longer an
  // ambiguous icon choice on this screen.
  trackNavButton: {
    padding: 14,
    backgroundColor: '#F5E6D3',
    borderRadius: 25,
    borderWidth: 0,
    borderColor: 'rgba(218, 165, 32, 0.5)',
    ...goldenTempleTheme.shadows.sm,
  },
  trackNavButtonDisabled: {
    opacity: 0.4,
  },
  playButtonContainer: {
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    ...goldenTempleTheme.shadows.lg,
  },
  playButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  volumeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    width: '100%',
    borderWidth: 0,
    borderColor: 'rgba(218, 165, 32, 0.6)',
    ...goldenTempleTheme.shadows.md,
  },
  volumeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5D4E37',
    marginBottom: 8,
  },
  volumeSliderContainer: {
    alignItems: 'center',
  },
  volumeSlider: {
    width: 200,
    height: 20,
    justifyContent: 'center',
  },
  volumeTrack: {
    height: 4,
    backgroundColor: '#F5E6D3',
    borderRadius: 2,
    position: 'relative',
  },
  volumeFill: {
    height: '100%',
    backgroundColor: '#FF5722',
    borderRadius: 2,
  },
  volumeThumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF5722',
    marginLeft: -8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: goldenTempleTheme.colors.text.secondary,
    textAlign: 'center',
  },
  // Error States
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: goldenTempleTheme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  // Target Selector Modal
  targetSelectorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  targetSelectorModal: {
    backgroundColor: 'rgba(218, 165, 32, 0.95)',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    maxWidth: 300,
    ...goldenTempleTheme.shadows.lg,
  },
  targetSelectorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  targetOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  targetOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minWidth: 60,
    alignItems: 'center',
  },
  targetOptionSelected: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  targetOptionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  targetOptionTextSelected: {
    color: goldenTempleTheme.colors.primary.DEFAULT,
  },
  targetSelectorCancel: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  targetSelectorCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});
