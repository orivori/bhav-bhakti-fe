import { logAnalyticsEvent } from './logEvent';
import { useFeatureFlagStore } from '@/store/featureFlagStore';
import { getUpdateRequirement } from '@/utils/appUpdate/useUpdateRequirement';
import { cleanCampaign, notificationTargetLabel, setPushCampaign } from '@/utils/notifications/pushAttribution';

// notification_opened (Firebase only): a push was tapped. Logged by both
// handlers in app/_layout.tsx BEFORE navigating:
//   campaign  - the push data's `campaign` (cleaned; missing = none)
//   target    - the allow-listed screen it leads to, 'invalid', or 'blocked'
//               (maintenance mode or the forced-update screen is up)
//   app_state - 'cold' (the tap started the app) or 'background'
// It also remembers "opened from push <campaign>" in memory for 30 minutes,
// so Rashifal events in that session can carry push_campaign. No ids, titles
// or personal data. The push's own text is never logged.
export function logNotificationOpened(
  data: Record<string, string | object> | undefined,
  appState: 'cold' | 'background'
): void {
  try {
    const blocked =
      useFeatureFlagStore.getState().status === 'maintenance' || getUpdateRequirement() === 'required';
    const campaign = cleanCampaign(data?.campaign);
    const target = notificationTargetLabel(data?.screen, blocked);
    setPushCampaign(campaign);
    logAnalyticsEvent('notification_opened', { campaign, target, app_state: appState });
  } catch (error) {
    // Analytics must never stop the tap from opening its screen.
    console.error('notification_opened failed:', error);
  }
}
