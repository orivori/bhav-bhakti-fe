// Shared display formatter for like/share/view/download counts across cards.
// < 1000 shows as-is, 1000+ as "X.XK", 1,000,000+ as "X.XM".
export const formatCount = (count: number): string => {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1000000).toFixed(1)}M`;
};
