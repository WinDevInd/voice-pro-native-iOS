import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders the neutral variant by default", () => {
    render(<Badge>Draft</Badge>);

    expect(screen.getByText("Draft")).toHaveClass("bg-slate-100");
  });

  it("renders a semantic status variant", () => {
    render(<Badge variant="success">Ready</Badge>);

    expect(screen.getByText("Ready")).toHaveClass(
      "bg-emerald-100",
      "text-emerald-800",
    );
  });
});
