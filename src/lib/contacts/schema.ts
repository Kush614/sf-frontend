import { z } from "zod";
import { photoError } from "./photo";
import { ADDRESS_TYPES, MAX_ADDRESSES } from "./types";
import type {
  AddressFormValues,
  AddressInput,
  ContactInput,
  ContactTextField,
} from "./types";

/**
 * Client/server-shared validation for the contact form.
 *
 * The rules mirror the API's Pydantic models (`ContactCreate` / `ContactReplace`)
 * so the user sees a mistake before a round trip — the API stays the authority,
 * and anything it rejects anyway is surfaced by `toFieldErrors` in `./api.ts`.
 */

/** Optional text: trimmed, and blank becomes `null` (the API clears the field). */
function optionalText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .transform((value) => value || null)
    .nullable()
    .default(null);
}

function requiredText(max: number, label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);
}

export const addressInputSchema = z.object({
  type: z.enum(ADDRESS_TYPES),
  street: optionalText(300, "Street address"),
  city: optionalText(120, "City"),
  state: optionalText(120, "State"),
  postal_code: optionalText(20, "Postal code"),
  country: optionalText(120, "Country"),
}) satisfies z.ZodType<AddressInput, unknown>;

/** Did the user actually put anything in this row? */
function hasAnyText(address: AddressInput): boolean {
  return Boolean(
    address.street ??
      address.city ??
      address.state ??
      address.postal_code ??
      address.country,
  );
}

const addressesSchema = z
  .array(addressInputSchema)
  // A row that was added and never filled in is not an address. Dropping it
  // here means the form can be generous with "Add address" without saving
  // blanks, and the rule holds for any client, not just ours.
  .transform((addresses) => addresses.filter(hasAnyText))
  .refine((addresses) => addresses.length <= MAX_ADDRESSES, {
    message: `A contact can have at most ${MAX_ADDRESSES} addresses`,
  })
  .default([]);

export const contactInputSchema = z.object({
  first_name: requiredText(100, "First name"),
  last_name: requiredText(100, "Last name"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(320, "Email must be 320 characters or fewer")
    .pipe(z.email("Enter a valid email address"))
    .transform((value) => value.toLowerCase()),
  phone: optionalText(40, "Phone"),
  company: optionalText(200, "Company"),
  job_title: optionalText(200, "Job title"),
  notes: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .default(null),
  // Not a typed-in field: `PhotoField` writes a data URL into a hidden input.
  // Re-checked here so a hand-crafted POST cannot skip the browser's checks.
  photo: z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      const message = value ? photoError(value) : null;
      if (message) ctx.addIssue({ code: "custom", message });
    })
    .transform((value) => value || null)
    .nullable()
    .default(null),
  addresses: addressesSchema,
}) satisfies z.ZodType<ContactInput, unknown>;

export type ContactFormValues = z.input<typeof contactInputSchema>;

/**
 * Collapse a ZodError into one message per text field, keyed by input name.
 * Address issues are nested under `addresses` and are reported separately by
 * {@link zodAddressErrors}.
 */
export function zodFieldErrors(
  error: z.ZodError,
): Partial<Record<ContactTextField, string>> {
  const fieldErrors: Partial<Record<ContactTextField, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (key === "addresses") continue;
    if (typeof key === "string" && !(key in fieldErrors)) {
      fieldErrors[key as ContactTextField] = issue.message;
    }
  }
  return fieldErrors;
}

/** One message per offending address row, keyed by its position in the list. */
export function zodAddressErrors(error: z.ZodError): Record<number, string> {
  const rowErrors: Record<number, string> = {};
  for (const issue of error.issues) {
    if (issue.path[0] !== "addresses") continue;
    const index = issue.path[1];
    if (typeof index === "number" && !(index in rowErrors)) {
      rowErrors[index] = issue.message;
    }
  }
  return rowErrors;
}

/**
 * A problem with the list as a whole (too many addresses) rather than with one
 * row — `path` is exactly `["addresses"]`, with no index after it.
 */
export function zodAddressListError(error: z.ZodError): string | undefined {
  return error.issues.find(
    (issue) => issue.path[0] === "addresses" && issue.path.length === 1,
  )?.message;
}

/* ------------------------------------------------------------------ */
/* Form metadata — one source of truth for the fields and their limits */
/* ------------------------------------------------------------------ */

export interface ContactFieldSpec {
  name: ContactTextField;
  label: string;
  type?: "text" | "email" | "tel" | "textarea";
  required?: boolean;
  maxLength: number;
  placeholder?: string;
  autoComplete?: string;
  /** Column span inside the section grid. */
  wide?: boolean;
}

export interface ContactFieldGroup {
  title: string;
  description: string;
  fields: ContactFieldSpec[];
}

