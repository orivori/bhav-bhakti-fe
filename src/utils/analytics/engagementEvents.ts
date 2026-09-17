import { logAnalyticsEvent } from './logEvent';

// Engagement bucket - see Bhav_Bhakti_Analytics_Event_Plan.md §3. Unlike
// activationEvents.ts, these fire on every relevant interaction, for every
// user, always - no one-time/new-user gating.

export function logWallpaperEngaged(params: { deity: string; format: 'video' | 'static' }): void {
  logAnalyticsEvent('wallpaper_engaged', params);
}
