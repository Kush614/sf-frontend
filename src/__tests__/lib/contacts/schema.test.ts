import {
  CONTACT_FIELDS,
  addressInputName,
  contactInputSchema,
  formDataToAddresses,
  formDataToValues,
  zodAddressErrors,
  zodAddressListError,
  zodFieldErrors,
} from "@/lib/contacts/schema";
import { MAX_ADDRESSES } from "@/lib/contacts/types";

function values(overrides: Record<string, string> = {}) {
  return {
    first_name: "Ada",
    last_name: "Lovelace",
    email: "Ada@Example.com",
    phone: "",
    company: "",
    job_title: "",
    notes: "",
    photo: "",
    addresses: [],
    ...overrides,
  };
}

function address(overrides: Record<string, string> = {}) {
  return {
    type: "home",
    street: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    ...overrides,
  };
}

describe("contactInputSchema", () => {
  it("lowercases the email and nulls out the blanks", () => {
    const parsed = contactInputSchema.parse(values());

    expect(parsed.email).toBe("ada@example.com");
    expect(parsed.phone).toBeNull();
    expect(parsed.notes).toBeNull();
  });

  it("trims what the user typed", () => {
    expect(contactInputSchema.parse(values({ company: "  Acme  " })).company).toBe(
      "Acme",
    );
  });

  it("requires the three fields the API requires", () => {
    const result = contactInputSchema.safeParse(
      values({ first_name: " ", last_name: "", email: "" }),
    );

    expect(result.success).toBe(false);
    expect(zodFieldErrors(result.error!)).toEqual({
      first_name: "First name is required",
      last_name: "Last name is required",
      email: "Email is required",
    });
  });

  it("rejects a malformed email", () => {
    const result = contactInputSchema.safeParse(values({ email: "not-an-email" }));
    expect(zodFieldErrors(result.error!).email).toBe("Enter a valid email address");
  });

  it("enforces the API's length limits", () => {
    const result = contactInputSchema.safeParse(
      values({ first_name: "a".repeat(101) }),
    );

    expect(zodFieldErrors(result.error!)).toEqual({
      first_name: "First name must be 100 characters or fewer",
    });
  });
});

describe("contactInputSchema addresses", () => {
  it("keeps the rows the user filled in, nulling the blanks within them", () => {
    const parsed = contactInputSchema.parse(
      values({ addresses: [address({ type: "work", city: "  SF  " })] } as never),
    );

    expect(parsed.addresses).toEqual([
      {
        type: "work",
        street: null,
        city: "SF",
        state: null,
        postal_code: null,
        country: null,
      },
    ]);
  });

  it("drops a row that was added but never filled in", () => {
    const parsed = contactInputSchema.parse(
      values({
        addresses: [address({ city: "SF" }), address(), address({ city: "NYC" })],
      } as never),
    );

    expect(parsed.addresses.map((entry) => entry.city)).toEqual(["SF", "NYC"]);
  });

  it("defaults to an empty list", () => {
    expect(contactInputSchema.parse(values()).addresses).toEqual([]);
  });

  it("rejects an unknown address type", () => {
    const result = contactInputSchema.safeParse(
      values({ addresses: [address({ type: "holiday", city: "Nice" })] } as never),
    );

    expect(result.success).toBe(false);
    expect(zodAddressErrors(result.error!)[0]).toBeDefined();
  });

  it("reports a per-row message for an over-long field", () => {
    const result = contactInputSchema.safeParse(
      values({
        addresses: [address({ city: "SF" }), address({ postal_code: "9".repeat(21) })],
      } as never),
    );

    expect(zodAddressErrors(result.error!)).toEqual({
      1: "Postal code must be 20 characters or fewer",
    });
    // A bad address must not be reported as a bad contact field.
    expect(zodFieldErrors(result.error!)).toEqual({});
  });

  it("caps the list, and reports that as a whole-list problem", () => {
    const many = Array.from({ length: MAX_ADDRESSES + 1 }, (_, index) =>
      address({ city: `City ${index}` }),
    );
    const result = contactInputSchema.safeParse(values({ addresses: many } as never));

    expect(result.success).toBe(false);
    expect(zodAddressListError(result.error!)).toMatch(/at most 10 addresses/);
  });
});

describe("formDataToAddresses", () => {
  it("zips the parallel input lists back into rows", () => {
    const formData = new FormData();
    for (const [type, city] of [
      ["work", "SF"],
      ["home", "London"],
    ]) {
      formData.append(addressInputName("type"), type);
      formData.append(addressInputName("city"), city);
      formData.append(addressInputName("street"), "");
      formData.append(addressInputName("state"), "");
      formData.append(addressInputName("postal_code"), "");
      formData.append(addressInputName("country"), "");
    }

    expect(formDataToAddresses(formData)).toEqual([
      address({ type: "work", city: "SF" }),
      address({ type: "home", city: "London" }),
    ]);
  });

  it("returns nothing when the form has no address rows", () => {
    expect(formDataToAddresses(new FormData())).toEqual([]);
  });
});

describe("formDataToValues", () => {
  it("pulls every known field out, defaulting to an empty string", () => {
    const formData = new FormData();
    formData.set("first_name", "Grace");
    formData.set("email", "grace@example.com");
    formData.set("ignored", "nope");

    const extracted = formDataToValues(formData);

    expect(extracted.first_name).toBe("Grace");
    expect(extracted.last_name).toBe("");
    // The text controls, plus `photo` — which has its own component rather
    // than an entry in CONTACT_FIELD_GROUPS.
    expect(Object.keys(extracted).sort()).toEqual(
      [...CONTACT_FIELDS.map((field) => field.name), "photo"].sort(),
    );
  });
});
