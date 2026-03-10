import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCountry, requireUser, enforceRulesOrBlock, ApiError } from "@/lib/api-guard";
import { currentMonthKey, canUse, incrementUsage } from "@/lib/usage";
import { stabilityGenerateImage } from "@/lib/providers/stability";
import { groqTranslateToEnglishPrompt } from "@/lib/providers/groq";
import { prisma } from "@/lib/db";

const schema = z.object({ prompt: z.string().min(5) });

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const images = await prisma.imageAsset.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return NextResponse.json({ images });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao listar imagens";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt } = schema.parse(body);

    const user = await requireUser(req);
    const country = await requireCountry(req);
    await enforceRulesOrBlock({ text: prompt, userId: user.id, country });

    const monthKey = currentMonthKey();
    const quota = await canUse(user, "image", monthKey);
    if (!quota.allowed) throw new ApiError("Limite de imagem atingido para seu plano", 403);
    if (!process.env.STABILITY_API_KEY) throw new ApiError("STABILITY_API_KEY ausente", 500);

    const translatedPrompt = process.env.GROQ_API_KEY
      ? await groqTranslateToEnglishPrompt(prompt).catch(() => prompt)
      : prompt;

    const url = await stabilityGenerateImage(translatedPrompt);
    await incrementUsage(user.id, "image", monthKey);

    await prisma.imageAsset.create({ data: { userId: user.id, title: prompt.slice(0, 80), url } });

    return NextResponse.json({ url });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao gerar imagem";
    const friendly = status === 402 || status === 429
      ? "O provider de imagem recusou a requisição por cobrança ou limite. Revise STABILITY_API_KEY ou o saldo do provedor."
      : message;
    return NextResponse.json({ error: friendly, raw: message }, { status });
  }
}
