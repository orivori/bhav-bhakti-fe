import { RefObject, useCallback, useRef } from 'react';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';

type SheetRef = RefObject<BottomSheetModal | null>;

interface SheetBackProps {
  onChange: (index: number) => void;
  onDismiss: () => void;
}

// Lets Android back close an open BottomSheetModal before the screen behind it
// navigates. @gorhom/bottom-sheet's modals are portaled to the app root and
// don't listen for back at all, so a screen's own 'hardwareBackPress'
// listener used to run with a sheet still showing.
//
// Usage: spread sheetProps(key, ref) onto each sheet (it must pass onChange/
// onDismiss through to its BottomSheetModal), and start the screen's back
// listener with `if (closeTopSheet()) return true;`.
//
// "Open" is tracked only from the sheet's own onChange/onDismiss, so dismiss()
// is only ever called on a sheet that really was presented - calling it on a
// never-presented modal leaves it stuck in DISMISSING in 5.2.x (CLAUDE.md
// §113).
export function useSheetBackStack() {
  // Most recently opened last, so a sheet opened from another sheet ("More"
  // over the counter) closes first. A sheet opened over another must use
  // stackBehavior="push": with the default 'switch', 5.2.14 dismisses the
  // sheet underneath instead of restoring it (see MoreTargetsSheet).
  const openStackRef = useRef<{ key: string; ref: SheetRef }[]>([]);
  const propsCacheRef = useRef<Record<string, SheetBackProps>>({});

  const markClosed = useCallback((key: string) => {
    openStackRef.current = openStackRef.current.filter((entry) => entry.key !== key);
  }, []);

  const sheetProps = useCallback(
    (key: string, ref: SheetRef): SheetBackProps => {
      const cached = propsCacheRef.current[key];
      if (cached) return cached;
      const props: SheetBackProps = {
        onChange: (index) => {
          if (index < 0) {
            markClosed(key);
          } else if (!openStackRef.current.some((entry) => entry.key === key)) {
            openStackRef.current = [...openStackRef.current, { key, ref }];
          }
        },
        onDismiss: () => markClosed(key),
      };
      propsCacheRef.current[key] = props;
      return props;
    },
    [markClosed]
  );

  // Closes the topmost open sheet and returns true, or returns false when none
  // is open (the caller then navigates as usual). The entry is dropped right
  // away, so a second quick back press moves on instead of re-dismissing.
  const closeTopSheet = useCallback((): boolean => {
    const top = openStackRef.current[openStackRef.current.length - 1];
    if (!top) return false;
    markClosed(top.key);
    try {
      top.ref.current?.dismiss();
    } catch (error) {
      console.error('Sheet dismiss on back failed:', error);
    }
    return true;
  }, [markClosed]);

  return { sheetProps, closeTopSheet };
}
