// The pure rules behind silent guest start, kept free of React Native imports
// so they can run under Node's test runner (guestStartRules.test.mjs).

export type GuestStartFailure = 'offline' | 'failed';

const INSTALL_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidInstallId(value: unknown): value is string {
  return typeof value === 'string' && INSTALL_ID_PATTERN.test(value);
}

// apiClient reports "no response at all" as NETWORK_ERROR, status 0. The app
// can't tell a phone with no signal from a server that can't be reached (no
// NetInfo, CLAUDE.md §117), so both get "please connect" with a Retry. Anything
// else (switched off, over a limit, a server error) is a plain "couldn't start".
export function classifyGuestStartError(error: unknown): GuestStartFailure {
  const { code, statusCode } = (error ?? {}) as { code?: string; statusCode?: number };
  return code === 'NETWORK_ERROR' || statusCode === 0 ? 'offline' : 'failed';
}

// The server says 200, "not new", when the phone was killed or lost signal
// after the row was created but before the reply arrived. That person is still
// new, so an install that never finished a start counts as new whatever the
// server says.
export function isNewGuest(serverSaysNew: boolean, hasFinishedStartBefore: boolean): boolean {
  return serverSaysNew || !hasFinishedStartBefore;
}

// A request can come back 401 after a parallel one has already renewed the
// session. It then only needs repeating with the new token.
export function wasAlreadyRenewed(failedToken: string | null | undefined, currentToken: string | null | undefined): boolean {
  return !!failedToken && !!currentToken && failedToken !== currentToken;
}
