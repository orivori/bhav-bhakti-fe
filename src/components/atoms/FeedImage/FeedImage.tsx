import React, { useMemo } from 'react';
import type { ImageStyle, StyleProp } from 'react-native';
import { Image } from 'expo-image';
import { imageCacheKey } from '@/utils/media/imageCacheKey';

// Every feed image (wallpapers, thumbnails, covers) goes through this one
// component, so it is cached on the phone's disk by the file's storage path
// instead of by the signed link, which changes on every fetch (see
// imageCacheKey.ts). The only place in the app that imports expo-image.
//
// Fixed choices (v12 plan):
// - cachePolicy memory-disk: memory first, then disk, then the network.
// - transition 300 ms: about the fade React Native's own Image gave on
//   Android, so images don't pop in harder than before.
// - expo-image's default downscaling stays on: an image is decoded at the
//   size of its box, not the file's full size.
// - No decodeFormat: full colour with transparency (some wallpaper PNGs are
//   transparent). No placeholder: the box behind keeps its own background.
// - Never Image.prefetch for feed media: it can't use this key.
//
// No link = no source: an empty box with the same style, as before.

export type FeedImageFit = 'cover' | 'contain';

export interface FeedImageProps {
  // The signed link (or null/undefined when the item has no image).
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  // Same meaning as React Native's resizeMode; 'cover' like its default.
  contentFit?: FeedImageFit;
  blurRadius?: number;
  transition?: number;
  accessibilityLabel?: string;
}

const DEFAULT_TRANSITION_MS = 300;

export default function FeedImage({
  uri,
  style,
  contentFit = 'cover',
  blurRadius,
  transition = DEFAULT_TRANSITION_MS,
  accessibilityLabel,
}: FeedImageProps) {
  const source = useMemo(() => {
    if (typeof uri !== 'string' || uri.length === 0) return null;
    const cacheKey = imageCacheKey(uri);
    return cacheKey ? { uri, cacheKey } : { uri };
  }, [uri]);

  return (
    <Image
      source={source}
      style={style}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      transition={transition}
      blurRadius={blurRadius}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
