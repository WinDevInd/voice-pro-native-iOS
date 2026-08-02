import "dotenv/config";
import cors from "cors";
import express from "express";

const app = express();
const port = Number(process.env.PORT || 8787);
const tones = new Set(["Default", "Casual", "Formal", "More Casual"]);

app.use(cors({ origin: true }));
app.use(express.json({ limit: "64kb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.post("/api/refine", async (request, response) => {
  const { text, tone = "Default", context = "" } = request.body ?? {};
  if (typeof text !== "string" || !text.trim()) {
    return response.status(400).json({ error: "Text is required." });
  }
  if (!tones.has(tone)) {
    return response.status(400).json({ error: "Unsupported tone." });
  }
  if (!process.env.LLM_API_KEY) {
    return response.status(503).json({ error: "LLM_API_KEY is not configured on the server." });
  }

  const instructions = [
    "Refine the dictated text without changing its meaning.",
    "Remove filler words, false starts, repeated words, and stutters.",
    "Correct punctuation and capitalization.",
    `Use this tone: ${tone}.`,
    context ? `Writing context: ${context}` : "",
    "Return only the refined text."
  ]
    .filter(Boolean)
    .join(" ");

  try {
    const upstream = await fetch(
      process.env.LLM_API_URL || "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.LLM_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.LLM_MODEL || "gpt-4o-mini",
          temperature: 0.25,
          messages: [
            { role: "system", content: instructions },
            { role: "user", content: text.trim() }
          ]
        })
      }
    );

    if (!upstream.ok) {
      const detail = await upstream.text();
      return response.status(502).json({ error: `Refinement provider failed: ${detail.slice(0, 240)}` });
    }

    const data = await upstream.json();
    const refined = data?.choices?.[0]?.message?.content?.trim();
    if (!refined) {
      return response.status(502).json({ error: "Refinement provider returned no text." });
    }
    return response.json({ refined });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown upstream error";
    return response.status(502).json({ error: `Unable to reach refinement provider: ${message}` });
  }
});

app.listen(port, () => {
  console.log(`Voice Pro API listening on http://localhost:${port}`);
});
