// Content links: bhavbhakti://open/<type>/<feedId>, e.g. bhavbhakti://open/aarti/123.
//
// Pure functions, no imports - app/+native-intent.tsx and the deferred-link
// probe both read links through parseContentLink(), and the unit tests
// (contentLink.test.mjs) run it directly under Node.
//
// A link is outside input (any app or web page can fire the bhavbhakti://
// scheme), so the rules are strict and nothing from it is ever used as text:
// - scheme exactly "bhavbhakti:", then "//", host exactly "open", then
//   exactly two path segments - no trailing slash, no extra segments;
// - the type must be one of CONTENT_LINK_TYPES, matched exactly (lower case);
// - the feed id must match FEED_ID_PATTERN;
// - the query string and fragment are dropped unread;
// - nothing is percent-decoded, so an encoded character (e.g. %61) never
//   matches a type or an id.
// The parsed type and id are only ever compared against fixed values or sent
// to the API through feedIdForApi() - never turned into a route or a screen
// param.

export const CONTENT_LINK_TYPES = [
  'wallpaper',
  'status',
  'thought',
  'ringtone',
  'aarti',
  'bhajan',
  'mantra',
] as const;

export type ContentLinkType = (typeof CONTENT_LINK_TYPES)[number];

export interface ContentLink {
  type: ContentLinkType;
  // Digits only, see FEED_ID_PATTERN.
  feedId: string;
}

const LINK_PREFIX = 'bhavbhakti://';
const LINK_HOST = 'open';
// 1 to 999999999: no leading zero, at most 9 digits.
const FEED_ID_PATTERN = /^[1-9][0-9]{0,8}$/;
// Longer than any valid link could be with its query string - anything
// longer is rejected before it is looked at.
const MAX_LINK_LENGTH = 512;

export function isContentLinkType(value: unknown): value is ContentLinkType {
  return typeof value === 'string' && (CONTENT_LINK_TYPES as readonly string[]).includes(value);
}

export function isValidFeedId(value: unknown): value is string {
  return typeof value === 'string' && FEED_ID_PATTERN.test(value);
}

// Null for anything that isn't exactly a valid content link.
export function parseContentLink(raw: unknown): ContentLink | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_LINK_LENGTH) return null;

  // Query string and fragment are ignored: cut at the first '?' or '#'.
  const cutAt = raw.search(/[?#]/);
  const link = cutAt === -1 ? raw : raw.slice(0, cutAt);

  if (!link.startsWith(LINK_PREFIX)) return null;
  const segments = link.slice(LINK_PREFIX.length).split('/');
  // [host, type, feedId] - exactly that, so a trailing slash (an empty fourth
  // segment), a missing segment or an extra one is rejected.
  if (segments.length !== 3) return null;

  const [host, type, feedId] = segments;
  if (host !== LINK_HOST) return null;
  if (!isContentLinkType(type) || !isValidFeedId(feedId)) return null;

  return { type, feedId };
}

// The only form in which a link's id may reach an API call.
export function feedIdForApi(link: ContentLink): string {
  return encodeURIComponent(String(Number(link.feedId)));
}
