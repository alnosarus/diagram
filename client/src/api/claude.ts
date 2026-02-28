import type { DiagramSpec } from "../lib/diagramSchema";

export async function parseDiagram(
  transcript: string,
  currentDiagram: DiagramSpec | null
): Promise<DiagramSpec | null> {
  const res = await fetch("/api/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, currentDiagram }),
  });

  if (!res.ok) {
    console.error("Parse API error:", res.status);
    return null;
  }

  const data = await res.json();
  return data.diagram ?? null;
}
