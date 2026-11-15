import { router } from 'expo-router';
import { buildStoryPageParams, STORY_PAGE_PATH, type StoryPageSource } from './storyPage';

/**
 * Opens the story page (series or single story) - the only way in, so every
 * entry passes the same explicit params (storyPage.ts) and never leaves a
 * stale returnTo behind. router.navigate, never replace: the page is a
 * hidden tab screen (CLAUDE.md §115).
 */
export function openStoryPage(options: {
  storyId: number | string;
  source: StoryPageSource;
  returnTo: string;
  returnParams?: Record<string, string> | null;
}): void {
  router.navigate({ pathname: STORY_PAGE_PATH as any, params: buildStoryPageParams(options) });
}
