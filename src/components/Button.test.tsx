import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./Button";

describe("Button", () => {
  it("renders as a button with a safe default type", () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
      "type",
      "button",
    );
  });

  it.each([
    ["primary", "bg-blue-600"],
    ["secondary", "bg-slate-100"],
    ["ghost", "bg-transparent"],
  ] as const)("applies the %s variant", (variant, expectedClass) => {
    render(<Button variant={variant}>{variant}</Button>);

    expect(screen.getByRole("button", { name: variant })).toHaveClass(
      expectedClass,
    );
  });
});
