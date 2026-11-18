// Parameters for two story events, kept import-free so Node's test runner can
// check them (storyLinkEventParams.test.mjs). No ids, titles or personal data
// ever (CLAUDE.md §134).

// Firebase `story_link_landed`: how a story link (pin or page form) ended.
export type StoryLinkLandedResult = 'opened' | 'not_found' | 'type_mismatch' | 'expired' | 'error';

const RESULTS: readonly string[] = ['opened', 'not_found', 'type_mismatch', 'expired', 'error'];

// Only story links are reported; any other link type, kind or result gives
// null (nothing is sent).
export function storyLinkLandedParams(
  link: { type: string; kind: string },
  result: string
): { kind: 'pin' | 'page'; result: StoryLinkLandedResult } | null {
  if (link.type !== 'stories') return null;
  if (link.kind !== 'pin' && link.kind !== 'page') return null;
  if (!RESULTS.includes(result)) return null;
  return { kind: link.kind, result: result as StoryLinkLandedResult };
}

// Meta `story_play_started`: a story episode really started playing in the
// player. The action word is 'listen' (§134).
export const STORY_PLAY_STARTED_META_PARAMS = { content_type: 'stories', action: 'listen' } as const;
