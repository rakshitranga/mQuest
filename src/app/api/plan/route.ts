import { geminiMaps } from "@/lib/maps";

export async function POST(req: Request) {
    try {
      // Validate request body
      const body = await req.json().catch(() => ({}));
      const { prompt, system } = body as { prompt?: string; system?: string };
      
      // Validate required fields
      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return Response.json({ 
          ok: false, 
          error: "Prompt is required and must be a non-empty string" 
        }, { status: 400 });
      }

      // Validate prompt length (prevent extremely long prompts)
      if (prompt.length > 5000) {
        return Response.json({ 
          ok: false, 
          error: "Prompt is too long (max 5000 characters)" 
        }, { status: 400 });
      }

      // Validate system prompt if provided
      if (system && (typeof system !== 'string' || system.length > 5000)) {
        return Response.json({ 
          ok: false, 
          error: "System prompt must be a string with max 5000 characters" 
        }, { status: 400 });
      }
  
      // Call the geminiMaps function with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000); // 30 second timeout
      });

      const result = await Promise.race([
        geminiMaps(prompt.trim(), system?.trim()),
        timeoutPromise
      ]);

      // Validate result
      if (!result || typeof result !== 'string') {
        return Response.json({ 
          ok: false, 
          error: "Invalid response from AI service" 
        }, { status: 502 });
      }

      return Response.json({
        ok: true,
        text: result
      });
    } catch (err) {
      console.error('API route error:', {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        timestamp: new Date().toISOString()
      });

      // Handle specific error types
      if (err instanceof Error) {
        if (err.message.includes('timeout') || err.message.includes('Request timeout')) {
          return Response.json({ 
            ok: false, 
            error: "Request timed out. Please try again." 
          }, { status: 504 });
        }
        
        if (err.message.includes('MCP') || err.message.includes('connection')) {
          return Response.json({ 
            ok: false, 
            error: "Maps service is currently unavailable. Please ensure the MCP server is running." 
          }, { status: 503 });
        }

        if (err.message.includes('API key') || err.message.includes('authentication')) {
          return Response.json({ 
            ok: false, 
            error: "Authentication error. Please check API configuration." 
          }, { status: 401 });
        }

        if (err.message.includes('quota') || err.message.includes('rate limit')) {
          return Response.json({ 
            ok: false, 
            error: "API quota exceeded. Please try again later." 
          }, { status: 429 });
        }
      }

      // Generic error response
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      return Response.json({ 
        ok: false, 
        error: `Service error: ${message}` 
      }, { status: 500 });
    }
}