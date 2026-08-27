import React from "react";
import { render, screen } from "@testing-library/react";
import ContactAvatar from "@/components/contacts/ContactAvatar";
import { makeContact } from "../mocks/handlers";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

describe("ContactAvatar", () => {
  it("falls back to initials when there is no photo", () => {
    const { container } = render(<ContactAvatar contact={makeContact()} />);

    expect(screen.getByText("AL")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("shows the photo as a circular image when there is one", () => {
    const { container } = render(
      <ContactAvatar contact={makeContact({ photo: TINY_PNG })} />,
    );

    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", TINY_PNG);
    expect(image).toHaveClass("rounded-full", "object-cover");
    expect(screen.queryByText("AL")).not.toBeInTheDocument();
  });
});
