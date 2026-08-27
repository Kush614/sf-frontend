"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import AddressesField from "./AddressesField";
import PhotoField from "./PhotoField";
import Field from "@/components/ui/Field";
import Button, { buttonClasses } from "@/components/ui/Button";
import { initials } from "@/lib/contacts/format";
import { CONTACT_FIELD_GROUPS } from "@/lib/contacts/schema";
import {
  EMPTY_FORM_STATE,
  type AddressFormValues,
  type Contact,
  type ContactTextField,
  type FormState,
} from "@/lib/contacts/types";

/** Stored addresses as the form holds them: raw strings, nulls as blanks. */
function toFormValues(contact: Contact | undefined): AddressFormValues[] {
  return (contact?.addresses ?? []).map((address) => ({
    type: address.type,
    street: address.street ?? "",
    city: address.city ?? "",
    state: address.state ?? "",
    postal_code: address.postal_code ?? "",
    country: address.country ?? "",
  }));
}

export type ContactFormAction = (
  state: FormState,
  formData: FormData,
) => Promise<FormState>;

function SubmitButton({
  label,
  blocked,
}: {
  label: string;
  /** Something in the form is still producing a value to submit. */
  blocked?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || blocked}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : null}
      {pending ? "Saving…" : label}
    </Button>
  );
}

/**
 * Create/edit form. The field list comes from `CONTACT_FIELD_GROUPS`, and the
 * action is a bound server action — so a submit is a plain POST that works
 * before hydration and reports errors through `useActionState`.
 */
export default function ContactForm({
  action,
  contact,
  submitLabel,
  cancelHref,
}: {
  action: ContactFormAction;
  contact?: Contact;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);

  // React resets this form's uncontrolled fields once the action resolves, and
  // a rejected save is an ordinary resolved return — so the address rows would
  // be wiped just when the user needs to see what they typed. `useActionState`
  // hands back a new object per result, so this counter ticks once per
  // submission and never on an ordinary re-render; using it as a key remounts
  // the rows from the echoed submission, after the reset rather than before it.
  const [lastResult, setLastResult] = useState(state);
  const [submission, setSubmission] = useState(0);
  if (lastResult !== state) {
    setLastResult(state);
    setSubmission((count) => count + 1);
  }

  // The photo is written into its hidden input only after the browser has
  // finished resizing it, so submitting mid-resize would send the old value.
  const [photoProcessing, setPhotoProcessing] = useState(false);

  function valueFor(name: ContactTextField): string {
    return state.values?.[name] ?? contact?.[name] ?? "";
  }

  // A failed round trip echoes back what was submitted; otherwise start from
  // what is stored, so an untouched address list survives the replacing PUT.
  const addresses = state.addresses ?? toFormValues(contact);

  return (
    <form action={formAction} noValidate className="space-y-8">
      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-foreground"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
            strokeWidth={2}
            aria-hidden="true"
          />
          <span>{state.message}</span>
        </div>
      ) : null}

      <PhotoField
        defaultValue={valueFor("photo")}
        initials={contact ? initials(contact) : undefined}
        error={state.fieldErrors?.photo}
        onProcessingChange={setPhotoProcessing}
      />

      <AddressesField
        key={submission}
        defaultValues={addresses}
        errors={state.addressErrors}
      />

      {CONTACT_FIELD_GROUPS.map((group) => (
        <fieldset key={group.title} className="space-y-4">
          <legend className="sr-only">{group.title}</legend>

          <div className="border-b border-hairline pb-2">
            <h2 className="font-display text-sm font-semibold text-foreground">
              {group.title}
            </h2>
            <p className="text-[13px] text-muted-foreground">
              {group.description}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {group.fields.map((field) => (
              <Field
                key={field.name}
                field={field}
                defaultValue={valueFor(field.name)}
                error={state.fieldErrors?.[field.name]}
              />
            ))}
          </div>
        </fieldset>
      ))}

      <div className="flex items-center gap-2 border-t border-hairline pt-4">
        <SubmitButton label={submitLabel} blocked={photoProcessing} />
        <Link href={cancelHref} className={buttonClasses("secondary")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
