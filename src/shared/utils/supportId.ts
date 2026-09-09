// A short, non-sequential ID to show/give to a user for support purposes,
// instead of exposing the raw sequential database `id`. Derived from the
// last 7 characters of firebaseUid (uppercased for easy reading/typing) -
// deterministic per account, never stored separately.
export function deriveSupportId(firebaseUid: string | null | undefined): string | null {
  if (!firebaseUid) return null;
  return firebaseUid.slice(-7).toUpperCase();
}
