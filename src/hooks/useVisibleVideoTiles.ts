import { useCallback, useRef, useState } from 'react';
import { ViewToken } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Feed } from '@/types/feed';

// Most video tiles allowed to have a mounted, playing player at once. Each
// expo-av player holds a large share of its 4-11 MB file in the Java heap,
// and v8's out-of-memory crashes cluster in the Wallpaper hub, where every
// mounted video tile used to play unconditionally.
export const MAX_PLAYING_VIDEO_TILES = 4;

// Wallpaper hub grids (Status/Wallpapers/Thought): decides which video tiles
// may mount a player - only tiles at least half on screen, the first
// MAX_PLAYING_VIDEO_TILES of them in list order, and none at all while the
// hub isn't the focused screen (Tabs keep it mounted behind other tabs).
// Every other video tile renders a still/placeholder instead (see
// WallpaperFeedCard's `shouldMountVideo`). `suspended` unmounts every tile's
// player while true (the Viewing Window open over the grid) - the visible
// set is kept, so the same tiles come back once it turns false.
export function useVisibleVideoTiles({ suspended = false }: { suspended?: boolean } = {}) {
  const isFocused = useIsFocused();
  const [visibleVideoIds, setVisibleVideoIds] = useState<ReadonlySet<string>>(() => new Set());

  // Stable identity required - FlatList throws if viewabilityConfigCallbackPairs
  // changes after the first render. Only writes state, so no stale closures.
  const viewabilityConfigCallbackPairsRef = useRef([
    {
      viewabilityConfig: { itemVisiblePercentThreshold: 50 },
      onViewableItemsChanged: ({ viewableItems }: { viewableItems: ViewToken[] }) => {
        const ids = viewableItems
          .filter((v) => v.isViewable && (v.item as Feed | undefined)?.mediaType === 'video')
          .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
          .slice(0, MAX_PLAYING_VIDEO_TILES)
          .map((v) => String((v.item as Feed).id));
        setVisibleVideoIds((prev) =>
          prev.size === ids.length && ids.every((id) => prev.has(id)) ? prev : new Set(ids)
        );
      },
    },
  ]);

  // Gated on focus here rather than by clearing the set on blur: FlatList
  // doesn't re-report viewability on refocus, so the last visible set must
  // survive for the same tiles to come back without a scroll.
  const shouldMountVideo = useCallback(
    (feed: Feed) => isFocused && !suspended && visibleVideoIds.has(String(feed.id)),
    [isFocused, suspended, visibleVideoIds]
  );

  return {
    shouldMountVideo,
    viewabilityConfigCallbackPairs: viewabilityConfigCallbackPairsRef.current,
  };
}
