import { logAnalyticsEvent } from './logEvent';

// Chant-counter baseline (A1 of the 2026-10-25 roadmap decisions): how people
// use the free mantra counter before any ads go in. No per-tap events here -
// chant_counter_used (engagementEvents.ts) already covers increments. Every
// event carries the feed id only, never anything about the user. Fired from
// useChantCounterAnalytics (src/hooks/), which decides the once-per-open rules.

// The counter button became visible for a mantra open (once per open).
export function logCounterViewed(params: { feed_id: string; target: number }): void {
  logAnalyticsEvent('counter_viewed', params);
}

// The counter sheet was opened from the player's counter button.
export function logCounterOpened(params: { feed_id: string; count: number; target: number }): void {
  logAnalyticsEvent('counter_opened', params);
}

// A different target was picked (CounterSheet chip or "More").
export function logCounterTargetChanged(params: { feed_id: string; from_target: number; to_target: number }): void {
  logAnalyticsEvent('counter_target_changed', params);
}

// The count reached 11, 108, or a chosen target other than those two
// ('other'). Each milestone fires at most once per mantra open.
export type CounterMilestone = '11' | '108' | 'other';

export function logCounterMilestone(params: {
  feed_id: string;
  milestone: CounterMilestone;
  count: number;
  target: number;
}): void {
  logAnalyticsEvent('counter_milestone', params);
}
