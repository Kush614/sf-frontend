/**
 * Types mirroring the Contacts API OpenAPI 3.1 document (`GET /openapi.json`).
 * Field names stay snake_case so payloads map 1:1 onto the wire format.
 */

/** What an address is for. Mirrors the API's `AddressType` enum. */
export const ADDRESS_TYPES = ["home", "work", "other"] as const;
export type AddressType = (typeof ADDRESS_TYPES)[number];

/** The API's cap on how many addresses one contact may have. */
export const MAX_ADDRESSES = 10;

/** `AddressRead` — one postal address belonging to a contact. */
export interface Address {
  id: number;
  type: AddressType;
  street: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
}

/** `AddressCreate` — an address on its way to the API, before it has an id. */
export type AddressInput = Omit<Address, "id">;

/** `ContactRead` — a stored contact, as returned by every contact endpoint. */
export interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  notes: string | null;
  /** Base64 data URL, or `null` to fall back to initials. */
  photo: string | null;
  addresses: Address[];
  created_at: string;
  updated_at: string;
  full_name: string;
}

/** Every editable field, i.e. `ContactCreate` / `ContactReplace`. */
export type ContactInput = Omit<
  Contact,
  "id" | "created_at" | "updated_at" | "full_name" | "addresses"
> & { addresses: AddressInput[] };

/**
 * The contact fields that are plain text controls. `addresses` is a list with
 * its own component, so the form's string-keyed error and value maps exclude it.
 */
export type ContactTextField = Exclude<keyof ContactInput, "addresses">;

/** One address row as the form holds it: raw strings, before validation. */
export type AddressFormValues = Record<keyof AddressInput, string>;

/** `ContactPage` — one page of contacts plus the totals needed to paginate. */
export interface ContactPage {
  items: Contact[];
  total: number;
  limit: number;
  offset: number;
}

/** `HealthResponse` — result of the liveness probe. */
export interface HealthResponse {
  status: string;
  database: string;
  contacts: number;
}

/** Sort fields the API's allow-list accepts. */
export const SORT_FIELDS = [
  "id",
  "first_name",
  "last_name",
  "email",
  "company",
  "created_at",
  "updated_at",
] as const;

export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = "asc" | "desc";

/** Bounds the API enforces on `limit`. */
export const MIN_LIMIT = 1;
export const MAX_LIMIT = 200;
export const DEFAULT_PER_PAGE = 25;
export const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

/**
 * Result of a server action, consumed by `useActionState` in the forms.
 * Lives here (not in the `"use server"` module) so client components can import
 * the type without pulling server code into the browser bundle.
 */
export type FormState = {
  status: "idle" | "error";
  /** Message shown above the form; used for API-level failures. */
  message?: string;
  /** Per-field messages keyed by input name. */
  fieldErrors?: Partial<Record<ContactTextField, string>>;
  /** Echo of the submitted values so the form survives a failed round trip. */
  values?: Partial<Record<ContactTextField, string>>;
  /** Echo of the submitted address rows, so the list survives one too. */
  addresses?: AddressFormValues[];
  /** One message per address row, keyed by its position in that list. */
  addressErrors?: Record<number, string>;
};

export const EMPTY_FORM_STATE: FormState = { status: "idle" };
