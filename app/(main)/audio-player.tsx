import React, { useState, useEffect, useCallback, useId, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  ActivityIndicator,
  Alert,
  AppState,
  Share,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { ParamListBase } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Gesture, GestureDetector, Directions } from 'react-native-gesture-handler';
import { Text } from '@/components/atoms';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { designSystemTheme } from '@/styles/designSystemTheme';
import { feedService } from '@/features/feed/services/feedService';
import { Feed } from '@/types/feed';
import { useTranslation } from 'react-i18next';
import { useI18nStore } from '@/shared/stores/i18nStore';
import { CounterSheet, MoreTargetsSheet, QueueSheet } from '@/components/molecules/AudioPlayerSheets';
import { usePlaybackStore, QueueItem } from '@/store/playbackStore';
import { useChantHintStore } from '@/store/chantHintStore';
import ChantHintBubble from '@/components/molecules/ChantHintBubble/ChantHintBubble';

import { useFeedStore } from '@/store/feedStore';
import { formatCount } from '@/utils/formatCount';
import { containsDevanagari } from '@/utils/textUtils';
import WhatsAppIcon from '../../assets/icons/whatsapp.svg';

const { width } = Dimensions.get('window');

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
// silently share one cache file). feedId is guaranteed unique.
// cacheDirectory, not documentDirectory - matches AutoplayFeedCard.tsx's
// identical naming convention for this exact cache (see its own comment on
// why both files must agree), and means this re-downloadable playback cache
// no longer accumulates forever/is untouched by Android's "Clear Cache". See
// cacheEviction.ts for the startup age-based sweep that now backstops this
// too.
const getLocalCachePath = (feedIdForCache: string, audioUri: string): string =>
  `${FileSystem.cacheDirectory}audio_player_${feedIdForCache}.${getAudioFileExtension(audioUri)}`;

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

// Lets the component's deferred-download logic (see startDeferredCacheDownload
// below, in the component body) wait for a SPECIFIC feedId's cancellation to
// genuinely finish tearing down its native connection, before opening a
// DIFFERENT feedId's own new download connection - closes the gap where a
// switch-away's cancellation was only ever fired-and-forgotten, never waited
// on by whatever came next. A plain synchronous Map lookup - returns
// undefined (nothing to wait for) on the common path where there's no
// cancellation in flight for that feedId at all.
const getPendingCancellation = (feedIdForCache: string): Promise<void> | undefined =>
  inFlightCancellations.get(feedIdForCache);

// How long to wait for status.isLoaded to confirm real buffering success
// before starting the background-cache download anyway (see
// startDeferredCacheDownload/the isLoaded-gated effect in the component
// body). A safety net only - the common path starts the download as soon as
// isLoaded fires, adaptively, regardless of how long that actually takes on
// the user's real connection. This exists purely so a genuine caching
// opportunity is never silently lost forever if isLoaded never fires for
// some unrelated reason (e.g. the user backs out before the track ever
// finishes buffering).
const PENDING_CACHE_DOWNLOAD_SAFETY_TIMEOUT_MS = 20000;

// Diagnostic flag, kept as a ready-to-use switch rather than removed
// outright - set to false to disable the background-caching download
// entirely (downloadToCacheInBackground is never called, from any trigger),
// while leaving everything else completely untouched: the cache-CHECK logic
// (getCachedLocalUri), playback itself, and the render gates all behave
// exactly as normal. Was set to false to test whether large files' loading
// struggles were caused by the background download competing for bandwidth
// (CLAUDE.md's caching investigation) - CONCLUDED: they weren't. The real
// root cause was a route-param URL corruption bug (%2F/%20 getting silently
// decoded back to literal characters via useLocalSearchParams' unconditional
// decodeURIComponent, corrupting Firebase Storage URLs before they ever
// reached the player), now fixed and confirmed working via a real on-device
// logcat capture. Restored to `true` accordingly - normal cache-hit/cache-
// miss behavior, background caching genuinely active again.
const DIAGNOSTIC_ENABLE_BACKGROUND_CACHING = true;

