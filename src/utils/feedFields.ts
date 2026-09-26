import { Feed } from '@/types/feed';

// A feed's single thumbnail, for places that show one image regardless of
// shape. Prefers the 4:5 portrait crop, falling back to the 1:1 square one -
// the same choice the backend's old media[0].thumbnailUrl made, so switching
// off that field doesn't change which image any screen shows.
export function getFeedThumbnailUrl(feed: Pick<Feed, 'thumbnailPortraitUrl' | 'thumbnailSquareUrl'>): string | null {
  return feed.thumbnailPortraitUrl || feed.thumbnailSquareUrl || null;
}

// A feed's subtitle in the app's current language, falling back to English -
// the same resolution the app uses for the bilingual `title`.
export function getFeedSubtitle(feed: Pick<Feed, 'subtitle'>, language: string): string {
  return feed.subtitle?.[language] || feed.subtitle?.en || '';
}
