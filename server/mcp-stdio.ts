#!/usr/bin/env node
/**
 * Stdio MCP server for local Claude Desktop usage.
 *
 * Add to your Claude Desktop config (~/Library/Application Support/Claude/claude_desktop_config.json):
 * {
 *   "mcpServers": {
 *     "speech-to-diagram": {
 *       "command": "npx",
 *       "args": ["tsx", "mcp-stdio.ts"],
 *       "cwd": "/path/to/Diagram/server",
 *       "env": {
 *         "ANTHROPIC_API_KEY": "sk-ant-..."
 *       }
 *     }
 *   }
 * }
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./routes/mcp.js";

const server = createMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);
