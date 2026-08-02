import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Input } from "./Input";

describe("Input", () => {
  it("associates its label and helper text with the input", () => {
    render(<Input label="Email" helperText="Use your work email" />);

    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input).toHaveAccessibleDescription("Use your work email");
  });

  it("exposes an invalid state accessibly", () => {
    render(
      <Input
        label="Email"
        validationState="invalid"
        helperText="Enter a valid email"
      />,
    );

    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveClass("border-red-600");
    expect(screen.getByText("Enter a valid email")).toHaveClass("text-red-700");
  });

  it("styles a valid state without marking the field invalid", () => {
    render(<Input aria-label="Username" validationState="valid" />);

    const input = screen.getByRole("textbox", { name: "Username" });
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).toHaveClass("border-emerald-600");
  });
});
