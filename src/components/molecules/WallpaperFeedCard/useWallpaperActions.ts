import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import i18n from 'i18next';
import { Feed } from '@/types/feed';
import { feedService } from '@/features/feed/services/feedService';
import { useFeedStore } from '@/store/feedStore';
import { shareContent } from '@/utils/shareContent';
import { saveFeedToGallery } from '@/utils/saveFeedToGallery';

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
  const [isSharing, setIsSharing] = useState(false);
  // Guards setState calls in handleLike/handleDownload's async continuations
  // (after an await) against firing once the calling component has
  // unmounted - e.g. a like/download in flight when the user navigates away,
  // the Wallpaper Hub's grid unmounts this tile on a sub-tab switch, or the
  // Viewing Window is dismissed mid-request.
  const isMountedRef = useRef(true);
  const { toggleLike, incrementDownload } = useFeedStore();

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

  const handleShare = async () => {
    if (!feed || isSharing) return;
    if (isMountedRef.current) setIsSharing(true);

    await shareContent(feed, {
      // Reverts the loading state as soon as the OS share sheet is about to
      // present, rather than waiting for Share.open()'s own promise (which
      // only resolves once the user dismisses that sheet - could be a
      // while, and a spinner has no business running through that).
      onSharePresenting: () => {
        if (isMountedRef.current) setIsSharing(false);
      },
      onShared: (feedId) => onShare?.(feedId),
    });

    // Safety net: guarantees isSharing reverts even on a path that never
    // reaches onSharePresenting (e.g. the feed has nothing shareable at
    // all) - shareContent's own promise always eventually settles (it
    // swallows its own errors), so this always runs. A no-op if
    // onSharePresenting already flipped it.
    if (isMountedRef.current) setIsSharing(false);
  };

  const handleDownload = async () => {
    if (!feed || isDownloading || !feed.allowDownloads) return;

    if (isMountedRef.current) setIsDownloading(true);
    try {
      // Permission, duplicate check, premium gate and the album save - see
      // saveFeedToGallery.ts.
      const result = await saveFeedToGallery(feed, {
        permissionReasonKey: 'common.permissionReasonDownloadWallpaper',
      });
      if (result === 'already_saved') {
        Alert.alert(i18n.t('common.alreadySavedTitle'), i18n.t('common.alreadySavedMessage'));
      } else if (result === 'saved') {
        Alert.alert('Success', 'Wallpaper saved to your gallery!');

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

  return { isLiking, isDownloading, isSharing, handleLike, handleShare, handleDownload };
}
