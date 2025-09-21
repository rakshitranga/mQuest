export async function callMapsMCP(method: string, params: Record<string, unknown>) {
    const res = await fetch("http://localhost:4000/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Google-Maps-API-Key": process.env.GOOGLE_MAPS_API_KEY!, // supported auth method
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: String(Date.now()),
        method,
        params,
      }),
    });
  
    if (!res.ok) {
      throw new Error(`MCP request failed: ${res.status} ${res.statusText}`);
    }
  
    const data = await res.json();
    if (data.error) {
      throw new Error(`MCP error: ${JSON.stringify(data.error)}`);
    }
  
    return data.result;
  }
  
// Gemini agent that can automatically call the Maps MCP server over HTTP
import { GoogleGenAI, mcpToTool } from "@google/genai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

let mcpClient: Client | null = null;
let mcpConnected = false;

async function ensureHttpClient(): Promise<Client> {
  if (mcpClient && mcpConnected) return mcpClient;

  const transport = new StreamableHTTPClientTransport(
    new URL("http://localhost:4000/mcp")
  );

  mcpClient = new Client({ name: "maps-http-client", version: "1.0.0" });
  await mcpClient.connect(transport);
  mcpConnected = true;
  return mcpClient;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Let Gemini answer natural language prompts and call Maps MCP tools when needed.
 * Example prompts:
 * - "What are the coordinates for the Golden Gate Bridge?"
 * - "Find a route from San Francisco to San Jose and estimate travel time."
 */
export async function geminiMaps(prompt: string, system: string = "") {
  const client = await ensureHttpClient();

  const contents = system ? [{ role: "user", parts: [{ text: system + "\n\n" + prompt }] }] : prompt;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents,
    config: {
      tools: [mcpToTool(client)],
      // Let the model decide when to call tools
      // function_calling: { mode: "AUTO" }, // depending on SDK version
    },
  });

  // Support both property and function styles
  const responseObj = response as { text?: string | (() => Promise<string>) };
  const t = typeof responseObj.text === "function"
    ? await responseObj.text()
    : responseObj.text;
  return t;
}