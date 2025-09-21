import { geminiMaps } from "@/lib/maps";
export async function POST(req: Request) {
    try {
      const body = await req.json().catch(() => ({}));
      const { prompt = "Empty Prompt", system } = body as { prompt?: string; system?: string };
  
      return Response.json({
        ok: true,
        text: await geminiMaps(prompt, system)
      });
    } catch (err) {
      // TypeScript-safe: coerce err to Error if possible
      const message = err instanceof Error ? err.message : "Unknown error";
      return Response.json({ ok: false, error: message }, { status: 500 });
    }
}