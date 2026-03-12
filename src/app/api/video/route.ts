import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCountry, requireUser, enforceRulesOrBlock, ApiError } from "@/lib/api-guard";
const VIDEO_SUSPENDED_MESSAGE = "A geração de vídeo está temporariamente suspensa para atualização da infraestrutura. Assim que o recurso voltar com estabilidade e créditos dedicados, ele será reativado.";

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
    const { prompt } = schema.parse(body);

    const user = await requireUser(req);
    const country = await requireCountry(req);
    await enforceRulesOrBlock({ text: prompt, userId: user.id, country });
    return NextResponse.json({ error: VIDEO_SUSPENDED_MESSAGE }, { status: 503 });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao gerar vídeo";
    return NextResponse.json({ error: message, raw: message }, { status });
  }
}
