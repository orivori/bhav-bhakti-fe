import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

// Extracted from AutoplayFeedCard.tsx's isEffectivelyActive computation (Home
// feed autoplay cards) so ViewingWindowSheet (Phase 2 of the Viewing Window
// feature) can reuse the identical stop-on-blur/stop-on-background gating
// instead of reimplementing it. AutoplayFeedCard.tsx itself was deliberately
// NOT retrofitted to call this hook - it's a stable, heavily fought-for file
// (see CLAUDE.md's Home autoplay sessions), and swapping its working inline
// effects for this hook is a pure-refactor risk with no user-facing benefit.
//
// `isActive` here means "should this instance be considered visible/eligible
// to play at all." For AutoplayFeedCard that's FlatList viewability
// election; for ViewingWindowSheet it's simply the window's own `visible`
// prop, since there's no scrolling list to elect from - it's a single,
// isolated instance, so no viewability threshold/debouncing is needed on top
// of this.
//
// AppState subscription is INTENTIONALLY UNCONDITIONAL (mount-once, deps: []),
// diverging from AutoplayFeedCard's original isActive-gated version. On-device
// testing (with logging) confirmed the gated version's AppState.addEventListener
// call genuinely never establishes when isActive flips true in this component's
// context - root cause unconfirmed (ruled out: Android's "Don't keep
// activities"; ruled out via RN source reading: Modal has no wiring to
// AppStateModule's onHostResume/onHostPause, so it shouldn't matter which
// native view is on screen - but the gated effect demonstrably doesn't fire
// here regardless). Rather than chase that further, this subscribes once,
// unconditionally, for this component's entire lifetime - there is no
// re-subscribe-on-isActive-change timing left to get wrong, because there's
// no re-subscribe. AutoplayFeedCard's original per-isActive gating existed to
// avoid every idle FlatList item holding its own listener; that reasoning
// doesn't apply here since ViewingWindowSheet is a single always-mounted
// instance, not one of many, so an always-on listener costs nothing extra.
//
// DIAGNOSTIC LOGGING (temporary, kept from the previous investigation pass):
// still reads AppState.currentState directly inside the event handler rather
// than trusting the event's own nextAppState argument, and still logs each
// stage - useful to confirm this fix actually fires reliably on-device before
// removing the logs.
export function useEffectivelyActive(isActive: boolean): boolean {
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      console.log('[useEffectivelyActive] screen focused');
      setIsScreenFocused(true);
      return () => {
        console.log('[useEffectivelyActive] screen blurred');
        setIsScreenFocused(false);
      };
    }, [])
  );

  const [isAppActive, setIsAppActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    // Mount-once, unconditional - see the file-level comment above for why
    // this is deliberately NOT gated on `isActive` and has no dependency
    // array entries.
    const syncFromCurrentState = (source: string) => {
      const currentlyActive = AppState.currentState === 'active';
      console.log(
        `[useEffectivelyActive] ${source}: AppState.currentState="${AppState.currentState}", isAppActive -> ${currentlyActive}`
      );
      setIsAppActive(currentlyActive);
    };

    console.log('[useEffectivelyActive] establishing AppState subscription (mount-once, unconditional)');
    syncFromCurrentState('effect-setup');

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      console.log(`[useEffectivelyActive] 'change' event fired, nextAppState="${nextAppState}"`);
      syncFromCurrentState('change-event');
    });

    return () => {
      console.log('[useEffectivelyActive] tearing down AppState subscription (component unmounting)');
      subscription.remove();
    };
  }, []);

  const isEffectivelyActive = isActive && isScreenFocused && isAppActive;

  useEffect(() => {
    console.log(
      `[useEffectivelyActive] isActive=${isActive} isScreenFocused=${isScreenFocused} isAppActive=${isAppActive} => isEffectivelyActive=${isEffectivelyActive}`
    );
  }, [isActive, isScreenFocused, isAppActive, isEffectivelyActive]);

  return isEffectivelyActive;
}
