import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./lib/speechCapture", () => ({
  createSpeechCapture: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    onResult: () => () => undefined,
    onInterimResult: () => () => undefined,
    onError: () => () => undefined,
    onVolumeLevel: () => () => undefined,
    onListeningChange: () => () => undefined,
  }),
}));

vi.mock("./components/Waveform", () => ({
  Waveform: ({ active }: { active: boolean }) => (
    <div data-testid="waveform">{active ? "active" : "idle"}</div>
  ),
}));

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("edits and clears the transcript", () => {
    render(<App />);
    const transcript = screen.getByLabelText("Transcript");
    fireEvent.change(transcript, { target: { value: "A dictated note" } });
    expect(transcript).toHaveValue("A dictated note");
    fireEvent.click(screen.getByRole("button", { name: /clear text/i }));
    expect(transcript).toHaveValue("");
  });

  it("refines text with the selected tone", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ refined: "A polished note." }),
      }),
    );
    render(<App />);
    fireEvent.change(screen.getByLabelText("Transcript"), {
      target: { value: "um a note" },
    });
    fireEvent.change(screen.getByLabelText("Tone"), {
      target: { value: "Formal" },
    });
    fireEvent.click(screen.getByRole("button", { name: /refine with ai/i }));

    expect(await screen.findByLabelText("Refined output")).toHaveValue(
      "A polished note.",
    );
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/refine",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(
      JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
        .tone,
    ).toBe("Formal");
  });
});
