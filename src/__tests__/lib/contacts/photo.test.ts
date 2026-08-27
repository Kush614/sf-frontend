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
  ])("rejects %s", (_label, value) => {
    expect(photoError(value)).not.toBeNull();
  });

  it("rejects an image over the size cap", () => {
    const oversized = `data:image/png;base64,${"A".repeat(
      Math.ceil(MAX_PHOTO_BYTES / 3) * 4 + 8,
    )}`;
    expect(photoError(oversized)).toMatch(/2 MB or smaller/);
  });
});
