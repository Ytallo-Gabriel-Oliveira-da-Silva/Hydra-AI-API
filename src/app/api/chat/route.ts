import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCountry, requireUser, enforceRulesOrBlock, ApiError } from "@/lib/api-guard";
import { currentMonthKey, canUse, incrementUsage } from "@/lib/usage";
import { prisma } from "@/lib/db";
import { groqChat, groqTranslateToEnglishPrompt } from "@/lib/providers/groq";
import { stabilityGenerateImage } from "@/lib/providers/stability";
import { falCreateVideo, getFalFriendlyError, isFalCreditError } from "@/lib/providers/fal";
import { buildMediaMessage, parseMediaMessage } from "@/lib/media";
import { generateSpeechAudio } from "@/lib/providers/speech";

const schema = z.object({
  message: z.string().min(1),
  conversationId: z.string().optional(),
});

function isImageRequest(message: string) {
  if (/\bprompt\b/i.test(message)) return false;

  return /(?:^|\b)(?:gere|gera|crie|cria|faça|faca|produza|desenhe|renderize)(?:[\s\S]{0,80})\b(?:imagem|foto|arte|ilustração|ilustracao|desenho|render)\b/i.test(message)
    || /\b(?:imagem|foto|arte|ilustração|ilustracao|desenho|render)\b(?:[\s\S]{0,40})\b(?:de|do|da)\b/i.test(message);
}

function isAudioRequest(message: string) {
  return /(?:^|\b)(?:gere|gera|crie|cria|faça|faca|produza)(?:[\s\S]{0,80})\b(?:áudio|audio|narração|narracao|locução|locucao|voz|fala)\b/i.test(message)
    || /\b(?:áudio|audio|voz|fala)\b(?:[\s\S]{0,40})\b(?:falando|dizendo|com|de)\b/i.test(message);
}

function isVideoRequest(message: string) {
  return /(?:^|\b)(?:gere|gera|crie|cria|faça|faca|produza|monte|anime)(?:[\s\S]{0,80})\b(?:vídeo|video|filme|animação|animacao|clip)\b/i.test(message)
    || /\b(?:vídeo|video|filme|animação|animacao|clip)\b(?:[\s\S]{0,40})\b(?:de|do|da|com)\b/i.test(message);
}

