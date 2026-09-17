import { logAnalyticsEvent } from './logEvent';

// Conversion bucket - see Bhav_Bhakti_Analytics_Event_Plan.md §4.
//
// ONLY paywall_hit is built here. trial_started/trial_converted_to_paid/
// trial_ended_without_converting/subscription_cancelled all require a real
// Premium pipeline frontend (react-native-razorpay checkout, usePremiumStore
// wired to GET /subscription/status, a real Manage Subscription/cancel flow)
// that does not exist yet - isPremium is permanently stuck false for every
// user today (see CLAUDE.md §87). There is no "start a trial," "subscription
// converted," "trial ended," or "cancel" code path anywhere in this app to
// hook an event into - adding those functions now would mean events that can
// never actually fire, which is worse than not having them. Confirmed
// deliberately deferred until that pipeline is built, not an oversight.
//
// The derived "paywall hits before converting" metric is similarly blocked -
// it's computed by comparing paywall_hit counts against trial_started per
// user, and the latter doesn't exist yet either.
export function logPaywallHit(params: { trigger_feature: string }): void {
  logAnalyticsEvent('paywall_hit', params);
}

// Deliberately NOT paywall_hit - profile.tsx has two more setShowPaywall(true)
// call sites (the header pill, the profile-card upgrade banner) that are
// unprompted "I'm curious about Premium" taps with no specific feature
// blocked behind them, unlike paywall_hit's three real reactive gate-hits.
// Conflating the two would muddy "which feature is the real hook" - this
// event answers a different question (does generic upgrade messaging alone
// draw interest) and is tagged by which of the two UI locations was tapped.
export function logUpgradeCtaClicked(params: { source: 'header' | 'profile_card' }): void {
  logAnalyticsEvent('upgrade_cta_clicked', params);
}
