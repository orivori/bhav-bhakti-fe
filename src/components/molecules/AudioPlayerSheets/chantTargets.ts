// Chant-counter targets, shared by the player and both counter sheets.
// A mantra auto-chants DEFAULT_CHANT_TARGET times on every fresh open (the
// counter isn't saved between opens); the user can pick any other target,
// including 108, from CounterSheet or "More" - free, no gating.
export const DEFAULT_CHANT_TARGET = 11;

// CounterSheet's inline chips. Kept at three so the row (plus "More") still
// fits a narrow phone; 54 lives in "More".
export const CHANT_TARGET_PRESETS = [11, 27, 108];

// MoreTargetsSheet's full list.
export const CHANT_TARGET_OPTIONS = [11, 27, 54, 108, 216, 324, 540, 1008];
