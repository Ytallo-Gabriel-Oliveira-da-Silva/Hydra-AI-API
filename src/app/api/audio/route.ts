import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCountry, requireUser, enforceRulesOrBlock, ApiError } from "@/lib/api-guard";
import { currentMonthKey, canUse, incrementUsage } from "@/lib/usage";
import { generateSpeechAudio } from "@/lib/providers/speech";
import { getDeepgramTtsModel } from "@/lib/providers/deepgram";

const schema = z.object({
  text: z.string().min(1),
  preview: z.boolean().optional(),
});

export async function GET() {
  return NextResponse.json({ provider: "deepgram", model: getDeepgramTtsModel() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, preview } = schema.parse(body);

    const user = await requireUser(req);
    const country = await requireCountry(req);
    await enforceRulesOrBlock({ text, userId: user.id, country });

    const monthKey = currentMonthKey();
    if (!preview) {
      const quota = await canUse(user, "audio", monthKey);
      if (!quota.allowed) throw new ApiError("Limite de áudio/vídeo atingido para seu plano", 403);
    }

    const generated = await generateSpeechAudio(text);
    if (!preview) {
      await incrementUsage(user.id, "audio", monthKey);
    }

    return NextResponse.json({ audio: generated.audioUrl, provider: generated.provider, model: generated.model });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao gerar áudio";
    const friendly = status === 402
      ? "O provider de áudio recusou a cobrança desta requisição. Revise os créditos da Deepgram."
      : message;
    return NextResponse.json({ error: friendly, raw: message }, { status });
  }
}
