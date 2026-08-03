import { useEffect, useRef, useState } from 'react';
import { Alert, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { Feed } from '@/types/feed';
import { feedService } from '@/features/feed/services/feedService';
import { useFeedStore } from '@/store/feedStore';
import { useTranslation } from '@/hooks/useTranslation';
import { getMediaFileExtension } from '@/utils/getMediaFileExtension';

interface UseWallpaperActionsArgs {
  // Nullable so ViewingWindowSheet (Phase 2 of the Viewing Window feature)
  // can call this hook unconditionally even while closed/no feed selected
  // (rules of hooks - can't call it conditionally) - each handler below
  // no-ops if feed is null.
  feed: Feed | null;
  onLike?: (feedId: string) => void;
  onShare?: (feedId: string) => void;
  onDownload?: (feedId: string) => void;
}

// Extracted from WallpaperFeedCard.tsx (originally defined inline there) so
// ViewingWindowSheet can call the exact same Like/Share/Download behavior
// instead of reimplementing it. WallpaperFeedCard was refactored to call this
// hook too (see its own diff), so there is exactly one implementation, not
// two hand-kept-in-sync copies.
export function useWallpaperActions({ feed, onLike, onShare, onDownload }: UseWallpaperActionsArgs) {
  const [isLiking, setIsLiking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  // Guards setState calls in handleLike/handleDownload's async continuations
  // (after an await) against firing once the calling component has
  // unmounted - e.g. a like/download in flight when the user navigates away,
  // the Wallpaper Hub's grid unmounts this tile on a sub-tab switch, or the
  // Viewing Window is dismissed mid-request.
  const isMountedRef = useRef(true);
  const { toggleLike, incrementDownload, incrementShare } = useFeedStore();
  const { language } = useTranslation();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleLike = () => {
    if (!feed) return;
    console.log('❤️ Heart button pressed for wallpaper:', feed.id, 'isLiked:', feed.isLiked);

    if (onLike) {
      onLike(feed.id.toString());
    } else {
      if (isLiking) return;
      if (isMountedRef.current) setIsLiking(true);

      const performLike = async () => {
        try {
          if (feed.isLiked) {
            await feedService.unlikeFeed(feed.id.toString());
          } else {
            await feedService.likeFeed(feed.id.toString());
          }
          toggleLike(feed.id.toString());
        } catch (error) {
          console.error('Error liking wallpaper:', error);
          Alert.alert('Error', 'Failed to like the wallpaper. Please try again.');
        } finally {
          if (isMountedRef.current) setIsLiking(false);
        }
      };

      performLike();
    }
  };

  // No isMountedRef guard needed here (unlike handleLike/handleDownload) -
  // this handler has no local setState of its own to protect; incrementShare
  // is a Zustand store update (safe post-unmount, not a React state setter on
  // the calling component) and Alert.alert/Share.share are native imperative
  // calls.
  const handleShare = async () => {
    if (!feed) return;
    try {
      await feedService.shareFeed(feed.id.toString(), { platform: 'native_share' });
      incrementShare(feed.id.toString());

      const title = feed.title ? (feed.title[language] || feed.title.en || '') : '';
      const result = await Share.share({
        message: title
          ? `Check out this beautiful wallpaper: ${title}\n\nShared from Bhav Bhakti App`
          : 'Check out this amazing wallpaper from Bhav Bhakti App!',
        url: feed.media[0]?.mediaUrl,
      });

      if (result.action === Share.sharedAction) {
        onShare?.(feed.id.toString());
      }
    } catch (error) {
      console.error('Error sharing wallpaper:', error);
      Alert.alert('Error', 'Failed to share the wallpaper. Please try again.');
    }
  };

  const handleDownload = async () => {
    if (!feed || isDownloading || !feed.allowDownloads) return;

    if (isMountedRef.current) setIsDownloading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to save wallpaper to your gallery.');
        return;
      }

      const mediaToDownload = feed.media[0];
      if (!mediaToDownload) return;

      const extension = getMediaFileExtension(mediaToDownload.mediaUrl, mediaToDownload.type);
      // Timestamp suffix guarantees a unique local path on every attempt -
      // without it, downloading the same content twice reused the identical
      // deterministic path, and MediaStore's own collision handling on at
      // least some Android versions appears to resolve that back to the
      // existing gallery entry instead of creating a new one, even though
      // both attempts still reported success (see CLAUDE.md's Viewing Window
      // download investigation).
      const fileUri = FileSystem?.documentDirectory + `wallpaper_${feed.id}_${mediaToDownload.id}_${Date.now()}.${extension}`;
      const downloadResult = await FileSystem.downloadAsync(
        mediaToDownload.mediaUrl,
        fileUri
      );

      if (downloadResult.status === 200) {
        await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
        // Clean up the local staging copy now that it's safely in the
        // gallery - redundant once there, and otherwise left to accumulate
        // in documentDirectory indefinitely. Best-effort: the gallery save
        // already succeeded either way, so a cleanup failure here shouldn't
        // surface as a user-facing error.
        FileSystem.deleteAsync(downloadResult.uri, { idempotent: true }).catch(() => {});
        Alert.alert('Success', 'Wallpaper saved to your gallery!');

        await feedService.downloadFeed(feed.id.toString());
        incrementDownload(feed.id.toString());
        onDownload?.(feed.id.toString());
      }
    } catch (error) {
      console.error('Error downloading wallpaper:', error);
      Alert.alert('Error', 'Failed to download wallpaper. Please try again.');
    } finally {
      if (isMountedRef.current) setIsDownloading(false);
    }
  };

  return { isLiking, isDownloading, handleLike, handleShare, handleDownload };
}
