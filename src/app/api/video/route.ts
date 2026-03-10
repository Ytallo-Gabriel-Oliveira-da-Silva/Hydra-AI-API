import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCountry, requireUser, enforceRulesOrBlock, ApiError } from "@/lib/api-guard";
import { currentMonthKey, canUse, incrementUsage } from "@/lib/usage";
import { runwayCreateVideo } from "@/lib/providers/runway";
import { groqTranslateToEnglishPrompt } from "@/lib/providers/groq";

const schema = z.object({
  prompt: z.string().min(5),
  aspectRatio: z.string().optional(),
  duration: z.number().int().min(2).max(10).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, aspectRatio, duration } = schema.parse(body);

    const user = await requireUser(req);
    const country = await requireCountry(req);
    await enforceRulesOrBlock({ text: prompt, userId: user.id, country });

    const monthKey = currentMonthKey();
    const quota = await canUse(user, "video", monthKey);
    if (!quota.allowed) throw new ApiError("Limite de vídeo atingido para seu plano", 403);

    const translatedPrompt = process.env.GROQ_API_KEY
      ? await groqTranslateToEnglishPrompt(prompt).catch(() => prompt)
      : prompt;

    const result = await runwayCreateVideo(translatedPrompt, aspectRatio || "16:9", duration || 6);
    await incrementUsage(user.id, "video", monthKey);

    return NextResponse.json({ video: result });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao gerar vídeo";
    return NextResponse.json({ error: message }, { status });
  }
}
