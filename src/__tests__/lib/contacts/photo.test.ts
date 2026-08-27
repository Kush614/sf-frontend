import { MAX_PHOTO_BYTES, photoError } from "@/lib/contacts/photo";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

describe("photoError", () => {
  it("accepts a well-formed image data URL", () => {
    expect(photoError(TINY_PNG)).toBeNull();
  });

  it.each([
    ["a plain URL", "https://example.com/ada.png"],
    ["a non-image media type", "data:text/html;base64,PHNjcmlwdD4="],
    ["malformed base64", "data:image/png;base64,not valid base64!"],
    ["an empty payload", "data:image/png;base64,"],
    // base64 works in four-character groups, so these are the right alphabet
    // but cannot decode to anything.
    ["a single stray character", "data:image/png;base64,A"],
    ["padding on its own", "data:image/png;base64,="],
    ["a length that is not a multiple of four", "data:image/png;base64,AAAAA"],
    ["a final group of one character", "data:image/png;base64,AAAA="],
  ])("rejects %s", (_label, value) => {
    expect(photoError(value)).not.toBeNull();
  });

  it.each([
    ["no padding", "data:image/png;base64,AAAA"],
    ["one pad character", "data:image/png;base64,AAA="],
    ["two pad characters", "data:image/png;base64,AA=="],
  ])("accepts a payload with %s", (_label, value) => {
    expect(photoError(value)).toBeNull();
  });

  it("stays under the Server Action body limit at the size cap", () => {
    // next.config.ts raises `serverActions.bodySizeLimit` to 3 MB because
    // base64 costs a third on top. If the cap ever outgrows that, a photo the
    // validator accepts would be rejected before the action runs.
    const SERVER_ACTION_BODY_LIMIT = 3 * 1024 * 1024;
    expect(Math.ceil(MAX_PHOTO_BYTES / 3) * 4).toBeLessThan(
      SERVER_ACTION_BODY_LIMIT,
    );
  });

  it("rejects an image over the size cap", () => {
    const oversized = `data:image/png;base64,${"A".repeat(
      Math.ceil(MAX_PHOTO_BYTES / 3) * 4 + 8,
    )}`;
    expect(photoError(oversized)).toMatch(/2 MB or smaller/);
  });
});
