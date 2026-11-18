import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Feed } from '@/types/feed';
import { useEffectivelyActive } from '@/hooks/useEffectivelyActive';
import { useWallpaperActions } from '../WallpaperFeedCard/useWallpaperActions';
import { getFeedThumbnailUrl } from '@/utils/feedFields';
import { toScreenshotContentType, useScreenshotContentType } from '@/utils/analytics/screenshotEvents';
import { useFinishedVideoStore } from '@/store/finishedVideoStore';
import { VideoReplayButton } from '../VideoReplayButton';

interface ViewingWindowSheetProps {
  visible: boolean;
  feed: Feed | null;
  onDismiss: () => void;
  // Forwarded straight through to useWallpaperActions, matching
  // WallpaperFeedCard's own optional onLike/onShare/onDownload props - passing
  // the SAME callbacks the grid tiles use (the underlying feed hook's
  // likeFeed/shareFeed/downloadFeed) is what keeps a like/download performed
  // here in sync with the grid tile's own state once the window closes.
  onLike?: (feedId: string) => void;
  onShare?: (feedId: string) => void;
  onDownload?: (feedId: string) => void;
}

// CENTERED floating window, not a bottom-anchored sheet - 80% width/80%
// height, radius on all four corners, visible margin on all sides. Plain RN
// Modal + custom backdrop, mirroring DeityFilterRow.tsx's already-proven
// "More Deities" overlay pattern (transparent Modal, backdrop TouchableOpacity
// for tap-outside-to-dismiss, onRequestClose for Android hardware-back) but
// with justifyContent/alignItems: 'center' instead of that pattern's
// 'flex-end'.
//
// Phase 2: real content. Video plays WITH sound (isMuted={false}, hardcoded -
// NOT read from soundPreferenceStore, deliberately independent of both Home's
// and the grid's mute state, since this is its own isolated audio context)
// unlike the grid tile behind it, which stays unconditionally silent. It plays
// once (see hasFinished below). Video stop-on-blur/stop-on-background reuses
// useEffectivelyActive
// (extracted from AutoplayFeedCard.tsx) rather than reimplementing that
// gating - `visible` stands in for AutoplayFeedCard's FlatList-viewability
// `isActive`, since there's no list to elect from here. Like/Share/Download
// reuse useWallpaperActions (extracted from WallpaperFeedCard.tsx) rather
// than rebuilding that logic a second time.
export default function ViewingWindowSheet({
  visible,
  feed,
  onDismiss,
  onLike,
  onShare,
  onDownload,
}: ViewingWindowSheetProps) {
  const isEffectivelyActive = useEffectivelyActive(visible);
  useScreenshotContentType(toScreenshotContentType(feed?.type), visible);
  const { isDownloading, isSharing, handleLike, handleShare, handleDownload } = useWallpaperActions({
    feed,
    onLike,
    onShare,
    onDownload,
  });

  const mediaUrl = feed?.url;
  const thumbnailUrl = feed ? getFeedThumbnailUrl(feed) : null;

  // Confirmed root cause: the declarative `shouldPlay` prop alone isn't
  // enough to stop this specific player on backgrounding. This window's video
  // plays WITH sound (isMuted={false}, unlike Home's autoplay cards, which
  // default to muted) under the app's global `staysActiveInBackground: true`
  // audio session (app/_layout.tsx) - expo-av's native auto-pause-on-
  // background is disabled app-wide by that setting, and an actually-audible
  // player's underlying session appears to resist a `shouldPlay=false` prop
  // diff in a way a muted one doesn't. This imperative call is the
  // safety-net: explicitly pause the native player the moment
  // isEffectivelyActive goes false, rather than relying on the prop diff
  // alone. `shouldPlay` is left in place below for the play/resume path,
  // which was never reported broken.
  // Plays once (with sound), then stops on its last frame with the replay
  // button - each loop used to download the whole file again. Unlike the
  // tiles, opening the window always plays the video, even one that already
  // finished elsewhere: the person asked to see it. Finishing here marks it
  // finished for the session too, so the tile behind doesn't play it again
  // by itself once the window closes. Coming back from the background never
  // restarts a finished video (shouldPlay stays false); only replay does.
  const [hasFinished, setHasFinished] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  const markFinished = useFinishedVideoStore((state) => state.markFinished);
  const feedId = feed ? String(feed.id) : null;
  // A new opening (or another feed) starts fresh.
  useEffect(() => {
    setHasFinished(false);
  }, [visible, feedId]);
  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded && status.didJustFinish) {
      setHasFinished(true);
      if (feedId) markFinished(feedId);
    }
  };
  const handleReplay = () => {
    setHasFinished(false);
    setPlayerKey((key) => key + 1);
  };

  const videoRef = useRef<Video>(null);
  useEffect(() => {
    if (isEffectivelyActive) return;
    videoRef.current?.pauseAsync().catch(() => {
      // No-op: player may not be loaded yet, or already paused/unmounted.
    });
  }, [isEffectivelyActive]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onDismiss}
      >
        {/* activeOpacity=1 + a no-op onPress swallows taps so tapping the
            window itself doesn't fall through to the backdrop's dismiss. */}
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.window}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onDismiss}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>

          {mediaUrl && feed?.mediaType === 'video' ? (
            <Video
              key={playerKey}
              ref={videoRef}
              source={{ uri: mediaUrl }}
              style={styles.media}
              resizeMode={ResizeMode.CONTAIN}
              isLooping={false}
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
              shouldPlay={isEffectivelyActive && !hasFinished}
              isMuted={false}
              posterSource={thumbnailUrl ? { uri: thumbnailUrl } : undefined}
            />
          ) : mediaUrl ? (
            <Image
              source={{ uri: mediaUrl }}
              style={styles.media}
              resizeMode="contain"
            />
          ) : null}

          {mediaUrl && feed?.mediaType === 'video' && hasFinished && (
            <VideoReplayButton onPress={handleReplay} />
          )}

          {feed && (
            <View style={styles.actionsOverlay}>
              <TouchableOpacity
                style={styles.actionIcon}
                onPress={handleLike}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={feed.isLiked ? 'heart' : 'heart-outline'}
                  size={22}
                  color={feed.isLiked ? '#C41E3A' : '#fff'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionIcon}
                onPress={handleShare}
                disabled={isSharing}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {isSharing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="share-outline" size={22} color="#fff" />
                )}
              </TouchableOpacity>

              {feed.allowDownloads && (
                <TouchableOpacity
                  style={styles.actionIcon}
                  onPress={handleDownload}
                  disabled={isDownloading}
                  activeOpacity={0.8}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="download-outline" size={22} color="#fff" />
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  window: {
    width: '80%',
    height: '80%',
    // Near-black, so a wallpaper or video shown whole ("contain") gets dark
    // bars around it instead of white ones; corners match the notice cards.
    borderRadius: 20,
    backgroundColor: '#111111',
    overflow: 'hidden',
    position: 'relative',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    // Same flat-scrim convention as WallpaperFeedCard's grid-tile overlay bar
    // (kept legible against arbitrary image/video content).
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  actionIcon: {
    padding: 4,
  },
});