export const CONTACT_FIELD_GROUPS: ContactFieldGroup[] = [
  {
    title: "Identity",
    description: "First name, last name, and email are required.",
    fields: [
      {
        name: "first_name",
        label: "First name",
        required: true,
        maxLength: 100,
        placeholder: "Ada",
        autoComplete: "given-name",
      },
      {
        name: "last_name",
        label: "Last name",
        required: true,
        maxLength: 100,
        placeholder: "Lovelace",
        autoComplete: "family-name",
      },
      {
        name: "email",
        label: "Email",
        type: "email",
        required: true,
        maxLength: 320,
        placeholder: "ada@example.com",
        autoComplete: "email",
      },
      {
        name: "phone",
        label: "Phone",
        type: "tel",
        maxLength: 40,
        placeholder: "+1-415-555-0101",
        autoComplete: "tel",
      },
    ],
  },
  {
    title: "Work",
    description: "Where they work and what they do.",
    fields: [
      {
        name: "company",
        label: "Company",
        maxLength: 200,
        placeholder: "Analytical Engines",
        autoComplete: "organization",
      },
      {
        name: "job_title",
        label: "Job title",
        maxLength: 200,
        placeholder: "Mathematician",
        autoComplete: "organization-title",
      },
    ],
  },
  {
    title: "Notes",
    description: "Anything worth remembering. No length limit.",
    fields: [
      {
        name: "notes",
        label: "Notes",
        type: "textarea",
        maxLength: 10_000,
        placeholder: "Met at the SF hackathon.",
        wide: true,
      },
    ],
  },
];

export const CONTACT_FIELDS: ContactFieldSpec[] = CONTACT_FIELD_GROUPS.flatMap(
  (group) => group.fields,
);

/**
 * Every input name the form submits. `CONTACT_FIELD_GROUPS` only covers the
 * text controls, so the photo — rendered by its own component — is added here.
 */
const SUBMITTED_FIELDS: ContactTextField[] = [
  ...CONTACT_FIELDS.map((field) => field.name),
  "photo",
];

/** Pull the contact fields out of a submitted form, as raw strings. */
export function formDataToValues(
  formData: FormData,
): Record<ContactTextField, string> {
  return Object.fromEntries(
    SUBMITTED_FIELDS.map((name) => [name, String(formData.get(name) ?? "")]),
  ) as Record<ContactTextField, string>;
}

/* ------------------------------------------------------------------ */
/* Addresses — a repeatable row rather than a fixed set of inputs      */
/* ------------------------------------------------------------------ */

export interface AddressFieldSpec {
  name: Exclude<keyof AddressInput, "type">;
  label: string;
  maxLength: number;
  placeholder: string;
  autoComplete: string;
  /** Column span inside the row grid. */
  wide?: boolean;
}

export const ADDRESS_FIELDS: AddressFieldSpec[] = [
  {
    name: "street",
    label: "Street address",
    maxLength: 300,
    placeholder: "1 Market St, Suite 400",
    autoComplete: "street-address",
    wide: true,
  },
  {
    name: "city",
    label: "City",
    maxLength: 120,
    placeholder: "San Francisco",
    autoComplete: "address-level2",
  },
  {
    name: "state",
    label: "State / region",
    maxLength: 120,
    placeholder: "CA",
    autoComplete: "address-level1",
  },
  {
    name: "postal_code",
    label: "Postal code",
    maxLength: 20,
    placeholder: "94105",
    autoComplete: "postal-code",
  },
  {
    name: "country",
    label: "Country",
    maxLength: 120,
    placeholder: "USA",
    autoComplete: "country-name",
  },
];

/**
 * Every address row submits the same input names, so the browser groups them
 * into parallel lists and row N is the Nth entry of each. That keeps the form a
 * plain FormData POST — no index-encoded names to parse, and no JSON blob.
 */
export function addressInputName(field: keyof AddressInput): string {
  return `address_${field}`;
}

const ADDRESS_FORM_FIELDS: (keyof AddressInput)[] = [
  "type",
  ...ADDRESS_FIELDS.map((field) => field.name),
];

/** Rebuild the address rows from those parallel lists. */
export function formDataToAddresses(formData: FormData): AddressFormValues[] {
  const columns = new Map(
    ADDRESS_FORM_FIELDS.map((field) => [
      field,
      formData.getAll(addressInputName(field)).map(String),
    ]),
  );

  // Every row renders every input, so the lists are the same length; use the
  // type column — the one control that is always present — as the row count.
  const rowCount = columns.get("type")?.length ?? 0;

  return Array.from({ length: rowCount }, (_, row) =>
    Object.fromEntries(
      ADDRESS_FORM_FIELDS.map((field) => [field, columns.get(field)?.[row] ?? ""]),
    ),
  ) as AddressFormValues[];
}
