import { describe, expect, it } from "vitest";

import { Badge, Button, Card, Input } from "./index";

describe("public API", () => {
  it("exports every component", () => {
    expect({ Badge, Button, Card, Input }).toMatchObject({
      Badge: expect.any(Object),
      Button: expect.any(Object),
      Card: expect.any(Object),
      Input: expect.any(Object),
    });
  });
});
