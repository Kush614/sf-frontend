import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactForm from "@/components/contacts/ContactForm";
import { makeContact } from "../mocks/handlers";
import type { FormState } from "@/lib/contacts/types";

function renderForm(action: jest.Mock, contact?: ReturnType<typeof makeContact>) {
  return render(
    <ContactForm
      action={action as never}
      contact={contact}
      submitLabel="Create contact"
      cancelHref="/contacts"
    />,
  );
}

describe("ContactForm", () => {
  it("renders every editable field", () => {
    renderForm(jest.fn());

    expect(screen.getByLabelText(/first name/i)).toBeRequired();
    expect(screen.getByLabelText(/last name/i)).toBeRequired();
    expect(screen.getByLabelText(/^email/i)).toBeRequired();
    expect(screen.getByLabelText(/phone/i)).not.toBeRequired();
    expect(screen.getByLabelText(/notes/i).tagName).toBe("TEXTAREA");
  });

  it("prefills from an existing contact", () => {
    renderForm(jest.fn(), makeContact());

    expect(screen.getByLabelText(/first name/i)).toHaveValue("Ada");
    expect(screen.getByLabelText(/^email/i)).toHaveValue("ada@example.com");
    // Nulls become empty inputs rather than the string "null".
    expect(screen.getByLabelText(/street address/i)).toHaveValue("");
  });

  it("submits the entered values to the action", async () => {
    const action = jest.fn<Promise<FormState>, [FormState, FormData]>(
      async () => ({ status: "idle" }),
    );
    renderForm(action);

    await userEvent.type(screen.getByLabelText(/first name/i), "Grace");
    await userEvent.type(screen.getByLabelText(/last name/i), "Hopper");
    await userEvent.type(screen.getByLabelText(/^email/i), "grace@example.com");
    await userEvent.click(screen.getByRole("button", { name: /create contact/i }));

    await waitFor(() => expect(action).toHaveBeenCalled());

    const formData = action.mock.calls[0][1];
    expect(formData.get("first_name")).toBe("Grace");
    expect(formData.get("email")).toBe("grace@example.com");
  });

  it("shows the summary and the per-field errors the action returns", async () => {
    const action = jest.fn(
      async (): Promise<FormState> => ({
        status: "error",
        message: "That email address is already taken.",
        fieldErrors: { email: "This email is already in use." },
        values: { first_name: "Grace" },
      }),
    );
    renderForm(action);

    await userEvent.click(screen.getByRole("button", { name: /create contact/i }));

    const alerts = await screen.findAllByRole("alert");
    expect(alerts.map((node) => node.textContent)).toEqual(
      expect.arrayContaining([
        "That email address is already taken.",
        "This email is already in use.",
      ]),
    );
    expect(screen.getByLabelText(/^email/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("links back out without submitting", () => {
    renderForm(jest.fn());
    expect(screen.getByRole("link", { name: /cancel/i })).toHaveAttribute(
      "href",
      "/contacts",
    );
  });
});

describe("ContactForm photo", () => {
  const TINY_PNG =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  function photoInput(container: HTMLElement) {
    return container.querySelector<HTMLInputElement>('input[name="photo"]');
  }

  it("carries an existing photo through the submit, so editing does not wipe it", async () => {
    // The edit form does a full replace: a photo the user never touched still
    // has to be resubmitted or the PUT clears it.
    const action = jest.fn<Promise<FormState>, [FormState, FormData]>(
      async () => ({ status: "idle" }),
    );
    const { container } = renderForm(action, makeContact({ photo: TINY_PNG }));

    expect(photoInput(container)).toHaveValue(TINY_PNG);

    await userEvent.click(screen.getByRole("button", { name: /create contact/i }));

    await waitFor(() => expect(action).toHaveBeenCalled());
    expect(action.mock.calls[0][1].get("photo")).toBe(TINY_PNG);
  });

  it("submits an empty photo when the contact has none", () => {
    const { container } = renderForm(jest.fn(), makeContact());

    expect(photoInput(container)).toHaveValue("");
    expect(screen.getByRole("button", { name: /upload photo/i })).toBeEnabled();
  });

  it("clears the photo when Remove is used", async () => {
    const { container } = renderForm(jest.fn(), makeContact({ photo: TINY_PNG }));

    await userEvent.click(screen.getByRole("button", { name: /remove/i }));

    expect(photoInput(container)).toHaveValue("");
    expect(screen.getByRole("button", { name: /upload photo/i })).toBeInTheDocument();
  });
});

describe("ContactForm photo processing", () => {
  it("blocks submit while the picked image is still being resized", async () => {
    // The hidden photo input is written only once resizing finishes, so a
    // submit during it would send the previous value and drop the new image.
    let finishResize: (bitmap: ImageBitmap) => void = () => {};
    const createImageBitmap = jest
      .fn()
      .mockReturnValue(new Promise<ImageBitmap>((resolve) => {
        finishResize = resolve;
      }));
    Object.defineProperty(globalThis, "createImageBitmap", {
      value: createImageBitmap,
      configurable: true,
    });

    renderForm(jest.fn());
    const submit = screen.getByRole("button", { name: /create contact/i });
    expect(submit).toBeEnabled();

    await userEvent.upload(
      screen.getByLabelText(/choose a profile photo/i),
      new File(["x"], "ada.png", { type: "image/png" }),
    );

    await waitFor(() => expect(submit).toBeDisabled());

    // Fail the resize; the form must become submittable again rather than
    // stranding the user on a permanently disabled button.
    finishResize(undefined as unknown as ImageBitmap);
    await waitFor(() => expect(submit).toBeEnabled());
  });
});
