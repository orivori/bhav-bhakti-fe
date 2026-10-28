import { useCallback, useEffect, useRef } from 'react';
import {
  CounterMilestone,
  logCounterMilestone,
  logCounterOpened,
  logCounterTargetChanged,
  logCounterViewed,
} from '@/utils/analytics/counterEvents';

interface ChantCounterAnalyticsInput {
  feedId: string | undefined;
  // The route's playRequestId. Every real "play this" tap sends a fresh one
  // (src/utils/playRequest.ts), while returning through the MiniPlayer keeps
  // the old one - so feedId + playRequestId identifies one mantra open.
  playRequestId: string | undefined;
  isCounterVisible: boolean;
  chantCount: number;
  targetCount: number;
}

// Keeps the counter events' once-per-open rules out of audio-player.tsx.
export function useChantCounterAnalytics({
  feedId,
  playRequestId,
  isCounterVisible,
  chantCount,
  targetCount,
}: ChantCounterAnalyticsInput) {
  const openKey = feedId ? `${feedId}:${playRequestId ?? ''}` : null;

  const viewedKeyRef = useRef<string | null>(null);
  const milestonesRef = useRef<{ key: string | null; reached: Set<CounterMilestone> }>({
    key: null,
    reached: new Set(),
  });
  const previousCountRef = useRef(chantCount);
  const latestRef = useRef({ feedId, chantCount, targetCount });
  latestRef.current = { feedId, chantCount, targetCount };

  useEffect(() => {
    if (!feedId || !openKey || !isCounterVisible || viewedKeyRef.current === openKey) return;
    viewedKeyRef.current = openKey;
    logCounterViewed({ feed_id: feedId, target: latestRef.current.targetCount });
  }, [feedId, openKey, isCounterVisible]);

  // Fires on the step that reaches a milestone, not on every count change, so
  // a decrement and re-increment, or a lower target picked after passing it,
  // never logs a milestone on its own.
  useEffect(() => {
    const previous = previousCountRef.current;
    previousCountRef.current = chantCount;
    if (!feedId || !openKey || !isCounterVisible || chantCount <= previous) return;

    if (milestonesRef.current.key !== openKey) {
      milestonesRef.current = { key: openKey, reached: new Set() };
    }
    const reached = milestonesRef.current.reached;
    const crossed = (value: number) => previous < value && chantCount >= value;
    const fire = (milestone: CounterMilestone) => {
      if (reached.has(milestone)) return;
      reached.add(milestone);
      logCounterMilestone({ feed_id: feedId, milestone, count: chantCount, target: targetCount });
    };

    if (crossed(11)) fire('11');
    if (crossed(108)) fire('108');
    if (targetCount !== 11 && targetCount !== 108 && crossed(targetCount)) fire('other');
  }, [chantCount, feedId, openKey, isCounterVisible, targetCount]);

  const onCounterOpened = useCallback(() => {
    const { feedId: id, chantCount: count, targetCount: target } = latestRef.current;
    if (id) logCounterOpened({ feed_id: id, count, target });
  }, []);

  const onTargetChanged = useCallback((newTarget: number) => {
    const { feedId: id, targetCount: target } = latestRef.current;
    if (id && newTarget !== target) {
      logCounterTargetChanged({ feed_id: id, from_target: target, to_target: newTarget });
    }
  }, []);

  return { onCounterOpened, onTargetChanged };
}
