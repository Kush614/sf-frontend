import type { CSSProperties } from "react";
import { avatarHue, initials } from "@/lib/contacts/format";
import type { Contact } from "@/lib/contacts/types";

const SIZES = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
} as const;

/**
 * The contact's profile photo, or an initials bubble tinted with a hue derived
 * from their email. Both shapes are the same circle at the same size, so a
 * contact gaining a photo does not shift the layout around it.
 */
export default function ContactAvatar({
  contact,
  size = "md",
}: {
  contact: Pick<Contact, "first_name" | "last_name" | "email"> &
    Partial<Pick<Contact, "photo">>;
  size?: keyof typeof SIZES;
}) {
  const shape = `shrink-0 select-none rounded-full ${SIZES[size]}`;

  if (contact.photo) {
    return (
      // A data URL is already inlined and avatar-sized, so there is nothing for
      // next/image to optimise or lazy-load here.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={contact.photo}
        alt=""
        aria-hidden="true"
        className={`${shape} aspect-square object-cover ring-1 ring-hairline`}
      />
    );
  }

  const style = {
    "--avatar-hue": avatarHue(contact.email),
  } as CSSProperties;

  return (
    <span
      aria-hidden="true"
      style={style}
      className={`contact-avatar inline-flex items-center justify-center font-display font-semibold ${shape}`}
    >
      {initials(contact)}
    </span>
  );
}
