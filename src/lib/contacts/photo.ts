/**
 * Rules for the contact photo, mirroring the API's `photo` validation so a bad
 * image is caught before a round trip. The API stays the authority.
 *
 * Photos travel inline as base64 data URLs — the backend has no object store —
 * which is why the browser downscales before upload rather than sending the
 * original file. See `PhotoField`.
 */

export const PHOTO_MEDIA_TYPES = [
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** Matches the API's `MAX_PHOTO_BYTES`. */
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

/** Longest edge kept when downscaling. Big enough for a retina avatar. */
export const PHOTO_MAX_DIMENSION = 512;

/** base64 encodes 3 bytes as 4 characters, plus the longest allowed prefix. */
const MAX_PHOTO_URL_LENGTH =
  Math.ceil(MAX_PHOTO_BYTES / 3) * 4 + "data:image/jpeg;base64,".length;

/**
 * Two flat character classes and one optional suffix — linear, so a
 * multi-megabyte candidate cannot make this backtrack.
 */
const DATA_URL = /^data:([\w.+-]+\/[\w.+-]+);base64,([A-Za-z0-9+/]*={0,2})$/;

export const MAX_PHOTO_MB = MAX_PHOTO_BYTES / (1024 * 1024);

/** Bytes a base64 payload decodes to, without decoding it. */
function decodedLength(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return (base64.length * 3) / 4 - padding;
}

/**
 * Why this data URL is not an acceptable photo, or `null` if it is.
 * Callers handle blank themselves — blank means "no photo", not "invalid".
 */
export function photoError(value: string): string | null {
  // Length first, so an oversized payload is rejected without being scanned.
  if (value.length > MAX_PHOTO_URL_LENGTH) {
    return `Photo must be ${MAX_PHOTO_MB} MB or smaller`;
  }

  const match = DATA_URL.exec(value);
  if (!match) return "Photo must be an image file";

  const [, mediaType, payload] = match;
  if (!(PHOTO_MEDIA_TYPES as readonly string[]).includes(mediaType.toLowerCase())) {
    return `Photo must be a ${PHOTO_MEDIA_TYPES.map((type) => type.replace("image/", "")).join(", ")} image`;
  }
  if (payload.length === 0) return "Photo must not be empty";
  if (decodedLength(payload) > MAX_PHOTO_BYTES) {
    return `Photo must be ${MAX_PHOTO_MB} MB or smaller`;
  }

  return null;
}
