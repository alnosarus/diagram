import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./routes/mcp.js";

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());

// ---------- MCP Streamable HTTP endpoint ----------
// Must be mounted BEFORE express.json() so the SDK can read the raw body
app.post("/mcp", express.json(), async (req, res) => {
  const mcpServer = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  });
  res.on("close", () => { transport.close(); });
  await mcpServer.connect(transport);
  await transport.handleRequest(req, res, req.body);
});


// Handle GET/DELETE for MCP protocol (return 405 for stateless)
app.get("/mcp", (_req, res) => {
  res.status(405).json({ error: "Method not allowed. Use POST for MCP requests." });
});
app.delete("/mcp", (_req, res) => {
  res.status(405).json({ error: "Method not allowed. Sessions are not supported." });
});

// JSON body parser for API routes
app.use(express.json({ limit: "1mb" }));

// Lazy-import routes AFTER env is loaded
const { default: parseRouter } = await import("./routes/parse.js");
app.use("/api", parseRouter);

// ---------- Static file serving (production) ----------
const clientDist = path.resolve(__dirname, "../client/dist");
app.use(express.static(clientDist));

// SPA catch-all: serve index.html for any non-API route
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

// Create HTTP server for both Express and WebSocket
const server = http.createServer(app);

// WebSocket server for STT proxy
const wss = new WebSocketServer({ server, path: "/api/stt" });

wss.on("connection", (clientWs) => {
  console.log("[STT] Client connected");

  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  if (!elevenLabsKey) {
    clientWs.send(JSON.stringify({ type: "error", text: "ELEVENLABS_API_KEY not set" }));
    clientWs.close();
    return;
  }

  // Connect to ElevenLabs Scribe v2 Realtime
  const elevenLabsUrl =
    `wss://api.elevenlabs.io/v1/speech-to-text/realtime` +
    `?model_id=scribe_v2_realtime` +
    `&language_code=en` +
    `&audio_format=pcm_16000` +
    `&commit_strategy=vad` +
    `&vad_silence_threshold_secs=1.0`;

  const elWs = new WebSocket(elevenLabsUrl, {
    headers: { "xi-api-key": elevenLabsKey },
  });

  let elConnected = false;

  elWs.on("open", () => {
    console.log("[STT] Connected to ElevenLabs");
    elConnected = true;
    clientWs.send(JSON.stringify({ type: "connected" }));
  });

  elWs.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.message_type === "partial_transcript" && msg.text) {
        clientWs.send(JSON.stringify({ type: "partial", text: msg.text }));
      } else if (
        msg.message_type === "committed_transcript" ||
        msg.message_type === "committed_transcript_with_timestamps"
      ) {
        if (msg.text) {
          clientWs.send(JSON.stringify({ type: "final", text: msg.text }));
        }
      } else if (msg.message_type === "session_started") {
        console.log("[STT] Session started:", msg.session_id);
      } else if (msg.message_type?.includes("error")) {
        console.error("[STT] ElevenLabs error:", msg);
        clientWs.send(JSON.stringify({ type: "error", text: msg.error || "STT error" }));
      }
    } catch {}
  });

  elWs.on("close", () => {
    console.log("[STT] ElevenLabs disconnected");
    elConnected = false;
    clientWs.close();
  });

  elWs.on("error", (err) => {
    console.error("[STT] ElevenLabs WS error:", err.message);
    clientWs.send(JSON.stringify({ type: "error", text: err.message }));
  });

  // Receive audio from client and forward to ElevenLabs
  clientWs.on("message", (data) => {
    if (!elConnected) return;

    if (data instanceof Buffer || data instanceof ArrayBuffer) {
      // Convert binary PCM to base64 for ElevenLabs
      const buffer = data instanceof ArrayBuffer ? Buffer.from(data) : data;
      const base64 = buffer.toString("base64");

      elWs.send(
        JSON.stringify({
          message_type: "input_audio_chunk",
          audio_base_64: base64,
          commit: false,
          sample_rate: 16000,
        })
      );
    }
  });

  clientWs.on("close", () => {
    console.log("[STT] Client disconnected");
    if (elConnected) {
      elWs.close();
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
