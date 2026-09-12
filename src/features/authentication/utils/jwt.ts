// Reads the `exp` claim out of our own backend-issued JWT, client-side, so the app's
// local session-expiry check can match the token's real (server-enforced) expiry
// instead of a separately-maintained guess. This never verifies the signature - the
// backend already does that on every request; this only needs to know when to stop
// sending the token.
//
// Deliberately not `atob`: its availability/behavior differs across JS engines
// (Hermes vs JSC), and it doesn't understand base64url's `-`/`_` alphabet or
// JWT's stripped padding anyway. Hand-rolled here instead.

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64UrlToBytes(input: string): number[] {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const bytes: number[] = [];
  let buffer = 0;
  let bitsCollected = 0;

  for (let i = 0; i < base64.length; i++) {
    const value = BASE64_CHARS.indexOf(base64[i]);
    if (value === -1) {
      // Padding ('=') or any unexpected character - skip rather than corrupt output.
      continue;
    }

    buffer = (buffer << 6) | value;
    bitsCollected += 6;

    if (bitsCollected >= 8) {
      bitsCollected -= 8;
      bytes.push((buffer >> bitsCollected) & 0xff);
    }
  }

  return bytes;
}

// Minimal UTF-8 decoder for the byte output above - our own JWT payloads are plain
// ASCII (userId/sessionId/iat/exp), but a real decoder costs little and avoids
// silently mangling anything unexpected instead of just failing closed.
function utf8BytesToString(bytes: number[]): string {
  let result = '';
  let i = 0;

  while (i < bytes.length) {
    const byte1 = bytes[i++];

    if (byte1 < 0x80) {
      result += String.fromCharCode(byte1);
    } else if (byte1 >= 0xc0 && byte1 < 0xe0 && i < bytes.length) {
      const byte2 = bytes[i++];
      result += String.fromCharCode(((byte1 & 0x1f) << 6) | (byte2 & 0x3f));
    } else if (byte1 >= 0xe0 && byte1 < 0xf0 && i + 1 < bytes.length) {
      const byte2 = bytes[i++];
      const byte3 = bytes[i++];
      result += String.fromCharCode(((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f));
    } else {
      // Anything else (a 4-byte sequence, a truncated/invalid one) isn't expected
      // in a JWT claims payload - bail on this character rather than mis-decode it.
      i += 1;
    }
  }

  return result;
}

/**
 * Returns the token's `exp` claim as a millisecond epoch timestamp (JWT's `exp` is
 * in SECONDS, so this multiplies by 1000), or `null` if the token is malformed or
 * has no `exp` claim at all. Callers must treat `null` as "already expired" -
 * never as "no expiry" / long-lived.
 */
export function getJwtExpiryMs(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payloadJson = utf8BytesToString(base64UrlToBytes(parts[1]));
    const payload = JSON.parse(payloadJson);

    if (typeof payload?.exp !== 'number') {
      return null;
    }

    return payload.exp * 1000;
  } catch (error) {
    return null;
  }
}

// --- Test-only below: builds a JWT-SHAPED string, not a real signed token ---
// Used exclusively by the .dev-only debug tool (profile.tsx) that fabricates a
// near-future exp claim to verify the session-expiry check end-to-end without
// waiting for a real backend-issued token to actually expire. Never used on any
// real login path - production login always uses the real token the backend
// returns. The signature segment is a fixed placeholder: nothing that reads this
// token client-side verifies it, and it's never sent anywhere signature
// verification would matter for this debug flow to work.

function utf8StringToBytes(input: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return bytes;
}

function bytesToBase64Url(bytes: number[]): string {
  let output = '';

  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = bytes[i + 1];
    const b3 = bytes[i + 2];
    const hasB2 = b2 !== undefined;
    const hasB3 = b3 !== undefined;

    output += BASE64_CHARS[b1 >> 2];
    output += BASE64_CHARS[((b1 & 0x03) << 4) | (hasB2 ? b2 >> 4 : 0)];
    if (hasB2) {
      output += BASE64_CHARS[((b2 & 0x0f) << 2) | (hasB3 ? b3 >> 6 : 0)];
    }
    if (hasB3) {
      output += BASE64_CHARS[b3 & 0x3f];
    }
  }

  // base64url per the JWT spec: no '=' padding.
  return output;
}

/**
 * TEST-ONLY. Builds a `header.payload.signature`-shaped string whose payload's
 * `exp` claim is `expiresInSeconds` from now, for exercising getJwtExpiryMs() and
 * the app's real session-expiry path without waiting for a real token to expire.
 */
export function buildFabricatedTokenForTesting(
  claims: Record<string, unknown>,
  expiresInSeconds: number
): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = { alg: 'none', typ: 'JWT' };
  const payload = { ...claims, iat: nowSeconds, exp: nowSeconds + expiresInSeconds };

  const headerSegment = bytesToBase64Url(utf8StringToBytes(JSON.stringify(header)));
  const payloadSegment = bytesToBase64Url(utf8StringToBytes(JSON.stringify(payload)));

  return `${headerSegment}.${payloadSegment}.debug-signature`;
}
