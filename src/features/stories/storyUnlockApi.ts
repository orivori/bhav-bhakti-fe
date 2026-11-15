import { apiClient } from '@/shared/services/apiClient';
import type { ApiError } from '@/features/authentication/types';
import { classifyStoryUnlockResponse, parseStoryState, type StoryState, type StoryUnlockResponse } from './storyLock';

// POST /api/v1/story-unlocks (backend CLAUDE.md §144). The path lives here,
// like adUnlockApi.ts, so this file cherry-picks cleanly.
const STORY_UNLOCKS_PATH = '/v1/story-unlocks';
const STORY_UNLOCK_TIMEOUT_MS = 6000;

export type StoryUnlockRecordSource = 'reward' | 'no_fill';

export interface StoryUnlockRecordResult {
  outcome: StoryUnlockResponse;
  // The item's state after the call, when the server sent one.
  state: StoryState | null;
}

export async function recordStoryUnlock(params: {
  feedId: string;
  source: StoryUnlockRecordSource;
}): Promise<StoryUnlockRecordResult> {
  try {
    // apiClient.post resolves to the response body: { success, message, data }.
    const body = await apiClient.post<{ data?: { state?: string } }>(
      STORY_UNLOCKS_PATH,
      { feedId: Number(params.feedId), source: params.source },
      { timeout: STORY_UNLOCK_TIMEOUT_MS }
    );
    return { outcome: 'granted', state: parseStoryState(body?.data?.state) };
  } catch (error) {
    // apiClient turns an error response into { message, code, statusCode }.
    const apiError = error as ApiError | undefined;
    const outcome = classifyStoryUnlockResponse(apiError?.statusCode, apiError?.code);
    if (outcome === 'failed') {
      console.warn(`recordStoryUnlock: ${params.source} for feed ${params.feedId} failed`, apiError?.statusCode);
    }
    return { outcome, state: null };
  }
}