function extractQuotedText(message: string) {
  const match = message.match(/["“”'']([^"“”'']+)["“”'']/);
  return match?.[1]?.trim() || null;
}

function cleanGenerativePrompt(message: string, kind: "image" | "audio" | "video") {
  const quoted = extractQuotedText(message);
  if (kind === "audio" && quoted) return quoted;

  const patterns =
    kind === "audio"
      ? [
          /\b(?:falando|dizendo|narrando|com o texto|texto)\s+([\s\S]+)/i,
          /\b(?:áudio|audio|voz|fala)\s+(?:de|com)\s+([\s\S]+)/i,
        ]
      : [
          /\b(?:imagem|foto|arte|ilustração|ilustracao|desenho|render|vídeo|video|filme|animação|animacao|clip)\s+(?:de|do|da|com)\s+([\s\S]+)/i,
          /\b(?:gere|gera|crie|cria|faça|faca|produza|desenhe|renderize|anime|monte)\s+(?:uma|um)?\s*(?:imagem|foto|arte|ilustração|ilustracao|desenho|render|vídeo|video|filme|animação|animacao|clip)?\s*(?:de|do|da|com)?\s*([\s\S]+)/i,
        ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }

  return message.trim();
}

async function normalizeVisualPrompt(prompt: string) {
  if (!process.env.GROQ_API_KEY) return prompt;
  return groqTranslateToEnglishPrompt(prompt).catch(() => prompt);
}

async function ensureConversation(userId: string, conversationId: string | undefined, title: string) {
  if (conversationId) return conversationId;

  const conv = await prisma.conversation.create({
    data: {
      userId,
      title: title.slice(0, 60),
      messages: { create: [] },
    },
  });

  return conv.id;
}

function systemPrompt(country: string) {
  return (
    "Você é a HYDRA AI, multimodal, modos: robótico, profissional, formal, informal, investigativo." +
    " Respeite leis e regras do país de origem: " + country +
    " Seja autogerativa: proponha próximos passos e summarize quando útil." +
    " Respeite limites de segurança, não produza conteúdo ilegal ou nocivo."
  );
}

async function generateChatReply(messages: { role: string; content: string }[]) {
  if (!process.env.GROQ_API_KEY) {
    throw new ApiError("GROQ_API_KEY ausente", 500);
  }

  return groqChat(messages);
}

function buildMediaUnavailableReply(kind: "audio" | "video") {
  if (kind === "audio") {
    return "No momento eu não consegui gerar o arquivo de áudio porque o provider de voz está sem créditos para esta conta. A conversa em texto continua normal e a resposta falada no navegador ainda pode funcionar localmente.";
  }

  return "No momento eu não consegui gerar o vídeo porque a conta do provider de vídeo está sem créditos. O recurso continua habilitado no seu plano, mas a geração depende de saldo disponível no provider.";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, conversationId } = schema.parse(body);

    const user = await requireUser(req);
    const country = await requireCountry(req);

    await enforceRulesOrBlock({ text: message, userId: user.id, country });

    const monthKey = currentMonthKey();
    const quota = await canUse(user, "chat", monthKey);
    if (!quota.allowed) throw new ApiError("Limite de chat atingido para seu plano", 403);

    let reply: string;
    let convId: string;

    if (isVideoRequest(message)) {
      const videoQuota = await canUse(user, "video", monthKey);
      if (!videoQuota.allowed) throw new ApiError("Limite de vídeo atingido para seu plano", 403);
      if (!process.env.FAL_KEY) throw new ApiError("FAL_KEY ausente", 500);

      const prompt = cleanGenerativePrompt(message, "video");
      try {
        const translatedPrompt = await normalizeVisualPrompt(prompt);
        const video = await falCreateVideo(translatedPrompt, "16:9", 6);
        await incrementUsage(user.id, "video", monthKey);

        reply = buildMediaMessage({
          kind: "video",
          prompt,
          url: video.url,
          aspectRatio: video.ratio,
          duration: video.duration,
          taskId: video.taskId,
          provider: video.provider,
          model: video.model,
        });
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "";
        if (!/402|429/.test(messageText) && !messageText.includes("FAL_KEY ausente") && !isFalCreditError(error)) throw error;
        reply = buildMediaUnavailableReply("video");
      }

      convId = await ensureConversation(user.id, conversationId, prompt);
    } else if (isAudioRequest(message)) {
      const audioQuota = await canUse(user, "audio", monthKey);
      if (!audioQuota.allowed) throw new ApiError("Limite de áudio atingido para seu plano", 403);
      if (!process.env.DEEPGRAM_API_KEY) {
        throw new ApiError("Configure DEEPGRAM_API_KEY para gerar áudio", 500);
      }

      const textToSpeak = cleanGenerativePrompt(message, "audio");
      try {
        const generated = await generateSpeechAudio(textToSpeak);
        await incrementUsage(user.id, "audio", monthKey);

        reply = buildMediaMessage({
          kind: "audio",
          prompt: message,
          text: textToSpeak,
          audioUrl: generated.audioUrl,
          provider: generated.provider,
          model: generated.model,
        });
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "";
        if (!/402|429/.test(messageText) && !messageText.includes("DEEPGRAM_API_KEY ausente")) throw error;
        reply = buildMediaUnavailableReply("audio");
      }

      convId = await ensureConversation(user.id, conversationId, textToSpeak);
    } else if (isImageRequest(message)) {
      const imageQuota = await canUse(user, "image", monthKey);
      if (!imageQuota.allowed) throw new ApiError("Limite de imagem atingido para seu plano", 403);
      if (!process.env.STABILITY_API_KEY) throw new ApiError("STABILITY_API_KEY ausente", 500);

      const prompt = cleanGenerativePrompt(message, "image");
      const translatedPrompt = await normalizeVisualPrompt(prompt);
      const imageUrl = await stabilityGenerateImage(translatedPrompt);
      await incrementUsage(user.id, "image", monthKey);
      await prisma.imageAsset.create({ data: { userId: user.id, title: prompt.slice(0, 80), url: imageUrl } });
      reply = buildMediaMessage({ kind: "image", prompt, url: imageUrl });
      convId = await ensureConversation(user.id, conversationId, prompt);
    } else {
      const system = systemPrompt(country);
      reply = await generateChatReply([
        { role: "system", content: system },
        { role: "user", content: message },
      ]);

      await incrementUsage(user.id, "chat", monthKey);
      convId = await ensureConversation(user.id, conversationId, message);
    }

    await prisma.message.createMany({
      data: [
        { conversationId: convId!, role: "user", content: message },
        { conversationId: convId!, role: "assistant", content: reply },
      ],
    });

    const mediaPayload = parseMediaMessage(reply);
    const imageUrl = mediaPayload?.kind === "image" ? mediaPayload.url : null;

    return NextResponse.json({ reply, conversationId: convId, imageUrl });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro no chat";
    const friendly = status === 429
      ? "Limite do provider de IA atingido ou muitas requisições. Revise a conta Groq e tente novamente."
      : status === 402
        ? "O provider de IA recusou a cobrança desta requisição. Revise os créditos da conta Groq."
        : isFalCreditError(err)
          ? getFalFriendlyError(err)
        : message;
    return NextResponse.json({ error: friendly, raw: message }, { status });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const conversationId = req.nextUrl.searchParams.get("conversationId");
    if (!conversationId) throw new ApiError("conversationId é obrigatório", 400);

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: user.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    if (!conversation) throw new ApiError("Conversa não encontrada", 404);

    return NextResponse.json({ conversation });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao carregar conversa";
    return NextResponse.json({ error: message }, { status });
  }
}
