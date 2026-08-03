import React, { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import ViewingWindowSheet from '@/components/molecules/ViewingWindowSheet/ViewingWindowSheet';
import { Feed } from '@/types/feed';

// TEMPORARY/PLACEHOLDER - mirrors the identical seam in AutoplayFeedCard.tsx
// (Home feed autoplay cards). There is no real entitlement/paywall system
// anywhere in this app yet. This is its own local copy, not an import of that
// file's constant - that file's own comment says "do not read this constant
// from anywhere else," so the two features can be wired to a real paywall
// independently later without one accidentally changing the other's gating.
// TEMPORARILY forced true for on-device testing of the sheet itself - MUST be
// flipped back to false before committing anything (founder's own request).
const isPremiumUser = true;

interface UseViewingWindowArgs {
  // The SAME live array each hub tab already renders its grid from
  // (useWallpaperFeed's/useFeed's `feeds`). Fix A: the window used to hold a
  // one-time copy of the tapped Feed object, captured once at open() and
  // never refreshed - so a like/unlike performed from inside the window (a
  // real, working state change in THIS array) never reflected back into the
  // window's own icon, even though the grid tile update fine (it always
  // reads straight from this same live array). Passing the array itself and
  // looking the current item up by id on every render means the window
  // always shows whatever this array currently says, exactly like the grid
  // tile does.
  feeds: Feed[];
  // Same callbacks each hub tab already passes into WallpaperFeedCard as
  // onLike/onShare/onDownload (i.e. the underlying feed hook's
  // likeFeed/shareFeed/downloadFeed).
  onLike?: (feedId: string) => void;
  onShare?: (feedId: string) => void;
  onDownload?: (feedId: string) => void;
}

// Shared hook/host for the Viewing Window feature: owns the window's
// open/closed state so StatusTabContent/WallpapersTabContent/
// ThoughtTabContent can each wire it in with a couple of lines instead of
// duplicating this state three times (the "forgot to update the Nth spot"
// bug class this project has hit before with per-callsite copies - see
// CLAUDE.md's Audio hub deity-filter notes). Deliberately NOT a per-grid-tile
// self-contained window inside WallpaperFeedCard itself - all three hub grids
// already set removeClippedSubviews on their FlatLists, and a list item that
// owns a currently-open modal could get unmounted by clipping/recycling
// mid-use, the same "resource-owning component unmounts while still in use"
// crash class already seen with players in this app. Keeping ownership at the
// stable tab-content level avoids that.
export function useViewingWindow({ feeds, onLike, onShare, onDownload }: UseViewingWindowArgs) {
  // Only an id, not a Feed object - the object itself is looked up fresh from
  // `feeds` below on every render, so it can never go stale the way a
  // captured object reference would.
  const [feedId, setFeedId] = useState<string | null>(null);

  const feed = useMemo(
    () => (feedId ? feeds.find((f) => f.id.toString() === feedId) ?? null : null),
    [feedId, feeds]
  );

  // Gates the TAP itself, before the window ever opens - non-premium users
  // see the paywall stub directly and the window never appears, matching how
  // Home's existing AutoplayFeedCard CTA gate behaves today.
  const open = useCallback((targetFeed: Feed) => {
    if (!isPremiumUser) {
      Alert.alert('Premium Feature', 'This will be available with Bhav Bhakti Premium. Stay tuned!');
      return;
    }
    setFeedId(targetFeed.id.toString());
  }, []);

  // Fires on backdrop tap and Android hardware-back alike (both handled by
  // ViewingWindowSheet's Modal) - the single place feed state gets cleared
  // regardless of how the window was closed.
  const handleDismiss = useCallback(() => {
    setFeedId(null);
  }, []);

  const ViewingWindow = React.createElement(ViewingWindowSheet, {
    visible: feedId !== null,
    feed,
    onDismiss: handleDismiss,
    onLike,
    onShare,
    onDownload,
  });

  return { open, ViewingWindow };
}
