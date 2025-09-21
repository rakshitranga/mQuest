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
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;

async function ensureHttpClient(): Promise<Client> {
  if (mcpClient && mcpConnected) {
    try {
      // Test if connection is still alive by listing resources
      await mcpClient.listResources();
      return mcpClient;
    } catch (error) {
      console.warn('MCP connection test failed, reconnecting...', error);
      mcpConnected = false;
      mcpClient = null;
    }
  }

  if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
    throw new Error(`Failed to connect to MCP server after ${MAX_CONNECTION_ATTEMPTS} attempts. Please ensure the MCP server is running on localhost:4000`);
  }

  try {
    connectionAttempts++;
    
    const transport = new StreamableHTTPClientTransport(
      new URL("http://localhost:4000/mcp")
    );

    mcpClient = new Client({ name: "maps-http-client", version: "1.0.0" });
    
    // Add connection timeout
    const connectPromise = mcpClient.connect(transport);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('MCP connection timeout')), 10000);
    });
    
    await Promise.race([connectPromise, timeoutPromise]);
    
    mcpConnected = true;
    connectionAttempts = 0; // Reset on successful connection
    
    console.log('Successfully connected to MCP server');
    return mcpClient;
  } catch (error) {
    mcpConnected = false;
    mcpClient = null;
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`MCP connection attempt ${connectionAttempts} failed:`, errorMessage);
    
    if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
      throw new Error(`MCP server connection failed: ${errorMessage}. Please check if the MCP server is running with: npm run dev:mcp`);
    }
    
    // Retry with exponential backoff
    const delay = Math.pow(2, connectionAttempts - 1) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return ensureHttpClient(); // Recursive retry
  }
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Let Gemini answer natural language prompts and call Maps MCP tools when needed.
 * Example prompts:
 * - "What are the coordinates for the Golden Gate Bridge?"
 * - "Find a route from San Francisco to San Jose and estimate travel time."
 */
export async function geminiMaps(prompt: string, system: string = "") {
  try {
    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

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
    
    if (!t || typeof t !== 'string') {
      throw new Error('Invalid response from Gemini API');
    }
    
    return t;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Gemini Maps error:', {
      error: errorMessage,
      prompt: prompt.substring(0, 100) + '...',
      system: system?.substring(0, 100) + '...',
      timestamp: new Date().toISOString()
    });
    
    // Re-throw with more context
    if (errorMessage.includes('MCP')) {
      throw new Error(`Maps service unavailable: ${errorMessage}`);
    } else if (errorMessage.includes('API key')) {
      throw new Error(`Authentication error: ${errorMessage}`);
    } else if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      throw new Error(`API quota exceeded: ${errorMessage}`);
    } else {
      throw new Error(`AI service error: ${errorMessage}`);
    }
  }
}