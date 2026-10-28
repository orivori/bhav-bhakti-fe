import { useEffect, useId } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { logAnalyticsEvent } from './logEvent';

// screenshot_taken: what kind of content people screenshot (A1 baseline).
// Only the content type is sent - nothing about the user or the feed.
export type ScreenshotContentType =
  | 'mantra'
  | 'aarti'
  | 'bhajan'
  | 'ringtone'
  | 'wallpaper'
  | 'thought'
  | 'other';

const KNOWN_TYPES: readonly ScreenshotContentType[] = ['mantra', 'aarti', 'bhajan', 'ringtone', 'wallpaper', 'thought'];

// Maps a feed's type (or anything else) to the event's fixed list; stories,
// general and unknown types become 'other'.
export function toScreenshotContentType(feedType: string | null | undefined): ScreenshotContentType {
  return KNOWN_TYPES.includes(feedType as ScreenshotContentType) ? (feedType as ScreenshotContentType) : 'other';
}

// Screens declare what they're showing; the newest active declaration wins
// (e.g. the Viewing Window over the Wallpaper hub). Nothing declared (Home,
// Profile, Rashifal, Stories...) = 'other'.
const declarations: { id: string; type: ScreenshotContentType }[] = [];

export function getCurrentScreenshotContentType(): ScreenshotContentType {
  return declarations.length > 0 ? declarations[declarations.length - 1].type : 'other';
}

// Declares `type` while the calling screen is focused and `isActive` is true.
// Tab screens stay mounted when hidden, so focus (not mount) is what counts.
export function useScreenshotContentType(type: ScreenshotContentType, isActive: boolean = true): void {
  const id = useId();
  const isFocused = useIsFocused();
  const active = isFocused && isActive;

  useEffect(() => {
    if (!active) return;
    declarations.push({ id, type });
    return () => {
      const index = declarations.findIndex((entry) => entry.id === id);
      if (index !== -1) declarations.splice(index, 1);
    };
  }, [active, id, type]);
}

export function logScreenshotTaken(): void {
  logAnalyticsEvent('screenshot_taken', { content_type: getCurrentScreenshotContentType() });
}