export default function AudioPlayerScreen() {
  const params = useLocalSearchParams();
  const feedId = params.feedId?.toString();
  const autoPlay = params.autoPlay === 'true';
  const { t } = useTranslation('player');
  // Real fix, not a rename: getLocalizedText (below) previously had no
  // connection to the app's selected language at all - its own comment
  // claimed "current language first" but the code hardcoded English first,
  // unconditionally, since this screen never imported the language store.
  const { language } = useI18nStore();
  // Views pill (CLAUDE.md §56 Phase 3) - reuses AutoplayFeedCard's proven
  // viewFeed/incrementView pattern rather than building new tracking.
  const { incrementView } = useFeedStore();

  // Hide the bottom tab bar while this screen is focused (CLAUDE.md §56
  // Phase 5 correction) - a full-screen, immersive player, consistent with
  // this already being a hidden Tabs.Screen (href: null) rather than a
  // normal visible tab. Also fixes a real conflict: the swipe-up-to-open-
  // queue gesture's touch area overlapped the tab bar's own touch area.
  // audio-player.tsx is registered directly as a Tabs.Screen (not nested in
  // an intermediate stack), so bottom-tabs picks up tabBarStyle from this
  // screen's own options while it's focused - no navigation.getParent()
  // needed. useFocusEffect (not a plain mount/unmount useEffect) is
  // required because Tabs screens in this app don't unmount between
  // navigations (confirmed elsewhere in this codebase) - a plain effect
  // would only ever fire once, not correctly toggle every time the user
  // re-enters vs. leaves this specific screen. The cleanup resets
  // tabBarStyle to undefined (not a captured value) so every other screen
  // falls back to _layout.tsx's own default, untouched.
  const navigation = useNavigation<BottomTabNavigationProp<ParamListBase>>();
  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ tabBarStyle: { display: 'none' } });
      return () => {
        navigation.setOptions({ tabBarStyle: undefined });
      };
    }, [navigation])
  );

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

  // Android's hardware back button AND its edge-swipe back gesture both
  // dispatch through this same 'hardwareBackPress' event - confirmed
  // correct for this app specifically because app.config.js sets
  // predictiveBackGestureEnabled: false, so the gesture is treated as a
  // legacy back-press rather than routed through Android 13+'s separate
  // predictive-back API (which BackHandler does NOT intercept). Without
  // this, either input fell through to React Navigation's own default pop
  // behavior, which - like the plain router.back() this screen used to call
  // unconditionally (see handleBack's own comment above) - always landed on
  // Home regardless of actual entry point, since it doesn't know about
  // returnTo at all. Returning true tells the native side "handled, don't
  // also run the default pop" so handleBack's returnTo/router.back() logic
  // is the ONLY thing that runs, keeping this screen's three exit paths
  // (chevron tap, hardware button, gesture) in permanent lockstep by
  // construction - any future change to handleBack's logic covers all three
  // automatically. useFocusEffect (not a plain mount/unmount effect) is
  // required for the same reason as the tabBarStyle effect above: this
  // listener must attach/detach with focus, not just mount/unmount, since
  // Tabs screens in this app don't unmount between navigations - a
  // mount-only effect would still be listening (and would still hijack back
  // presses) even while a totally different tab is focused.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => subscription.remove();
    }, [handleBack])
  );

  // Feed data state
  const [feedData, setFeedData] = useState<Feed | null>(null);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);

  // Counter state
  const [chantCount, setChantCount] = useState(0);
  const [targetCount, setTargetCount] = useState(108);

  // Chant-counter attention bubble (CLAUDE.md): shown ~1s after a genuinely
  // new mantra loads, capped via chantHintStore (3/calendar-day + once per
  // app session - see that store's own comments). chantHintTimeoutRef lets a
  // rapid feedId-to-feedId switch cancel a still-pending timer from the
  // PREVIOUS track before it fires for content no longer being viewed.
  const [showChantHint, setShowChantHint] = useState(false);
  const chantHintTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Theory 1 fix (see CLAUDE.md's caching investigation): a cache-miss no
  // longer starts downloadToCacheInBackground() immediately alongside
  // player.play() - doing so meant the live stream the user is actually
  // waiting on always had to compete with a full second download of the
  // identical file for the same bandwidth, at exactly the moment startup
  // latency matters most. Instead, togglePlayback parks the pending
  // download's details here, and the isLoaded-gated effect below (or the
  // safety-net timeout) is what actually starts it - fully adaptive to real
  // network conditions, not a fixed delay. previousFeedId is carried
  // alongside for the Theory 4 fix (startDeferredCacheDownload below).
  const pendingCacheDownloadRef = React.useRef<{
    feedId: string;
    audioUrl: string;
    previousFeedId: string | null;
  } | null>(null);
  const pendingCacheDownloadTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Component-scoped wrapper around the module-scope cancelBackgroundDownload
  // - also clears a PENDING (not-yet-started) deferred download for this
  // feedId, not just an already-in-flight one. The module-scope function has
  // no visibility into pendingCacheDownloadRef at all, so calling it alone
  // would silently fail to honor "stop caching this" for content whose
  // download hadn't actually started yet (a real, new possibility now that
  // starts are deferred). Every call site in this component that means "the
  // user is no longer interested in caching this content" (pause,
  // switching away, coordinator stop/pause, preemption, unmount) uses this
  // instead of the bare module-scope function.
  const cancelBackgroundDownloadForFeed = (targetFeedId: string) => {
    cancelBackgroundDownload(targetFeedId);
    if (pendingCacheDownloadRef.current?.feedId === targetFeedId) {
      if (pendingCacheDownloadTimeoutRef.current) {
        clearTimeout(pendingCacheDownloadTimeoutRef.current);
        pendingCacheDownloadTimeoutRef.current = null;
      }
      pendingCacheDownloadRef.current = null;
    }
  };

  // Actually starts a deferred background-cache download - called once
  // status.isLoaded confirms real buffering success (the common path) or the
  // safety-net timeout fires (the fallback path), never directly from
  // togglePlayback. Theory 4 fix: waits for the PREVIOUS content's own
  // background download cancellation to genuinely finish (not just "signal
  // sent") before opening THIS content's own competing download connection -
  // playback itself already started immediately in togglePlayback,
  // unaffected by this wait. The loadedFeedIdRef check after the await
  // guards against a slow-resolving wait outliving a later switch-away: if
  // the user has already moved on to different content by the time the old
  // cancellation finishes, starting a download here would just recreate the
  // exact bandwidth-waste problem this whole mechanism exists to prevent.
  const startDeferredCacheDownload = async (
    targetFeedId: string,
    targetAudioUrl: string,
    previousFeedId: string | null
  ) => {
    if (!DIAGNOSTIC_ENABLE_BACKGROUND_CACHING) {
      console.log('🧪 [DIAGNOSTIC] Background caching disabled - skipping download for feed:', targetFeedId);
      return;
    }
    if (previousFeedId) {
      const pendingCancellation = getPendingCancellation(previousFeedId);
      if (pendingCancellation) {
        await pendingCancellation;
      }
    }
    if (loadedFeedIdRef.current !== targetFeedId) return;
    downloadToCacheInBackground(targetFeedId, targetAudioUrl);
  };

  // Bottom sheet refs
  const counterSheetRef = React.useRef<BottomSheetModal>(null);
  const moreTargetsSheetRef = React.useRef<BottomSheetModal>(null);
  const queueSheetRef = React.useRef<BottomSheetModal>(null);

  // Swipe-up-to-open-queue gesture (CLAUDE.md §56 Phase 5) - replaces the
  // old header queue icon as the trigger. .runOnJS(true) is required since
  // presenting the sheet is a plain ref call, not a worklet. Aarti/bhajan-
  // only in practice: the GestureDetector using this is only ever rendered
  // when showTrackNav is true (see the render below) - mantra never has a
  // queue at all (never calls setQueue), so this gesture is simply never
  // mounted for it, matching how the old icon was already conditional.
  // Memoized with an empty dep array - `status` (useAudioPlayerStatus) re-renders
  // this whole screen on every playback tick, and a bare Gesture.Fling() here
  // would be recreated on every one of those renders, forcing GestureDetector
  // to re-attach its native handler on queueSwipeHandleZone repeatedly. Fixed
  // as the likely cause of the "आगे बजेगा" Up Next label rendering truncated
  // to just "आगे" on-device - queueSheetRef is a stable ref, safe to omit.
  const swipeUpToOpenQueue = useMemo(
    () =>
      Gesture.Fling()
        .direction(Directions.UP)
        .runOnJS(true)
        .onEnd(() => {
          queueSheetRef.current?.present();
        }),
    []
  );

  // Refs to store current state values for callback access (fixes stale closure issue)
  const isAutoLoopingRef = React.useRef(isAutoLooping);
  const chantCountRef = React.useRef(chantCount);
  const targetCountRef = React.useRef(targetCount);
  const feedIdRef = React.useRef(feedId);

  // The chant counter is deliberately session-scoped only, NOT persisted
  // across app restarts or content switches (no AsyncStorage involved at
  // all, unlike an earlier version of this code). "Session" here means "for
  // as long as this exact feedId remains the actively-loaded content" -
  // resuming the SAME mantra via the mini-player (pause, browse elsewhere,
  // come back) must keep its count, since that's still the same load, just
  // paused; but re-selecting that same mantra AFTER it was fully swapped
  // out for something else must start over at 0, since it's a fresh load,
  // not a resume. The signal that distinguishes these two cases already
  // exists elsewhere in this file: `feedId` (from useLocalSearchParams)
  // only changes value on a genuine switch to different content -
  // MiniPlayer's handleBodyPress deliberately re-passes the SAME feedId
  // when returning to already-loaded content, so that navigation is a
  // same-value update React bails out of re-running effects for, not a
  // fresh [feedId]-effect firing. fetchFeedData below (itself gated on
  // [feedId]) is exactly that boundary - resetting chantCount/targetCount
  // there, unconditionally, covers both required "fresh load" cases at
  // once: switching in from different content, and switching back in after
  // having been fully replaced (both are, structurally, just "feedId
  // changed to a new value" from this effect's point of view - there's no
  // way to tell those two apart from in here, and the requirement doesn't
  // need there to be one). This is also exactly why the pause-on-switch
  // cleanup above is keyed on the same [feedId, player] dependency - the
  // two mechanisms (silence the old content, reset the new content's
  // counter) rely on the identical signal by design, not by coincidence.

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

      // Fresh load of (possibly new, possibly repeat) content - always
      // starts the counter at 0/108. See this function's own comment above
      // for why an unconditional reset here is correct rather than a bug.
      setChantCount(0);
      setTargetCount(108);

      // Chant hint bubble: clear immediately (a bubble left over from the
      // previous track shouldn't carry into this one) and cancel any timer
      // still pending from that previous track's own scheduling below.
      setShowChantHint(false);
      if (chantHintTimeoutRef.current) {
        clearTimeout(chantHintTimeoutRef.current);
        chantHintTimeoutRef.current = null;
      }
      // feed.type/feed.isRepeatable read directly off THIS fetch's own
      // response, not contentData/feedData state (which haven't updated yet
      // at this point in the function) - avoids the exact staleness class of
      // bug getContentData's own comment above warns about. showTrackNav's
      // own definition (contentData.type === 'aarti' || 'bhajan') is mirrored
      // here rather than reused, since showTrackNav itself is derived from
      // the (still-stale-at-this-point) contentData.
      const isMantraWithCounter =
        feed.type !== 'aarti' && feed.type !== 'bhajan' && feed.isRepeatable;
      if (isMantraWithCounter && useChantHintStore.getState().canShow()) {
        chantHintTimeoutRef.current = setTimeout(() => {
          setShowChantHint(true);
          useChantHintStore.getState().recordShown();
        }, 1000);
      }

      // Track view - fire-and-forget (matches AutoplayFeedCard's pattern),
      // not awaited: view-tracking has no bearing on whether this screen is
      // ready to show/play its content, so it must not add to isFeedLoading's
      // duration.
      feedService.viewFeed(feedId)
        .then(() => console.log('👁️ Audio Player: View tracked for feed:', feedId))
        .catch((error) => console.error('❌ Audio Player: Error tracking view:', error));
    } catch (error) {
      console.error('❌ Audio Player: Error fetching feed:', error);
      setFeedError('Failed to load mantra details');
    } finally {
      setIsFeedLoading(false);
    }
  };

  // Helper function to get localized text from JSON field. Genuinely reads
  // the app's selected language now (via the `language` closed over above,
  // from useI18nStore) - previously this comment's own stated intent
  // ("current language first") wasn't actually implemented, since the code
  // hardcoded 'en' first regardless of what was selected. Every caller of
  // this function (title, deity, description, objective) is fixed by this
  // one change, since they all route through here.
  const getLocalizedText = (jsonField: any, fallback: string): string => {
    if (!jsonField) return fallback;

    if (typeof jsonField === 'string') return jsonField;

    if (typeof jsonField === 'object' && !Array.isArray(jsonField)) {
      const keys = Object.keys(jsonField);
      if (keys.length === 0) return fallback;

      // Current language first, then English, then Hindi, then first available.
      return jsonField[language] || jsonField['en'] || jsonField['hi'] || Object.values(jsonField)[0] || fallback;
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
        // `artist` field, load-bearing and unrelated to this on-screen
        // `artist` field.
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
        // Real, confirmed data - always wins once available. See the
        // params-fallback branch below for why this pair exists at all.
        type: feedData.type,
        isRepeatable: feedData.isRepeatable,
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
      // CLAUDE.md playback-switch flash fix: every real entry point
      // (mantras.tsx, index.tsx, search-results.tsx, AudioContentCard.tsx,
      // and this screen's own navigateToQueueItem for Next/Previous) now
      // sends these, so the correct control layout (aarti/bhajan track-nav
      // vs. mantra counter) renders from the very first frame instead of
      // defaulting to mantra until the fetch above resolves and corrects
      // it. 'mantra' is still the default for any caller that ever omits
      // it, matching this whole function's existing fallback philosophy.
      type: (params.type?.toString() as Feed['type'] | undefined) || 'mantra',
      isRepeatable: params.isRepeatable === 'true',
    };
  };

  const contentData = getContentData();
  // Real product decision: the visible UI is gated on the full fetch again
  // (see the render gates below) - no piece-by-piece "pop in" of individual
  // elements. Playback itself still starts immediately from route params via
  // the autoPlay effect further down, completely independent of these render
  // gates - togglePlayback is a plain function with no dependency on what's
  // mounted, so audio can already be playing while the screen still shows
  // the full-screen loading spinner.
  //
  // loadedFeedIdRef.current === feedId (set inside togglePlayback's
  // fresh-load branch, right where player.play() is called) is reused here
  // as "has playback genuinely been initiated for the CURRENT feedId" - the
  // one exception to the render gates below: if fetchFeedData fails but
  // audio already started, the hard error screen would rip away a working
  // player over nothing the user can act on. Deliberately NOT status.playing
  // (live playing/paused state): that would flicker the error screen in and
  // out every time the user pauses their own already-loaded audio, since
  // feedError stays set (sticky) until a real retry succeeds. This ref
  // comparison only changes on a genuine feedId switch, matching exactly the
  // same pattern loadedFeedIdRef is already used for elsewhere in this file.
  const hasStartedPlaybackForCurrentFeed = loadedFeedIdRef.current === feedId;
  // Same staleness guard as getContentData above - null during the same
  // brief feedId-changed-but-not-yet-refetched window, so the like/share/
  // view-count reads and handleLike/handleShare below (the fields that still
  // have no route-param fallback at all - see getContentData's own comment)
  // can't attach a previous item's counts/like-state to the newly-requested
  // feedId. type/isRepeatable used to be read directly off this instead of
  // through contentData - now unified through contentData everywhere (see
  // getContentData), so this guard's scope has narrowed to just the
  // like/share/view fields.
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
    // Covers a genuine unmount (leaving this screen entirely) - a feedId
    // change is already handled by fetchFeedData's own clear at its top, but
    // that only runs on the NEXT call, never on final unmount.
    return () => {
      if (chantHintTimeoutRef.current) {
        clearTimeout(chantHintTimeoutRef.current);
        chantHintTimeoutRef.current = null;
      }
    };
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
          // bandwidth on a background cache download for this content
          // (cancelBackgroundDownloadForFeed also clears it if it hadn't
          // actually started downloading yet - see its own comment).
          if (feedId) cancelBackgroundDownloadForFeed(feedId);
        } else {
          console.log('▶️ Resuming audio');

          // Check if we should restart auto-looping. Gated on isRepeatable -
          // auto-loop is mantra's chant-counter behavior; without this gate,
          // Aarti/Bhajan (isRepeatable: false, chantCount/targetCount just
          // sitting at their unused defaults) would silently auto-loop too.
          const shouldAutoLoop = !!contentData.isRepeatable && chantCount < targetCount && !isLooping;
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
      // rather than leaving it playing through the cache-check await below.
      // Cancelling its background download is now owned solely by the
      // [feedId, player] cleanup effect further down (its cleanup closure
      // already fires for this exact same outgoing feedId on every feedId
      // change, guaranteed to run before this effect's own togglePlayback
      // call per React's cleanup-before-setup ordering) - consolidated here
      // to close a real duplicate-call redundancy that existed between the
      // two. previousFeedId is still captured here (read-only, not a
      // cancellation trigger) for the Theory 4 wait in
      // startDeferredCacheDownload below.
      const previousFeedId =
        loadedFeedIdRef.current && loadedFeedIdRef.current !== feedId ? loadedFeedIdRef.current : null;
      // Retry-gap fix: always stop the player right before the replace()
      // below, not just when switching to a genuinely different feed. When
      // loadedFeedIdRef.current === feedId, we're retrying a load that got
      // stuck (e.g. the 10s "did it ever load" timeout above gave up and
      // alerted, but never touched the native player) - the old code only
      // paused in the previousFeedId branch, so a same-feed retry skipped
      // this entirely and called player.replace() directly on top of
      // whatever the first attempt was still silently doing. replace() alone
      // is not a reliable cancel for an in-flight native load, so pausing
      // first - every time, retry included - is what makes each attempt a
      // clean, fresh one instead of stacking on the stuck one.
      if (previousFeedId) {
        console.log('🔀 Switching mantras - stopping previously loaded feed:', previousFeedId);
      } else if (loadedFeedIdRef.current === feedId) {
        console.log('🔁 Retrying a stuck/failed load for the same feed - resetting player before reattempting:', feedId);
      }
      player.pause();

      console.log('🎵 Audio Player: Loading audio from URL:', contentData.audioUrl);
      setIsAudioLoading(true);
      setNativeLoadStarted(false);

      // Determine if we should auto-loop (when count < target). Gated on
      // isRepeatable, same reasoning as the resume branch above - without
      // it, a fresh Aarti/Bhajan play (chantCount/targetCount at their
      // never-saved defaults of 0/108) would auto-loop by default with no
      // way to turn it off, since this content type has no counter UI to
      // even reveal that a "target" is silently driving playback.
      const shouldAutoLoop = !!contentData.isRepeatable && chantCount < targetCount;
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

      // Views pill tracking (CLAUDE.md §56 Phase 3) - fires exactly once per
      // genuinely-fresh load (this branch only runs when loadedFeedIdRef
      // didn't already match feedId above), same trigger semantics as
      // AutoplayFeedCard's own view tracking. Fire-and-forget, matching that
      // component's error handling.
      feedService.viewFeed(feedId).then(() => incrementView(feedId)).catch((err) =>
        console.error('audio-player.tsx: view tracking error:', err)
      );

      if (!cachedUri) {
        // Cache miss: already streaming from audioUrl above. Theory 1 fix -
        // deliberately NOT calling downloadToCacheInBackground here anymore.
        // Doing so immediately, alongside player.play() above, meant the
        // live stream the user is waiting on always had to compete with a
        // full second download of the identical file for the same
        // bandwidth, right when startup latency matters most. Instead, park
        // the pending download here - the isLoaded-gated effect below starts
        // it for real once status.isLoaded confirms genuine buffering
        // success (adaptive to real network conditions), or the safety-net
        // timeout starts it regardless if isLoaded never fires.
        if (pendingCacheDownloadTimeoutRef.current) {
          clearTimeout(pendingCacheDownloadTimeoutRef.current);
        }
        pendingCacheDownloadRef.current = { feedId, audioUrl, previousFeedId };
        pendingCacheDownloadTimeoutRef.current = setTimeout(() => {
          pendingCacheDownloadTimeoutRef.current = null;
          const pending = pendingCacheDownloadRef.current;
          if (pending?.feedId === feedId) {
            console.log('⏱️ Background cache download safety-net timeout firing for feed:', feedId);
            pendingCacheDownloadRef.current = null;
            startDeferredCacheDownload(pending.feedId, pending.audioUrl, pending.previousFeedId);
          }
        }, PENDING_CACHE_DOWNLOAD_SAFETY_TIMEOUT_MS);
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

  // Theory 1 fix's actual trigger: starts the deferred background-cache
  // download the moment status.isLoaded confirms THIS SPECIFIC feedId has
  // genuinely finished buffering (STATE_READY), not just "playback was
  // attempted." pending.feedId !== feedId is a real guard, not defensive
  // boilerplate: status.isLoaded can already be true from whatever content
  // was loaded before this switch (the ref only updates once the NEW
  // content's own STATE_READY transition fires), so without this check a
  // stale-true isLoaded value could fire the download immediately again -
  // exactly the bug this fix exists to close. See startDeferredCacheDownload
  // above for the Theory 4 wait this also goes through.
  useEffect(() => {
    if (!status.isLoaded) return;
    const pending = pendingCacheDownloadRef.current;
    if (!pending || pending.feedId !== feedId) return;

    if (pendingCacheDownloadTimeoutRef.current) {
      clearTimeout(pendingCacheDownloadTimeoutRef.current);
      pendingCacheDownloadTimeoutRef.current = null;
    }
    pendingCacheDownloadRef.current = null;
    startDeferredCacheDownload(pending.feedId, pending.audioUrl, pending.previousFeedId);
  }, [status.isLoaded, feedId]);

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
  //
  // Deliberately NOT gated on !isFeedLoading (removed): that forced every
  // switch to wait on fetchFeedData's network round-trip (GET feed-by-id)
  // before playback could even be attempted, even though contentData.audioUrl
  // is already available straight from route params for every real entry
  // point except the mini-player's resume-in-place navigation (which takes
  // togglePlayback's pause/resume branch instead, never this effect's fresh-
  // load path, so it's unaffected). This was the actual root cause of
  // playback-switch feeling slow/spinner-prone/occasionally throwing a false
  // "check your internet connection" alert - not caching, not connection
  // pooling. contentData.audioUrl being present is now the only gate needed.
  useEffect(() => {
    if (
      autoPlay &&
      autoPlayTriggeredForFeedIdRef.current !== feedId &&
      contentData.audioUrl &&
      loadedFeedIdRef.current !== feedId
    ) {
      autoPlayTriggeredForFeedIdRef.current = feedId ?? null;
      togglePlayback();
    }
  }, [autoPlay, contentData.audioUrl, feedId]);

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
  // player-cleanup notes for why (mirrors the existing contentData.isRepeatable
  // gate already used for the counter button below). Mantra never has a
  // queue (Phase 3 never calls setQueue for it), so gating on type alone -
  // rather than on `queue` being present - is what keeps this hidden for
  // mantra even in a hypothetical future where queue ends up non-null there.
  const showTrackNav = contentData.type === 'aarti' || contentData.type === 'bhajan';
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
        // encodeURIComponent: item.audioUrl/thumbnailUrl (from
        // AudioContentCard's resolveQueueItem) are Firebase Storage URLs
        // already containing their own legitimate %2F/%20 sequences -
        // useLocalSearchParams() unconditionally decodeURIComponent's every
        // string param once on the way out, with no matching encode ever
        // applied on the way in, which silently corrupts the URL (%2F ->
        // literal /) without this - see CLAUDE.md's route-param URL
        // corruption investigation. Every other real entry point into this
        // screen does the same encode at its own params-construction site.
        audioUrl: encodeURIComponent(item.audioUrl),
        thumbnailUrl: encodeURIComponent(item.thumbnailUrl || ''),
        // Forwards QueueItem's own type/isRepeatable (populated by
        // AudioContentCard's resolveQueueItem) so a Next/Previous hop, like
        // every other entry point, renders the correct control layout from
        // the first frame instead of a momentary mantra-layout flash - see
        // CLAUDE.md's playback-switch flash fix. Omitted entirely (not sent
        // as empty strings) when absent, so getContentData's own 'mantra'
        // default still applies correctly.
        ...(item.type ? { type: item.type } : {}),
        ...(item.isRepeatable !== undefined ? { isRepeatable: item.isRepeatable ? 'true' : 'false' } : {}),
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

    console.log('🔄 Using ref values - Auto-looping:', currentAutoLooping, 'Count:', currentCount, 'Target:', currentTarget);

    if (currentAutoLooping && currentCount < currentTarget) {
      const newCount = currentCount + 1;
      console.log('🔄 Auto-looping active - incrementing count from', currentCount, 'to', newCount);
      setChantCount(newCount);

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
  //
  // contentData.type/isRepeatable are real dependencies, not just read from
  // closure: every real entry point (mantras.tsx, index.tsx,
  // search-results.tsx, AudioContentCard.tsx, and this screen's own
  // navigateToQueueItem) now sends type/isRepeatable as route params, and
  // getContentData() resolves them the same way it already resolves
  // title/audioUrl - params first, the fetched feed as confirmation/
  // correction once it lands (see CLAUDE.md's playback-switch flash fix).
  // Listing them here means IF a caller ever sends a wrong/stale value, this
  // effect re-runs the moment the real fetch corrects contentData and
  // re-registers with the right type/counter shape - a safety net, not the
  // primary mechanism now that params are expected to already be correct.
  useEffect(() => {
    if (!status.playing || !feedId) return;

    usePlaybackStore.getState().registerPlaybackStart(
      {
        feedId,
        type: contentData.type ?? 'mantra',
        mode: 'persistent',
        title: contentData.title?.toString() ?? (t('sacredMantra') as string),
        thumbnailUrl: contentData.thumbnailUrl?.toString(),
        instanceId: playerInstanceId,
      },
      {
        isPlaying: true,
        positionSeconds: status.currentTime,
        durationSeconds: status.duration,
        counter: contentData.isRepeatable
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
          if (feedId) cancelBackgroundDownloadForFeed(feedId);
        },
        pause: () => {
          try {
            player.pause();
          } catch (error) {
            console.error('Error pausing playback (player likely already released):', error);
          }
          if (feedId) cancelBackgroundDownloadForFeed(feedId);
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
  }, [status.playing, feedId, playerInstanceId, contentData.type, contentData.isRepeatable]);

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
      counter: contentData.isRepeatable
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
      if (feedId) cancelBackgroundDownloadForFeed(feedId);
    }
  }, [preemptedByFeedId, status.playing, player, feedId]);

  // Clear this screen's entry from the shared store - and its lock-screen
  // controls, if active - on unmount (e.g. the whole (main) tree unmounting
  // on logout). CORRECTION to this comment's original claim: being keyed on
  // [feedId, player] means this cleanup ALSO fires on every ordinary
  // feedId switch (any dependency change reruns a useEffect's cleanup, not
  // just true unmount) - it isn't unmount-only the way it was first
  // documented. That turned out to matter: player.pause() below was added
  // specifically because of it. Without an immediate pause here, switching
  // away from actively-playing/auto-looping mantra content left the SAME
  // shared player (see useAudioPlayer(null) above - one stable instance for
  // the whole screen) still audibly finishing/auto-looping in the
  // background, since togglePlayback's own "stop the previous feed" step
  // only runs once the NEWLY-selected content's play action fires - not
  // immediately on navigation. Any natural-finish event from that trailing
  // old playback fed straight into the didJustFinish effect below, which
  // increments chantCount using feedIdRef/chantCountRef - both of which
  // had ALREADY moved on to the newly-switched-to feed by then, since refs
  // always read current, not stale, values. The result: a fresh 0/108
  // reset (see fetchFeedData's own comment on why every feedId change
  // resets the counter) got silently bumped back up moments later,
  // attributed to whichever content was now on screen rather than the one
  // that actually finished. Pausing here, synchronously as part of the OLD
  // feedId's cleanup (which React runs before the new feedId's
  // fetchFeedData effect even starts), closes that window instead of just
  // resetting into it.
  // isAutoLooping is cleared alongside it so the loop indicator doesn't
  // carry over either, for the same reason. Also cancels any in-flight (or
  // still-pending, not-yet-started) background cache download for this
  // feedId via cancelBackgroundDownloadForFeed - this is now the SOLE place
  // that does so for the switching-away case (previously togglePlayback's
  // own "switching away" block ALSO called this for the same outgoing
  // feedId, a genuine duplicate call every real switch went through, since
  // this cleanup's closure captures the OLD feedId and fires on every feedId
  // change regardless of whether togglePlayback ever runs). Consolidated
  // here deliberately: this cleanup is the more complete trigger (fires
  // unconditionally on every feedId change, not just when togglePlayback
  // happens to run), and React guarantees ALL effect cleanups for a commit
  // run before ANY new effect setups run - so this cancellation is always
  // already in flight by the time the autoPlay effect's togglePlayback call
  // (or a manual tap) needs startDeferredCacheDownload's Theory-4 wait to
  // have something real to wait on. cancelBackgroundDownload itself only
  // touches the filesystem, never `player`, so it's safe to call
  // unconditionally even though this cleanup itself runs after
  // useAudioPlayer's own release() (see the isMountedRef comment above for
  // why that ordering matters for code that DOES touch `player`).
  // clearLockScreenControls() DOES touch `player`, though, and this cleanup
  // is exactly the code path that ordering hazard describes - wrapped in
  // try/catch for the same reason as the coordinator's stop/pause closures
  // above, not AppState-gated (see that comment for why AppState-gating
  // doesn't apply here).
  useEffect(() => {
    return () => {
      // Same "player likely already released" hazard as
      // clearLockScreenControls() just below - this cleanup can run on a
      // true unmount, after useAudioPlayer's own release(), not just on an
      // ordinary feedId switch (where the player is still very much alive).
      // Guarded the same way for the same reason (see this effect's own
      // top comment, and the standing project lesson: any new player-
      // touching cleanup code needs this by default).
      try {
        player.pause();
      } catch (error) {
        console.error('Error pausing previous feed during cleanup (player likely already released):', error);
      }
      setIsAutoLooping(false);

      try {
        player.clearLockScreenControls();
        hasActiveLockScreenSessionRef.current = false;
      } catch (error) {
        console.error('Error clearing lock-screen controls during unmount cleanup (player likely already released):', error);
      }
      if (feedId) {
        usePlaybackStore.getState().clearNowPlaying(feedId);
        cancelBackgroundDownloadForFeed(feedId);
      }
    };
  }, [feedId, player]);

  const progress = targetCount > 0 ? (chantCount / targetCount) * 100 : 0;

  const handleIncrementCount = () => {
    if (chantCount < targetCount) {
      const newCount = chantCount + 1;
      setChantCount(newCount);

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


  const handleDecrementCount = () => {
    if (chantCount > 0) {
      const newCount = chantCount - 1;
      console.log('🔽 Manually decremented count from', chantCount, 'to', newCount);
      setChantCount(newCount);

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

  const handleTargetCountChange = (newTarget: number) => {
    console.log('🎯 Target changed from', targetCount, 'to', newTarget, '- Current count:', chantCount);
    setTargetCount(newTarget);

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
  };

  const handleResetCounter = () => {
    Alert.alert(
      t('resetCounter'),
      t('resetCounterConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('reset'),
          style: 'destructive',
          onPress: () => {
            console.log('🔄 Resetting counter to 0');
            setChantCount(0);

            // If audio is playing, restart auto-looping since count is now 0 and target > 0
            if (status.playing && status.isLoaded && targetCount > 0 && !isLooping) {
              setIsAutoLooping(true);
              player.loop = false; // Auto-loop uses manual restart
              console.log('🔄 Restarted auto-loop after counter reset');
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
    <SafeAreaView
      style={styles.container}
      // Chant hint bubble, requirement 2: dismiss on a tap ANYWHERE on this
      // screen, without blocking any other touch. onStartShouldSetResponderCapture
      // fires (capture phase, top-down) on every touch start anywhere in this
      // subtree BEFORE any child gets a chance to claim the responder -
      // returning false here means this handler never actually claims it,
      // so play/pause, the seek bar, the counter button, etc. all keep
      // receiving and handling their own touches completely normally. The
      // showChantHint check inside makes this a no-op whenever the bubble
      // isn't showing, so it's safe to always have attached.
      onStartShouldSetResponderCapture={() => {
        if (showChantHint) setShowChantHint(false);
        return false;
      }}
    >
      {/* Header - CLAUDE.md §56 Phase 1: stripped down to just a collapse
          icon, matching a "minimize to mini-player" convention (Spotify/YT
          Music) rather than a literal "Back" label - purely visual, onPress
          still calls the exact same handleBack used before. */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-down" size={28} color={'#5D4E37'} />
        </TouchableOpacity>
      </View>

      {/* Loading State - visible until fetchFeedData genuinely resolves, full
          stop. Real product decision: no piece-by-piece "pop in" of
          individual elements (title, deity, description, counts) once the
          screen becomes visible - it should look complete and settled from
          its very first visible frame, exactly like this screen's original
          pre-fix behavior. Audio itself is NOT blocked by this - see
          hasStartedPlaybackForCurrentFeed's own comment above and the
          autoPlay effect further down, both of which run independently of
          whatever's rendered here. */}
      {isFeedLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={goldenTempleTheme.colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>{t('loadingMantraDetails')}</Text>
        </View>
      )}

      {/* Error State - the one deliberate exception to "gate everything on
          the fetch": suppressed when audio has already genuinely started for
          this feedId (hasStartedPlaybackForCurrentFeed), since the user
          already has the thing that actually matters - a working player -
          and a hard, blocking error screen over that would be actively
          harmful, not just imperfect. Only shown when audio genuinely never
          started at all. */}
      {feedError && !isFeedLoading && !hasStartedPlaybackForCurrentFeed && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={50} color={goldenTempleTheme.colors.error} />
          <Text style={styles.errorText}>{feedError}</Text>
          <TouchableOpacity onPress={fetchFeedData} style={styles.retryButton}>
            <Text weight="semibold" style={styles.retryButtonText}>{t('retryButtonText')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content - fixed three-region layout, no scrolling. Gated on the
          fetch having genuinely finished (matching the Loading State above),
          OR on hasStartedPlaybackForCurrentFeed as the same deliberate
          exception the Error State makes: if the fetch failed but audio is
          already playing, show the real (if metadata-incomplete) player
          rather than either a blank screen or a hard error blocking working
          audio - see this section's own gate comments above for why. */}
      {!isFeedLoading && (!feedError || hasStartedPlaybackForCurrentFeed) && (
        // No tab-bar-clearance padding needed anymore - the tab bar is
        // hidden entirely on this screen (see the useFocusEffect above).
        // SafeAreaView already handles the physical bottom safe-area inset
        // on its own; this is just a small breathing-room buffer.
        <View style={[styles.playerBody, { paddingBottom: goldenTempleTheme.spacing.md }]}>
          {/* Visual Area - CLAUDE.md §56 Phase 2: thumbnail only now, no
              dark scrim and no title/seek-bar overlaid on top of it. */}
          <View style={styles.lyricsSection}>
            <LinearGradient
              colors={goldenTempleTheme.gradients.sunrise}
              style={styles.lyricsContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
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
            </LinearGradient>
          </View>

          {/* Title + artist - moved below the thumbnail, same bindings as
              before (CLAUDE.md §56 Phase 2). */}
          <View style={styles.contentHeaderTextBlock}>
            <Text
              variant="h3"
              weight="bold"
              numberOfLines={1}
              style={[
                styles.contentTitleCompact,
                // Screen-scoped tightening only - doesn't touch the shared
                // Text atom's Devanagari heading padding, which stays
                // generous everywhere else in the app. `style` is the last
                // entry in the atom's own combined-style array, so these
                // keys win over the atom's own lineHeight/paddingVertical/
                // marginVertical for Hindi headings. Deliberately moderate,
                // not zeroed out to English's tight values - still leaves
                // real headroom (38 vs a 24px font) for tall matras, just
                // less than the atom's default ~46/12/6 total overshoot.
                containsDevanagari(contentData.title) && styles.contentTitleCompactHindi,
              ]}
            >{contentData.title}</Text>
            {/* Artist subtitle (caption-sourced), not deity - CLAUDE.md §56
                Phase 0. Deity still displays in the native lock-screen
                "artist" field; the InfoSheet that used to also show it was
                removed as mantra-only dead weight once its one trigger
                (the header info icon) was removed. */}
            <Text numberOfLines={1} style={styles.contentSubtitleCompact}>{contentData.artist}</Text>
          </View>

          {/* Action pills row - structure only, reserved for Phase 3's full
              pill styling + new Views pill (CLAUDE.md §56). Like/Share
              relocated as-is from the old header icon row above - same
              handleLike/handleShare, only their position changed. */}
          {/* Full pill treatment (CLAUDE.md §56 Phase 3) - icon + count,
              shown only when the count is above 0, mirroring
              AutoplayFeedCard's already-proven footer pattern exactly
              (including reusing its WhatsApp icon for Share) for
              consistency across the app. Like/Share keep this screen's own
              existing colors rather than AutoplayFeedCard's, since only the
              count/icon/tracking pattern was asked to be reused, not its
              palette. Views has no onPress - it's a display-only count,
              tracked automatically on load (see togglePlayback), not a
              user action. */}
          <View style={styles.actionPillsRow}>
            <TouchableOpacity
              onPress={handleLike}
              disabled={isLiking}
              style={styles.actionPill}
              activeOpacity={0.7}
            >
              <Ionicons
                name={currentFeedData?.isLiked ? 'heart' : 'heart-outline'}
                size={24}
                color={currentFeedData?.isLiked ? '#C41E3A' : '#8B7355'}
              />
              {!!currentFeedData?.likesCount && (
                <Text variant="caption" style={styles.actionPillText}>
                  {formatCount(currentFeedData.likesCount)}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShare}
              style={styles.actionPill}
              activeOpacity={0.7}
            >
              <WhatsAppIcon width={22} height={22} fill="#8B7355" />
              {!!currentFeedData?.sharesCount && (
                <Text variant="caption" style={styles.actionPillText}>
                  {formatCount(currentFeedData.sharesCount)}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.actionPill}>
              <Ionicons name="eye-outline" size={24} color="#8B7355" />
              {!!currentFeedData?.viewsCount && (
                <Text variant="caption" style={styles.actionPillText}>
                  {formatCount(currentFeedData.viewsCount)}
                </Text>
              )}
            </View>
          </View>

          {/* Seek bar + time labels - moved below the pills, no longer
              attached to the thumbnail (CLAUDE.md §56 Phase 2). Identical
              handleProgressBarPress/status-driven fill+thumb math, only
              position and (since it's no longer sitting over a dark scrim)
              track/text colors changed for legibility on the plain
              background - see progressBar/timeText styles. */}
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

          {/* Compact Control Bar - CLAUDE.md §56 Phase 4: this redesign is
              aarti/bhajan-only (showTrackNav). Mantra's whole branch below
              is byte-identical to before this phase - untouched per
              explicit agreement; its own control-area redesign is a
              separate, future, dedicated pass. */}
          {showTrackNav ? (
            <>
            {/* No card/box wrapper - controls sit directly on the page
               background. Single row: shuffle/previous (smaller) flank a
               larger central play/pause, next/repeat (smaller) on the
               other side - same handlers as before, only position/sizing/
               background changed. Speed toggle removed entirely (CLAUDE.md
               §56 Phase 5) - togglePlaybackSpeed itself is untouched
               (still called by mantra's branch below), just no longer
               triggered from here. Volume slider omitted here: it's
               unreachable in practice today (no button anywhere triggers
               showVolumeSlider), so not worth carrying into the new
               layout - still present, unchanged, in mantra's branch below. */}
            <View style={styles.aartiBhajanControls}>
              <View style={styles.aartiBhajanControlsRow}>
                <TouchableOpacity
                  onPress={() => usePlaybackStore.getState().toggleShuffle()}
                  style={styles.bareControlButton}
                >
                  <Ionicons name="shuffle" size={24} color={queue?.isShuffled ? '#FF5722' : '#5D4E37'} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handlePrevious}
                  disabled={!canGoPrevious}
                  style={[styles.bareControlButton, !canGoPrevious && styles.trackNavButtonDisabled]}
                >
                  <Ionicons name="play-skip-back" size={28} color={'#5D4E37'} />
                </TouchableOpacity>

                <View style={styles.playButtonContainer}>
                  {/* Back to the original 80x80 size, matching mantra's
                      playButton exactly (CLAUDE.md §56 Phase 4 sizing
                      correction - reuses styles.playButton directly rather
                      than a separate "large" style, since the target size
                      is now identical). */}
                  <TouchableOpacity
                    style={styles.playButton}
                    onPress={togglePlayback}
                    disabled={isAudioLoading}
                  >
                    <LinearGradient
                      colors={['#FF5722', '#E64A19']}
                      style={styles.playButtonGradient}
                    >
                      {/* Real fix, root cause closed (route-param URL corruption -
                          see CLAUDE.md): native buffering is now genuinely a
                          fraction of a second on the common path, so a
                          dedicated loading-spinner state on this button adds
                          visual noise rather than useful feedback. Always
                          shows the real play/pause icon now - isAudioLoading
                          itself, the 10s safety-timeout/error-alert logic,
                          and this button's own disabled={isAudioLoading}
                          guard below are all deliberately UNCHANGED, still a
                          genuine fallback for real failures. */}
                      <Ionicons
                        name={status.playing ? 'pause' : 'play'}
                        size={40}
                        color="#fff"
                        style={!status.playing ? { marginLeft: 4 } : {}}
                      />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleNext}
                  disabled={!canGoNext}
                  style={[styles.bareControlButton, !canGoNext && styles.trackNavButtonDisabled]}
                >
                  <Ionicons name="play-skip-forward" size={28} color={'#5D4E37'} />
                </TouchableOpacity>

                <TouchableOpacity onPress={toggleLoop} style={styles.bareControlButton}>
                  <Ionicons
                    name="repeat"
                    size={24}
                    color={isLooping ? '#FF5722' : '#8B7355'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Swipe-up-to-open-queue handle (CLAUDE.md §56 Phase 5) - a
                sibling of aartiBhajanControls, not nested inside it, and
                absolutely positioned as a true screen-bottom footer
                (position:'absolute', bottom: 30) rather than sitting
                wherever normal document flow left it relative to the
                controls row above. "Up Next" label added so the gesture is
                discoverable, not just a bare bar - same variant/weight/
                color as the title (contentTitleCompact) per request.
                QueueSheet itself is still completely unchanged - only how
                it gets opened changed. */}
            <GestureDetector gesture={swipeUpToOpenQueue}>
              <View style={styles.queueSwipeHandleZone}>
                <Text variant="caption" weight="bold" style={styles.queueSwipeHandleLabel}>
                  {t('upNext')}
                </Text>
                <View style={styles.queueSwipeHandleBar} />
              </View>
            </GestureDetector>
            </>
          ) : (
            <View>
              {/* Mantra controls - CLAUDE.md mantra-player-redesign: no
                  surrounding card (previously a white/shadowed
                  styles.audioControls wrapper), no repeat/loop toggle
                  (removed entirely - toggleLoop/isLooping/player.loop stay
                  in the codebase, still used by aarti/bhajan's branch
                  above, just no longer triggered from here). One row, three
                  round buttons all the original Play size/shape (80x80,
                  sizing correction) - Speed (left) and Chant counter
                  (right) were sized UP to match Play, the visual anchor,
                  rather than Play being shrunk to match them; Play alone
                  keeps its original orange gradient fill, the other two
                  share a neutral cream fill. When the content isn't
                  repeatable, the counter slot renders an invisible
                  same-size placeholder rather than collapsing to two
                  buttons, so Play stays centered either way. */}
              <View style={styles.mantraControlsRow}>
                <TouchableOpacity
                  onPress={togglePlaybackSpeed}
                  style={styles.roundControlButton}
                  activeOpacity={0.7}
                >
                  <Text weight="semibold" style={styles.speedText}>{playbackSpeed}x</Text>
                </TouchableOpacity>

                {/* Play/Pause - restored to the original 80x80 orange-
                    gradient button exactly as it was before the redesign
                    (styles.playButton/playButtonGradient/playButtonContainer,
                    unchanged, still shared with aarti/bhajan's branch above)
                    - the visual anchor of the row; Speed/Chant-counter were
                    sized up to match IT, not the other way around. */}
                <View style={styles.playButtonContainer}>
                  <TouchableOpacity
                    style={styles.playButton}
                    onPress={togglePlayback}
                    disabled={isAudioLoading}
                  >
                    <LinearGradient
                      colors={['#FF5722', '#E64A19']}
                      style={styles.playButtonGradient}
                    >
                      {/* Real fix, root cause closed (route-param URL corruption -
                          see CLAUDE.md): native buffering is now genuinely a
                          fraction of a second on the common path, so a
                          dedicated loading-spinner state on this button adds
                          visual noise rather than useful feedback. Always
                          shows the real play/pause icon now - isAudioLoading
                          itself, the 10s safety-timeout/error-alert logic,
                          and this button's own disabled={isAudioLoading}
                          guard below are all deliberately UNCHANGED, still a
                          genuine fallback for real failures. */}
                      <Ionicons
                        name={status.playing ? 'pause' : 'play'}
                        size={40}
                        color="#fff"
                        style={!status.playing ? { marginLeft: 4 } : {}}
                      />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* Was feedData?.isRepeatable - read raw (non-staleness-
                    guarded) state, which could briefly show the PREVIOUS
                    track's counter-button state during a mantra->mantra
                    switch. contentData.isRepeatable goes through the same
                    resolved params-then-fetch source as everything else
                    here, closing that gap too. */}
                {contentData.isRepeatable ? (
                  // Wrapper is sized only by its child (the 80x80 button) -
                  // its alignItems:'flex-end' is what right-aligns
                  // ChantHintBubble's edge to the button's own right edge
                  // (the bubble is absolutely positioned with no left/right
                  // of its own), so adding this wrapper doesn't perturb
                  // mantraControlsRow's own space-between math at all.
                  <View style={styles.counterButtonWrapper}>
                    <TouchableOpacity
                      onPress={() => {
                        // Tapping the counter button dismisses the hint
                        // immediately, per CLAUDE.md's spec, regardless of
                        // whether its own 3.5s auto-dismiss has fired yet.
                        setShowChantHint(false);
                        counterSheetRef.current?.present();
                      }}
                      style={styles.roundControlButton}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="stats-chart-outline" size={26} color={designSystemTheme.colors.primary} />
                      <View style={styles.counterBadge}>
                        <Text weight="semibold" style={styles.counterBadgeText}>{chantCount}/{targetCount}</Text>
                      </View>
                    </TouchableOpacity>
                    <ChantHintBubble
                      visible={showChantHint}
                      onHide={() => setShowChantHint(false)}
                    />
                  </View>
                ) : (
                  <View style={styles.roundControlButtonPlaceholder} />
                )}
              </View>

              {/* Volume Slider - unchanged, still unreachable in practice
                  (no button anywhere triggers showVolumeSlider), no longer
                  sitting inside the removed audioControls card. */}
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
            </View>
          )}
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
        onOpenMoreTargets={() => moreTargetsSheetRef.current?.present()}
      />

      {/* Active queue (aarti/bhajan only), moved off-screen into an overlay sheet */}
      <QueueSheet
        ref={queueSheetRef}
        items={queueDisplayItems}
        currentIndex={queueDisplayIndex}
        onSelectIndex={handleJumpToQueueIndex}
      />

      {/* Extra target-count presets ("More" from CounterSheet) - a real
          BottomSheetModal now, not a plain absolutely-positioned View, so
          it's portaled to the same top-level overlay CounterSheet/QueueSheet
          use and correctly stacks above CounterSheet when presented from
          within it, instead of rendering behind it. */}
      <MoreTargetsSheet
        ref={moreTargetsSheetRef}
        targetCount={targetCount}
        onSelectTarget={handleTargetCountChange}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: goldenTempleTheme.colors.background, // Light cream background
  },
  // Header - icon-only collapse control (CLAUDE.md §56 Phase 1). Height
  // reduced from the old text+icon+divider treatment - paddingVertical
  // roughly halved (spacing.md -> spacing.sm) to match the now-lighter
  // content, no separator line.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    // Was spacing.lg (24px) - now matches playerBody's own raw 20px exactly,
    // so the collapse icon's left edge lines up with the thumbnail/title/
    // pills/seek-bar below it (CLAUDE.md §56 Phase 2 correction).
    paddingHorizontal: 20,
    paddingVertical: goldenTempleTheme.spacing.sm,
    backgroundColor: goldenTempleTheme.colors.background,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Main player body - fixed three-region layout (header strip / visual area / controls)
  playerBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: goldenTempleTheme.spacing.md,
  },
  // Now sits below the thumbnail, alone, rather than beside the header
  // icons (CLAUDE.md §56 Phase 2). Left-aligned, not centered (CLAUDE.md
  // §56 Phase 3 correction).
  contentHeaderTextBlock: {
    alignItems: 'flex-start',
    marginTop: goldenTempleTheme.spacing.md,
  },
  // Font size now comes from the Text atom's variant="h3" prop (24px), not
  // a raw pixel value - was an ad-hoc 22px, exactly equidistant between the
  // h4 (20px) and h3 (24px) named levels; resolved by treating h4 as
  // "closest" (this title started the redesign at 18px = h5 exactly, and
  // 22 was already a step toward h4/h3) and bumping one level up from
  // there (CLAUDE.md §56 Phase 3 correction).
  contentTitleCompact: {
    fontWeight: 'bold',
    color: '#5D4E37',
    textAlign: 'left',
  },
  // Devanagari-only override (see the containsDevanagari check at the call
  // site) - moderately tightens the Text atom's own generous Hindi-heading
  // lineHeight/paddingVertical/marginVertical (~46/12/6 total overshoot
  // above the 24px font) down to this, rather than removing it outright.
  // Still meaningfully more than English's untouched 32/0/0, on purpose -
  // this is single-line (numberOfLines=1) so the atom's "compound word
  // wrapping" concern doesn't apply, but matras still need real headroom.
  contentTitleCompactHindi: {
    lineHeight: 38,
    paddingVertical: 2,
    marginVertical: 0,
  },
  contentSubtitleCompact: {
    fontSize: 13,
    color: '#8B7355',
    marginTop: 2,
    textAlign: 'left',
  },
  // Evenly distributed across the full row width - matches
  // AutoplayFeedCard's footer technique exactly: space-between with
  // intrinsically-sized items, not flex-stretched ones (CLAUDE.md §56
  // Phase 3 correction).
  actionPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: goldenTempleTheme.spacing.md,
  },
  // Transparent pill treatment (CLAUDE.md §56 Phase 3), sized up per the
  // "make them bigger" correction.
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: 10,
    borderRadius: goldenTempleTheme.borderRadius.full,
    backgroundColor: 'rgba(93, 78, 55, 0.06)',
  },
  actionPillText: {
    color: '#8B7355',
    fontSize: 14,
    fontWeight: '600',
  },
  // Lyrics Section - CLAUDE.md §56 Phase 3: fixed 1:1 square (was flex: 1,
  // a flexible box sized by whatever vertical space happened to be left) -
  // aspectRatio computes height from the width the column layout already
  // stretches this to by default, no manual Dimensions math needed.
  lyricsSection: {
    aspectRatio: 1,
    marginBottom: goldenTempleTheme.spacing.md,
  },
  lyricsContainer: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    // shadows.lg removed entirely (was making the box read as asymmetric
    // left/right on-device, confirmed via a real screenshot - no code-level
    // margin/padding difference exists between this box and other page
    // elements, so the shadow/elevation rendering was the only remaining
    // candidate) - no shadow is preferred to an asymmetric-looking one.
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
  progressSection: {
    width: '100%',
    marginTop: goldenTempleTheme.spacing.md,
  },
  // Track color changed from a translucent-white overlay (designed to sit on
  // top of the dark image scrim) to a light, visible-on-cream tint, now that
  // this sits on the plain background rather than over the thumbnail
  // (CLAUDE.md §56 Phase 2) - fill/thumb colors already read fine on light
  // backgrounds, left unchanged.
  progressBar: {
    height: 6,
    backgroundColor: goldenTempleTheme.colors.muted[300],
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
  // Was white (for the dark image scrim) - now sits on the plain background
  // (CLAUDE.md §56 Phase 2), matching contentSubtitleCompact's color.
  timeText: {
    color: '#8B7355',
    fontSize: 12,
    fontWeight: '500',
  },
  // Audio Controls - compact, fixed
  // Mantra controls row (mantra-player-redesign, sizing correction) - single
  // row, no surrounding card. `width: '100%'` + no paddingHorizontal here or
  // on the wrapping View means space-between anchors the first/last button's
  // outer edge exactly to playerBody's own 20px content edge - the same
  // margin governing the thumbnail/title/pills/seek-bar above, with nothing
  // in this row adding any extra inset of its own. marginTop is the fix for
  // the seek-bar being flush against this row with zero gap between them.
  mantraControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: goldenTempleTheme.spacing.lg,
    marginBottom: 20,
  },
  // Sizing correction: Play is the original, unshrunk 80x80 anchor (see
  // styles.playButton, reused as-is below) - Speed/Chant-counter now match
  // ITS size/shape instead of Play being shrunk down to match them. Neutral
  // cream fill (vs. Play's orange gradient) is the only intentional
  // difference, per request - same size and round shape, not same color.
  // No explicit width/height - wraps tightly to the 80x80 button so it can't
  // affect mantraControlsRow's own space-between math (see the JSX comment).
  // alignItems: 'flex-end' (not 'center') - the bubble is right-aligned to
  // this wrapper's own right edge (= the button's right edge = the page's
  // standard right margin), not centered - see ChantHintBubble's own
  // container style comment for why.
  counterButtonWrapper: {
    alignItems: 'flex-end',
  },
  roundControlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5E6D3',
    alignItems: 'center',
    justifyContent: 'center',
    ...goldenTempleTheme.shadows.lg,
  },
  // Same footprint as roundControlButton, fully invisible/non-interactive -
  // keeps Play centered when the counter slot has nothing to show (content
  // not flagged isRepeatable) instead of collapsing to two buttons.
  roundControlButtonPlaceholder: {
    width: 80,
    height: 80,
  },
  counterBadge: {
    marginTop: 2,
  },
  counterBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: designSystemTheme.colors.primary,
  },
  // Bumped from 16 to fit proportionately inside the larger 80px button
  // (sizing correction) rather than looking lost/undersized at its center.
  speedText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#5D4E37',
  },
  trackNavButtonDisabled: {
    opacity: 0.4,
  },
  // Aarti/Bhajan controls (CLAUDE.md §56 Phase 4) - no card/box wrapper,
  // controls sit directly on the page background. Mantra's controls row
  // above now follows the same no-card approach (mantra-player-redesign).
  aartiBhajanControls: {
    alignItems: 'center',
    // Bumped from 12 - more breathing room above the swipe handle, which
    // now floats independently below this as an absolutely-positioned
    // footer rather than sitting immediately after it in normal flow
    // (CLAUDE.md §56 Phase 5 sizing correction).
    marginBottom: 40,
  },
  aartiBhajanControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: goldenTempleTheme.spacing.sm,
  },
  // Swipe-up-to-open-queue handle (CLAUDE.md §56 Phase 5, sizing
  // correction) - true footer anchoring: absolutely positioned 24px from
  // the screen's bottom edge (View's default position is already
  // 'relative' in RN, so playerBody is a valid positioning context with no
  // extra style needed), rather than sitting in normal document flow
  // wherever the controls row above happened to end. paddingVertical here
  // is just extra touch-target comfort around the bar, not what controls
  // the 24px offset - that's bottom: 24 itself.
  queueSwipeHandleZone: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: goldenTempleTheme.spacing.sm,
  },
  // Sized down from an initial h3 match with the title (24px, confirmed
  // too large) to caption (14px) - color kept matching the title's own
  // color, set explicitly since variant alone doesn't carry color.
  // CLAUDE.md real root cause (adb uiautomator-dump confirmed): the Hindi
  // "आगे बजेगा" was measuring/laying out to a box only wide enough for its
  // first word ("आगे") before wrapping - the second word then fell outside
  // the label's own rendered bounds and got silently clipped (no ellipsis,
  // since numberOfLines is unlimited for Devanagari text - the accessibility
  // tree still reported the full un-clipped string throughout). minWidth
  // guarantees room for the full phrase without an intrinsic-measure
  // dependency; textAlign center keeps it visually centered at any width so
  // English "Up Next" (which never needed the extra room) doesn't shift.
  // textAlignVertical is forced back to 'auto' here, undoing the shared Text
  // atom's Devanagari-only 'center' override (getOptimizedTextStyle) - that
  // override is meant for single-line vertical centering and is the likely
  // reason a wrap silently clipped instead of just growing the box taller.
  queueSwipeHandleLabel: {
    color: '#5D4E37',
    marginBottom: goldenTempleTheme.spacing.sm,
    minWidth: '70%',
    textAlign: 'center',
    textAlignVertical: 'auto',
  },
  // Width now 50% of the screen (was a fixed 36px) - queueSwipeHandleZone
  // spans the full width (left:0, right:0) and centers its child, so a
  // percentage width here resolves against the screen width directly.
  queueSwipeHandleBar: {
    width: '50%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(93, 78, 55, 0.3)',
  },
  // Bare icon buttons - no chip background, matching "no box/card around
  // them." Shuffle/Previous/Next/Repeat all use this; sizing differences
  // (smaller flanking icons vs. the larger central play button) come from
  // each Ionicons `size` prop, not this shared padding/touch-target style.
  bareControlButton: {
    padding: 10,
  },
  playButtonContainer: {
    alignItems: 'center',
  },
  // Shared by both mantra and aarti/bhajan - back to the original 80x80
  // (CLAUDE.md §56 Phase 4 sizing correction reverted the aarti/bhajan-only
  // "larger" playButtonLarge variant; both now use this one style again).
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
});
