// Static data for Mantra Explorer's mood-pill grid (CLAUDE.md §56 Phase 4).
// Mirrors zodiacData.ts's shape/pattern. `label` is the exact value stored in
// Feed.label (see the statusOccasion -> label rename, Phase 3) - defined here
// now as data modeling only; nothing reads it yet until Phase 4b wires up the
// random-pick-and-open-player tap behavior.
export interface MoodOption {
  id: string;
  label: 'peace' | 'strength' | 'protection' | 'positivity';
  name: { en: string; hi: string };
  gradientColors: readonly [string, string, string];
}

export const MOOD_OPTIONS: MoodOption[] = [
  {
    id: 'peace',
    label: 'peace',
    name: { en: 'Peace', hi: 'शांति' },
    // Same gradient as the zodiac grid's "Water" element - calm, cool tones.
    gradientColors: ['#20B2AA', '#48D1CC', '#7FFFD4'],
  },
  {
    id: 'strength',
    label: 'strength',
    name: { en: 'Strength', hi: 'शक्ति' },
    // Same gradient as the zodiac grid's "Fire" element - bold, energetic.
    gradientColors: ['#FF6B00', '#FF8533', '#FFA500'],
  },
  {
    id: 'protection',
    label: 'protection',
    name: { en: 'Protection', hi: 'रक्षा' },
    // Same gradient as the zodiac grid's "Earth" element - grounding, sheltering.
    gradientColors: ['#8B4513', '#A0522D', '#CD853F'],
  },
  {
    id: 'positivity',
    label: 'positivity',
    name: { en: 'Positivity', hi: 'सकारात्मकता' },
    // Built from the app's own documented primary brand gradient
    // (#E76A4A -> #FFA241, DESIGN_SYSTEM.md) extended to 3 stops - warm
    // coral-orange, deliberately not the zodiac grid's blue "Air" gradient,
    // which would sit too close to Peace's blue-teal.
    gradientColors: ['#E76A4A', '#FF8C42', '#FFA241'],
  },
];
