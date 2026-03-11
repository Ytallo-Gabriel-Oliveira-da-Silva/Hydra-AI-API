import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCountry, requireUser, enforceRulesOrBlock, ApiError } from "@/lib/api-guard";
import { currentMonthKey, canUse, incrementUsage } from "@/lib/usage";
import { falCreateVideo, getFalFriendlyError, isFalCreditError } from "@/lib/providers/fal";
import { groqTranslateToEnglishPrompt } from "@/lib/providers/groq";

const schema = z.object({
  prompt: z.string().min(5),
  aspectRatio: z.string().optional(),
  duration: z.number().int().min(2).max(10).optional(),
});

function extractQuotedText(message: string) {
  const match = message.match(/["“”'']([^"“”'']+)["“”'']/);
  return match?.[1]?.trim() || null;
}

function stripUrls(text: string) {
  return text.replace(/https?:\/\/\S+/gi, "").replace(/www\.\S+/gi, "").trim();
}

function prepareVideoPrompt(prompt: string) {
  const quotedSpeech = extractQuotedText(prompt);
  let visualPrompt = stripUrls(prompt);

  if (quotedSpeech) {
    visualPrompt = visualPrompt.replace(quotedSpeech, " ");
  }

  visualPrompt = visualPrompt.replace(/["“”'']/g, " ").replace(/\s+/g, " ").trim();

  if (!visualPrompt) {
    visualPrompt = "um personagem de IA falando diretamente para a câmera em um cenário tecnológico futurista";
  }

  if (/\bfalando\b|\bfala\b|\bdizendo\b|\bdiscurso\b/i.test(prompt) && !/\bcâmera\b|\bcamera\b|\bspeaking to camera\b|\bdiretamente para a câmera\b/i.test(visualPrompt)) {
    visualPrompt = `${visualPrompt}, falando diretamente para a câmera`;
  }

  return {
    visualPrompt,
    speechText: quotedSpeech || stripUrls(prompt),
  };
}

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

    const prepared = prepareVideoPrompt(prompt);

    const translatedPrompt = process.env.GROQ_API_KEY
      ? await groqTranslateToEnglishPrompt(prepared.visualPrompt).catch(() => prepared.visualPrompt)
      : prepared.visualPrompt;

    const result = await falCreateVideo(translatedPrompt, aspectRatio || "16:9", duration || 6, prepared.speechText);
    await incrementUsage(user.id, "video", monthKey);

    return NextResponse.json({ video: result });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao gerar vídeo";
    const friendly = status === 402
      ? "O provider de vídeo recusou a cobrança desta requisição. Revise os créditos da fal.ai."
      : isFalCreditError(err)
        ? getFalFriendlyError(err)
      : message;
    return NextResponse.json({ error: friendly, raw: message }, { status });
  }
}
