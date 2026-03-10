import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCountry, requireUser, enforceRulesOrBlock, ApiError } from "@/lib/api-guard";
import { currentMonthKey, canUse, incrementUsage } from "@/lib/usage";
import { elevenLabsTTS } from "@/lib/providers/elevenlabs";
import { findHydraVoiceById, hydraVoiceOptions, resolveHydraVoiceId } from "@/lib/voices";

const schema = z.object({
  text: z.string().min(1),
  voiceId: z.string().min(5),
  preview: z.boolean().optional(),
});

export async function GET() {
  return NextResponse.json({ voices: hydraVoiceOptions });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voiceId, preview } = schema.parse(body);

    const user = await requireUser(req);
    const country = await requireCountry(req);
    await enforceRulesOrBlock({ text, userId: user.id, country });

    const monthKey = currentMonthKey();
    if (!preview) {
      const quota = await canUse(user, "audio", monthKey);
      if (!quota.allowed) throw new ApiError("Limite de áudio/vídeo atingido para seu plano", 403);
    }

    const chosen = findHydraVoiceById(voiceId) || findHydraVoiceById(resolveHydraVoiceId(voiceId));
    if (!chosen) throw new ApiError("Voz inválida ou não permitida", 400);

    const base64 = await elevenLabsTTS(text, chosen.id);
    if (!preview) {
      await incrementUsage(user.id, "audio", monthKey);
    }

    return NextResponse.json({ audio: `data:audio/mpeg;base64,${base64}`, voice: chosen });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao gerar áudio";
    const friendly = status === 402
      ? "O provider de voz recusou a cobrança desta requisição. Configure créditos válidos no ElevenLabs ou use o fallback local do navegador."
      : message;
    return NextResponse.json({ error: friendly, raw: message }, { status });
  }
}
