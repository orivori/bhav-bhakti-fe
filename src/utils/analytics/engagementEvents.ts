import { logAnalyticsEvent } from './logEvent';

// Engagement bucket - see Bhav_Bhakti_Analytics_Event_Plan.md §3. Unlike
// activationEvents.ts, these fire on every relevant interaction, for every
// user, always - no one-time/new-user gating.

export function logWallpaperEngaged(params: { deity: string; format: 'video' | 'static' }): void {
  logAnalyticsEvent('wallpaper_engaged', params);
}

// "Meaningful scroll depth" on Home - see FeedList.tsx's enableScrollDepthTracking
// prop, the only caller. Fires once per screen mount, not per scroll tick.
export function logHomeFeedScrolled(): void {
  logAnalyticsEvent('home_feed_scrolled');
}

// Fires on search bar FOCUS (reaching for search), before anything is even
// typed - deliberately distinct from a real query being submitted.
export function logSearchBarTapped(params: { source_screen: string }): void {
  logAnalyticsEvent('search_bar_tapped', params);
}

// Fires only on a genuine zero-result search (not the plan's fuzzier "or very
// few" - see search-results.tsx's own comment for why zero was chosen as the
// unambiguous, defensible threshold).
export function logSearchQueryZeroResults(params: { query: string }): void {
  logAnalyticsEvent('search_query_zero_results', params);
}

// Fires at 25/50/75/100% playback checkpoints - see audio-player.tsx, the
// only real "content with genuine progress" screen in this app (matches
// first_content_completed's identical Activation-bucket scoping decision:
// ringtones and Home's capped/muted AutoplayFeedCard previews are excluded by
// construction, since neither ever reaches this screen). feed_id is included
// so repeat-consumption/content_type_affinity can be derived later by
// aggregating these events, per the plan's own "derived, not a standalone
// event" framing for both.
export function logContentProgress(params: {
  feed_id: string;
  content_type: string;
  progress_percent: 25 | 50 | 75 | 100;
}): void {
  logAnalyticsEvent('content_progress', params);
}

// Fires on every chant-counter increment - both an explicit tap (CounterSheet's
// button) and an automatic +1 on a natural, non-auto-looping playthrough
// finishing (audio-player.tsx's didJustFinish effect calls the same
// handleIncrementCount either way) - both are genuine engagement with the
// counting feature, not just explicit taps, so they're deliberately tallied
// together rather than split by source.
export function logChantCounterUsed(params: { feed_id: string }): void {
  logAnalyticsEvent('chant_counter_used', params);
}

// Fires once per horoscope-detail.tsx mount, covering both real entry points
// (Home's daily-horoscope card and the 12-sign browsing grid) since both
// navigate to this one shared screen.
export function logRashifalViewed(params: { zodiac_sign: string }): void {
  logAnalyticsEvent('rashifal_viewed', params);
}

// Fires from DeityFilterRow's single shared component (reused unchanged by
// Mantra Explorer/Audio hub/Wallpaper hub - see CLAUDE.md), covering all 3
// hubs' deity chips, the Trending/All chip, and Liked from one hook point.
export function logDeityFilterUsed(params: { filter_type: 'trending' | 'liked' | 'deity'; deity_name?: string }): void {
  logAnalyticsEvent('deity_filter_used', params);
}

// Fires from shareContent.ts, the one shared entry point for every real
// share action in the app (see CLAUDE.md §34) - only on a confirmed
// completed share (result.success), not just opening the share sheet.
export function logContentShared(params: { content_type: string }): void {
  logAnalyticsEvent('content_shared', params);
}

// Fires from i18nStore's setLanguage, the single source of truth for
// language selection - covers LanguageToggle and any other future caller of
// setLanguage identically, with no per-caller duplication.
export function logLanguageSwitched(params: { from_language: string; to_language: string }): void {
  logAnalyticsEvent('language_switched', params);
}

// Fires on EVERY bottom-nav tap, every user, always - deliberately distinct
// from Activation's first_navigation_choice (new-user-only, fires once, and
// excludes Home). This one includes Home and has no gating at all, per the
// plan's own explicit wording ("not just the first-ever choice... tells us
// which section stays genuinely popular over time").
export function logHeroMenuClicked(params: { tab_name: string }): void {
  logAnalyticsEvent('hero_menu_clicked', params);
}
