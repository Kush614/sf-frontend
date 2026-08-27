import { ADDRESS_TYPES } from "./types";
import type { Address, AddressInput, AddressType, Contact } from "./types";

/** Presentation helpers shared by the list, the detail page, and the cards. */

/** Up to two letters for the avatar bubble. */
export function initials(contact: Pick<Contact, "first_name" | "last_name">) {
  return `${contact.first_name.at(0) ?? ""}${contact.last_name.at(0) ?? ""}`
    .toUpperCase()
    .trim();
}

/**
 * Stable hue per contact so the same person keeps the same avatar colour
 * across renders and machines (no randomness, no hydration mismatch).
 */
export function avatarHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  }
  return hash;
}

// Rendered on the server and hydrated on the client, so pin the locale and zone
// rather than letting each side pick its own and mismatch.
const TIMESTAMP_FORMAT = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return `${TIMESTAMP_FORMAT.format(date)} UTC`;
}

/** "Ada Lovelace · Mathematician at Analytical Engines"-style subtitle. */
export function jobLine(contact: Contact): string | null {
  if (contact.job_title && contact.company) {
    return `${contact.job_title} at ${contact.company}`;
  }
  return contact.job_title ?? contact.company ?? null;
}

/** Human-readable name for each address type. */
export const ADDRESS_TYPE_LABELS: Record<AddressType, string> = {
  home: "Home",
  work: "Work",
  other: "Other",
};

/** Single-line postal address, skipping the parts that are not filled in. */
export function addressLine(address: Address | AddressInput): string | null {
  const parts = [
    address.street,
    address.city,
    [address.state, address.postal_code].filter(Boolean).join(" "),
    address.country,
  ].filter((part): part is string => Boolean(part && part.trim()));

  return parts.length ? parts.join(", ") : null;
}

export interface AddressGroup {
  type: AddressType;
  label: string;
  addresses: Address[];
}

/**
 * Addresses bucketed by type for display, in `ADDRESS_TYPES` order rather than
 * insertion order, so a contact's Home block does not move when a Work address
 * is added. Types with no addresses are left out.
 */
export function groupAddressesByType(addresses: Address[]): AddressGroup[] {
  return ADDRESS_TYPES.map((type) => ({
    type,
    label: ADDRESS_TYPE_LABELS[type],
    addresses: addresses.filter((address) => address.type === type),
  })).filter((group) => group.addresses.length > 0);
}
