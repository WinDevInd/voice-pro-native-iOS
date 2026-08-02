import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card } from "./Card";

describe("Card", () => {
  it("renders content and preserves custom attributes", () => {
    render(<Card aria-label="Summary">Recording summary</Card>);

    expect(screen.getByLabelText("Summary")).toHaveTextContent(
      "Recording summary",
    );
  });
});
