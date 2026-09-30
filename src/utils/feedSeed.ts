/**
 * A new shuffle seed for the weighted feed ranking (GET /feed?sortBy=weighted).
 * One seed covers one scroll session: every page of that list is requested
 * with the same seed, so the backend slices every page from the same
 * ordering (no items jumping, repeating or vanishing between pages). A new
 * seed is made only when the list is opened fresh or pulled to refresh.
 * Letters and digits only, to match the backend's seed validation.
 */
export function newFeedSeed(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
