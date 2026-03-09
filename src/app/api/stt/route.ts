import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, ApiError } from "@/lib/api-guard";
import { groqTranscribe } from "@/lib/providers/groq";

const schema = z.object({
  audio: z.string().min(10), // base64 data URL or plain base64
  mime: z.string().default("audio/webm"),
});

export async function POST(req: NextRequest) {
  try {
    await requireUser(req);

    const body = await req.json();
    const { audio, mime } = schema.parse(body);

    const base64 = audio.includes(",") ? audio.split(",")[1] : audio;
    const buffer = Buffer.from(base64, "base64");
    if (!process.env.GROQ_API_KEY) {
      throw new ApiError("GROQ_API_KEY ausente", 500);
    }

    try {
      const text = await groqTranscribe(buffer, mime);
      return NextResponse.json({ text, provider: "groq" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro no STT principal";
      throw new ApiError(message, /402/.test(message) ? 402 : /429/.test(message) ? 429 : 400);
    }
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao transcrever áudio";
    return NextResponse.json({ error: message }, { status });
  }
}