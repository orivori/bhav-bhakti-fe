import { router } from 'expo-router';
import { buildStoryPageParams, STORY_PAGE_PATH, type StoryPageSource } from './storyPage';
import { logStoryPageOpened } from '@/utils/analytics/storyEvents';

/**
 * Opens the story page (series or single story) - the only way in, so every
 * entry passes the same explicit params (storyPage.ts) and never leaves a
 * stale returnTo behind. router.navigate, never replace: the page is a
 * hidden tab screen (CLAUDE.md §115). Sends story_page_opened.
 */
export function openStoryPage(options: {
  storyId: number | string;
  source: StoryPageSource;
  // Series or single story (for story_page_opened).
  isSingle: boolean;
  returnTo: string;
  returnParams?: Record<string, string> | null;
}): void {
  logStoryPageOpened({ source: options.source, isSingle: options.isSingle, storyId: options.storyId });
  router.navigate({ pathname: STORY_PAGE_PATH as any, params: buildStoryPageParams(options) });
}
