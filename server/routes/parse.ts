import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "../lib/systemPrompt.js";

const router = Router();

const anthropic = new Anthropic();

router.post("/parse", async (req, res) => {
  try {
    const { transcript, currentDiagram } = req.body;

    if (!transcript || typeof transcript !== "string") {
      return res.status(400).json({ error: "transcript is required" });
    }

    let userMessage = transcript;
    if (currentDiagram) {
      userMessage = `Current diagram state:\n${JSON.stringify(currentDiagram, null, 2)}\n\nUser says: "${transcript}"\n\nUpdate the diagram based on the user's instruction. Return the complete updated DiagramSpec JSON.`;
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    // Try to parse JSON from the response
    let diagram;
    try {
      diagram = JSON.parse(text);
    } catch {
      // Try to extract JSON from response if it has extra text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        diagram = JSON.parse(jsonMatch[0]);
      } else {
        return res.status(422).json({ error: "Failed to parse diagram JSON", raw: text });
      }
    }

    return res.json({ diagram });
  } catch (err: any) {
    console.error("Parse error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

router.get("/config", (_req, res) => {
  res.json({ status: "ok" });
});

export default router;
