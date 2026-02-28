import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "../lib/systemPrompt.js";

const anthropic = new Anthropic();

export function createMcpServer() {
  const server = new McpServer({
    name: "speech-to-diagram",
    version: "0.0.1",
  });

  server.tool(
    "generate_diagram",
    "Generate a math/physics diagram from a text description. Returns a DiagramSpec JSON that can be rendered as a 3D interactive diagram. Supports vectors, points, lines, circles, arcs, equations, planes, curves, fields, angles, and axes.",
    {
      transcript: z
        .string()
        .describe("Natural language description of the diagram to generate"),
      currentDiagram: z
        .any()
        .optional()
        .describe(
          "Optional current DiagramSpec JSON to update incrementally instead of creating from scratch"
        ),
    },
    async ({ transcript, currentDiagram }) => {
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

      const text =
        message.content[0].type === "text" ? message.content[0].text : "";

      let diagram;
      try {
        diagram = JSON.parse(text);
      } catch {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          diagram = JSON.parse(jsonMatch[0]);
        } else {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: "Failed to parse diagram JSON",
                  raw: text,
                }),
              },
            ],
            isError: true,
          };
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(diagram, null, 2),
          },
        ],
      };
    }
  );

  return server;
}
