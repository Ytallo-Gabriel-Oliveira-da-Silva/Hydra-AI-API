import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCountry, requireUser, enforceRulesOrBlock, ApiError } from "@/lib/api-guard";
import { currentMonthKey, canUse, incrementUsage } from "@/lib/usage";
import { elevenLabsTTS } from "@/lib/providers/elevenlabs";

const allowedVoices = [
  { id: "dtSEyYGNJqjrtBArPCVZ", label: "titã" },
  { id: "tMXujoAjiboschVOhAnk", label: "clara" },
  { id: "xKhbyU7E3bC6T89Kn26c", label: "Adam" },
  { id: "bKrvJaCHEqucAEpSzACi", label: "brian" },
  { id: "PoPHDFYHijTq7YiSCwE3", label: "steven" },
  { id: "uaXmxAsXACgEChuJxq9s", label: "Phil" },
  { id: "nwj0s2LU9bDWRKND5yzA", label: "bunty" },
  { id: "XhNlP8uwiH6XZSFnH1yL", label: "elizabeth" },
];

const schema = z.object({
  text: z.string().min(1),
  voiceId: z.string().min(5),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voiceId } = schema.parse(body);

    const user = await requireUser(req);
    const country = await requireCountry(req);
    await enforceRulesOrBlock({ text, userId: user.id, country });

    const monthKey = currentMonthKey();
    const quota = await canUse(user, "audio", monthKey);
    if (!quota.allowed) throw new ApiError("Limite de áudio/vídeo atingido para seu plano", 403);

    const chosen = allowedVoices.find((v) => v.id === voiceId);
    if (!chosen) throw new ApiError("Voz inválida ou não permitida", 400);

    const base64 = await elevenLabsTTS(text, chosen.id);
    await incrementUsage(user.id, "audio", monthKey);

    return NextResponse.json({ audio: `data:audio/mpeg;base64,${base64}` });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao gerar áudio";
    const friendly = status === 402
      ? "O provider de voz recusou a cobrança desta requisição. Configure créditos válidos no ElevenLabs ou use o fallback local do navegador."
      : message;
    return NextResponse.json({ error: friendly, raw: message }, { status });
  }
}
