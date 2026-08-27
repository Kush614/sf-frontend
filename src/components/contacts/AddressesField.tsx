"use client";

import { useRef, useState } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { ADDRESS_TYPE_LABELS } from "@/lib/contacts/format";
import { ADDRESS_FIELDS, addressInputName } from "@/lib/contacts/schema";
import {
  ADDRESS_TYPES,
  MAX_ADDRESSES,
  type AddressFormValues,
} from "@/lib/contacts/types";

const CONTROL =
  "w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-primary focus:bg-input";

const BLANK: AddressFormValues = {
  type: "home",
  street: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
};

/** A row plus the key React needs to keep its uncontrolled inputs in place. */
type Row = AddressFormValues & { key: string };

/**
 * The contact's addresses, as a list the user can grow and shrink.
 *
 * Every row renders the same input names, so the browser submits them as
 * parallel lists and `formDataToAddresses` reads row N as the Nth entry of
 * each. That keeps this a plain FormData POST: no index-encoded names to parse,
 * no JSON blob in a hidden field, and the rows that are already on the page
 * still submit if the button that adds more never gets its JavaScript.
 *
 * React resets a form's uncontrolled fields once its `action` resolves, and a
 * rejected save is an ordinary resolved return — so these rows would be wiped
 * exactly when the user needs to see what they typed. `ContactForm` remounts
 * this component on each result and seeds it from the echoed submission, which
 * is why `defaultValues` is the source of truth here rather than a prop that is
 * only read once.
 */
export default function AddressesField({
  defaultValues = [],
  errors = {},
}: {
  /** Existing addresses, so editing a contact carries them through the `PUT`. */
  defaultValues?: AddressFormValues[];
  /** Server-side message per row, keyed by position. */
  errors?: Record<number, string>;
}) {
  const nextKey = useRef(defaultValues.length);
  const [rows, setRows] = useState<Row[]>(() =>
    defaultValues.map((address, index) => ({ ...address, key: `address-${index}` })),
  );

  const atLimit = rows.length >= MAX_ADDRESSES;

  function addRow() {
    setRows((current) => [
      ...current,
      { ...BLANK, key: `address-${nextKey.current++}` },
    ]);
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }


  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Addresses</legend>

      <div className="flex items-end justify-between gap-4 border-b border-hairline pb-2">
        <div>
          <h2 className="font-display text-sm font-semibold text-foreground">
            Addresses
          </h2>
          <p className="text-[13px] text-muted-foreground">
            As many as you need, each marked Home, Work, or Other.
          </p>
        </div>
        <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
          {rows.length} / {MAX_ADDRESSES}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-4 text-[13px] text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          No addresses yet.
        </p>
      ) : null}

      {rows.map((row, index) => {
        const error = errors[index];
        const typeId = `${row.key}-type`;

        return (
          <div
            key={row.key}
            className="space-y-4 rounded-lg border border-border bg-secondary/20 p-4"
          >
            <div className="flex items-end justify-between gap-4">
              <div className="w-40">
                <label
                  htmlFor={typeId}
                  className="mb-1.5 block text-[13px] font-medium text-foreground"
                >
                  Type
                </label>
                <select
                  id={typeId}
                  name={addressInputName("type")}
                  defaultValue={row.type}
                  className={CONTROL}
                >
                  {ADDRESS_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {ADDRESS_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => removeRow(row.key)}
                className={buttonClasses("ghost")}
                aria-label={`Remove address ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                Remove
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {ADDRESS_FIELDS.map((field) => {
                const id = `${row.key}-${field.name}`;

                return (
                  <div
                    key={field.name}
                    className={field.wide ? "sm:col-span-2" : undefined}
                  >
                    <label
                      htmlFor={id}
                      className="mb-1.5 block text-[13px] font-medium text-foreground"
                    >
                      {field.label}
                    </label>
                    <input
                      id={id}
                      name={addressInputName(field.name)}
                      type="text"
                      defaultValue={row[field.name]}
                      maxLength={field.maxLength}
                      placeholder={field.placeholder}
                      autoComplete={field.autoComplete}
                      className={CONTROL}
                    />
                  </div>
                );
              })}
            </div>

            {error ? (
              <p role="alert" className="text-[13px] text-destructive">
                {error}
              </p>
            ) : null}
          </div>
        );
      })}

      <button
        type="button"
        onClick={addRow}
        disabled={atLimit}
        className={buttonClasses("secondary")}
      >
        <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        Add address
      </button>

      {atLimit ? (
        <p className="text-[13px] text-muted-foreground">
          That is the maximum of {MAX_ADDRESSES}. Remove one to add another.
        </p>
      ) : null}
    </fieldset>
  );
}
