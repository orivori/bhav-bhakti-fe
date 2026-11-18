import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { FeedImage } from '@/components/atoms/FeedImage';
import {
  forgetLocalVideo,
  getLocalVideoUri,
  holdLocalVideo,
  requestVideoSave,
} from '@/utils/videoCache/videoCache';
import { shouldStartVideoSave } from '@/utils/videoCache/videoCacheRules';
import { chooseVideoSource, shouldShowPoster } from './feedVideoRules';
import { VIDEO_SAVING_ENABLED, VIDEO_SURFACE_TYPE } from './feedVideoSettings';

// One feed video (video wallpapers): expo-video, replacing expo-av's <Video>.
// Every place that plays a feed video uses this - hub tiles, Search, Home and
// the Viewing Window (future story videos should too).
//
// The caller keeps every decision it made with expo-av: whether a player is
// mounted at all (the 4-tile limit, Home's active card +-1), whether it should
// play now (shouldPlay), muted or not, and play-once (onFinish + a new `key`
// to replay). Mounting creates one player; unmounting releases it.
//
// - Played from code (shouldPlay -> play()/pause()), as the expo-av lesson in
//   CLAUDE.md §112 asks. expo-video also pauses its own players when the app
//   goes to the background; the caller's own logic resumes them.
// - Never loops; at the end the last frame stays and onFinish() is called.
// - No native controls, no fullscreen, no picture-in-picture, the screen is
//   not kept awake, expo-video's own (link-keyed) cache is off.
// - The thumbnail (FeedImage, cached by storage path) covers the video until
//   its first frame is drawn, and stays if the video fails.
// - Saved videos (videoCache.ts, when VIDEO_SAVING_ENABLED): a saved file is
//   played if there is one; otherwise the link streams and, after ~2 s of real
//   playback, a copy is saved for next time. A saved file that fails to play
//   is forgotten and the link streams instead. Saving never touches playback.

export interface FeedVideoProps {
  feedId: string;
  // The signed video link.
  uri: string;
  // The thumbnail shown before the first frame.
  posterUri?: string | null;
  style?: StyleProp<ViewStyle>;
  contentFit: 'cover' | 'contain';
  shouldPlay: boolean;
  muted: boolean;
  // Played to the end (play-once).
  onFinish?: () => void;
}

// How often (seconds) a streamed video reports its position, to start saving.
const SAVE_CHECK_INTERVAL_S = 0.5;

export default function FeedVideo({
  feedId,
  uri,
  posterUri,
  style,
  contentFit,
  shouldPlay,
  muted,
  onFinish,
}: FeedVideoProps) {
  // Decided at mount; changes only if a saved file fails to play.
  const [localFailed, setLocalFailed] = useState(false);
  const [initialLocalUri] = useState(() => (VIDEO_SAVING_ENABLED ? getLocalVideoUri(feedId, uri) : null));
  const source = useMemo(
    () =>
      chooseVideoSource({
        savingEnabled: VIDEO_SAVING_ENABLED,
        localUri: initialLocalUri,
        remoteUri: uri,
        localFailed,
      }),
    // The link is read once per player: a refreshed signature must not
    // rebuild a playing player. A new feed/video remounts the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialLocalUri, localFailed]
  );
  const isRemote = source.kind === 'remote';

  const player = useVideoPlayer({ uri: source.uri, useCaching: false }, (newPlayer) => {
    newPlayer.loop = false;
    newPlayer.muted = muted;
    newPlayer.keepScreenOnWhilePlaying = false;
    newPlayer.staysActiveInBackground = false;
    newPlayer.timeUpdateEventInterval = VIDEO_SAVING_ENABLED && isRemote ? SAVE_CHECK_INTERVAL_S : 0;
  });

  const [firstFrameShown, setFirstFrameShown] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saveRequested, setSaveRequested] = useState(false);

  // A new player (the saved file failed and the link streams instead) starts fresh.
  useEffect(() => {
    setFirstFrameShown(false);
    setFailed(false);
  }, [player]);

  // While a saved file plays, the cap never removes it.
  useEffect(() => {
    if (source.kind !== 'local') return;
    return holdLocalVideo(source.uri);
  }, [source]);

  useEffect(() => {
    try {
      player.muted = muted;
    } catch {
      // Released player: nothing to do.
    }
  }, [player, muted]);

  // Ended once: never started again by itself (play-once; Replay remounts).
  const endedRef = useRef(false);
  useEffect(() => {
    endedRef.current = false;
  }, [player]);

  useEffect(() => {
    try {
      if (shouldPlay && !endedRef.current) player.play();
      else player.pause();
    } catch {
      // Released player: nothing to do.
    }
  }, [player, shouldPlay]);

  // expo-video pauses its players when the app goes to the background but
  // never resumes them. Callers whose shouldPlay doesn't follow the app state
  // (hub tiles, Search) stay `true` throughout, so resume here on return.
  const shouldPlayRef = useRef(shouldPlay);
  shouldPlayRef.current = shouldPlay;
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !shouldPlayRef.current || endedRef.current) return;
      try {
        player.play();
      } catch {
        // Released player: nothing to do.
      }
    });
    return () => subscription.remove();
  }, [player]);

  const requestSave = useCallback(
    (positionMs: number, didFinish: boolean) => {
      if (!VIDEO_SAVING_ENABLED) return;
      const start = shouldStartVideoSave({
        isRemote,
        alreadyRequested: saveRequested,
        isPlaying: player.playing,
        positionMs,
        didFinish,
      });
      if (!start) return;
      setSaveRequested(true);
      requestVideoSave(feedId, uri);
    },
    [feedId, uri, isRemote, saveRequested, player]
  );

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    requestSave(currentTime * 1000, false);
  });

  useEventListener(player, 'playToEnd', () => {
    endedRef.current = true;
    requestSave(player.currentTime * 1000, true);
    onFinish?.();
  });

  useEventListener(player, 'statusChange', ({ status }) => {
    if (status !== 'error') return;
    if (source.kind === 'local') {
      // The saved file is missing or broken: forget it, stream the link.
      forgetLocalVideo(source.uri);
      setLocalFailed(true);
      return;
    }
    setFailed(true);
  });

  const showPoster = shouldShowPoster({ hasPoster: !!posterUri, firstFrameShown, failed });

  return (
    <View style={style}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        nativeControls={false}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
        surfaceType={VIDEO_SURFACE_TYPE}
        onFirstFrameRender={() => setFirstFrameShown(true)}
      />
      {showPoster && <FeedImage uri={posterUri} style={StyleSheet.absoluteFill} contentFit={contentFit} />}
    </View>
  );
}
