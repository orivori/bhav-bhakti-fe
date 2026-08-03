import React, { useEffect, useRef } from 'react';
import { Modal, View, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { designSystemTheme } from '@/styles/designSystemTheme';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { Feed } from '@/types/feed';
import { useEffectivelyActive } from '@/hooks/useEffectivelyActive';
import { useWallpaperActions } from '../WallpaperFeedCard/useWallpaperActions';

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
// unlike the grid tile behind it, which stays unconditionally silent. Video
// looping/stop-on-blur/stop-on-background reuses useEffectivelyActive
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
  const { isDownloading, handleLike, handleShare, handleDownload } = useWallpaperActions({
    feed,
    onLike,
    onShare,
    onDownload,
  });

  const media = feed?.media?.[0];

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

          {media?.type === 'video' ? (
            <Video
              ref={videoRef}
              source={{ uri: media.mediaUrl }}
              style={styles.media}
              resizeMode={ResizeMode.CONTAIN}
              isLooping
              shouldPlay={isEffectivelyActive}
              isMuted={false}
              posterSource={media.thumbnailUrl ? { uri: media.thumbnailUrl } : undefined}
            />
          ) : media ? (
            <Image
              source={{ uri: media.mediaUrl }}
              style={styles.media}
              resizeMode="contain"
            />
          ) : null}

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
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="share-outline" size={22} color="#fff" />
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
    borderRadius: goldenTempleTheme.borderRadius.xl,
    backgroundColor: designSystemTheme.colors.surface,
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
