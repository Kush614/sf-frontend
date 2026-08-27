"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2, User } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import {
  MAX_PHOTO_MB,
  PHOTO_MAX_DIMENSION,
  PHOTO_MEDIA_TYPES,
  photoError,
} from "@/lib/contacts/photo";

/**
 * Downscale to a square-ish avatar before encoding.
 *
 * The photo is stored inline on the contact row and comes back with every list
 * response, so uploading a 6 MB phone picture would bloat both. Re-encoding at
 * {@link PHOTO_MAX_DIMENSION} costs one canvas draw and lands around 40 KB.
 */
async function toAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);

  try {
    const longestEdge = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, PHOTO_MAX_DIMENSION / longestEdge);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot process images.");

    // JPEG has no alpha, so flatten onto white rather than letting a
    // transparent PNG come out with a black background.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    bitmap.close();
  }
}

/**
 * Profile photo picker.
 *
 * The chosen image is downscaled in the browser and written into a hidden input
 * as a data URL, so the surrounding form stays a plain `FormData` POST and the
 * server action needs no special multipart handling.
 */
export default function PhotoField({
  defaultValue = "",
  initials,
  error,
  onProcessingChange,
}: {
  /** Existing photo, so editing a contact carries it through the `PUT`. */
  defaultValue?: string;
  /** Shown when there is no photo, matching the avatar's initials fallback. */
  initials?: string;
  /** Server-side error for the `photo` field. */
  error?: string;
  /**
   * Raised while an image is being resized. The hidden input is only written
   * once that finishes, so the form must not be submittable until it does —
   * otherwise the submit sends the *previous* photo and silently drops the one
   * the user just picked.
   */
  onProcessingChange?: (processing: boolean) => void;
}) {
  const [photo, setPhoto] = useState(defaultValue);
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const message = localError ?? error;

  function setProcessing(processing: boolean) {
    setBusy(processing);
    onProcessingChange?.(processing);
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;

    setProcessing(true);
    setLocalError(null);
    try {
      const dataUrl = await toAvatarDataUrl(file);
      const invalid = photoError(dataUrl);
      if (invalid) {
        setLocalError(invalid);
        return;
      }
      setPhoto(dataUrl);
    } catch {
      setLocalError("That file could not be read as an image.");
    } finally {
      setProcessing(false);
      // Allow re-picking the same file after an error.
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function clear() {
    setPhoto("");
    setLocalError(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Photo</legend>

      <div className="border-b border-hairline pb-2">
        <h2 className="font-display text-sm font-semibold text-foreground">
          Photo
        </h2>
        <p className="text-[13px] text-muted-foreground">
          Optional. Resized to {PHOTO_MAX_DIMENSION}px before upload; without one
          the contact shows their initials.
        </p>
      </div>

      <div className="flex items-center gap-4">
        {photo ? (
          // A data URL is already inlined and sized for display, so there is
          // nothing for next/image to optimise or lazy-load here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt="Selected profile photo"
            className="h-20 w-20 shrink-0 rounded-full object-cover ring-1 ring-hairline"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-secondary/30 font-display text-xl font-semibold text-muted-foreground"
          >
            {initials || <User className="h-7 w-7" strokeWidth={1.5} />}
          </span>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className={buttonClasses("secondary")}
            aria-describedby={message ? "field-photo-error" : undefined}
          >
            <ImagePlus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            {busy ? "Processing…" : photo ? "Replace photo" : "Upload photo"}
          </button>

          {photo ? (
            <button
              type="button"
              onClick={clear}
              className={buttonClasses("ghost")}
              aria-label="Remove photo"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              Remove
            </button>
          ) : null}
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept={PHOTO_MEDIA_TYPES.join(",")}
        className="sr-only"
        aria-label="Choose a profile photo"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <input type="hidden" name="photo" value={photo} />

      {message ? (
        <p
          id="field-photo-error"
          role="alert"
          className="text-[13px] text-destructive"
        >
          {message}
        </p>
      ) : (
        <p className="text-[13px] text-muted-foreground/80">
          PNG, JPEG, WebP, or GIF · up to {MAX_PHOTO_MB} MB
        </p>
      )}
    </fieldset>
  );
}
