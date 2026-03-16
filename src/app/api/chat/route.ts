import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCountry, requireUser, enforceRulesOrBlock, ApiError } from "@/lib/api-guard";
import { currentMonthKey, canUse, incrementUsage } from "@/lib/usage";
import { prisma } from "@/lib/db";
import { groqChat, groqTranslateToEnglishPrompt } from "@/lib/providers/groq";
import { stabilityGenerateImage } from "@/lib/providers/stability";
import { buildMediaMessage, parseMediaMessage } from "@/lib/media";
import { generateSpeechAudio } from "@/lib/providers/speech";
import { tavilySearch } from "@/lib/providers/tavily";
import { buildOpsMemoryEntry, findRelevantMemories, getUserAgentContext, saveAgentMemory } from "@/lib/agent-memory";
import { getOpsPlaybookContext, isOpsQuery, shouldUseWebResearch } from "@/lib/ops-playbook";

const VIDEO_SUSPENDED_MESSAGE = "A geração de vídeo está temporariamente suspensa para atualização da infraestrutura. Assim que o recurso voltar com estabilidade e créditos dedicados, ele será reativado.";

const schema = z.object({
  message: z.string().min(1),
  conversationId: z.string().nullable().optional(),
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

function stripUrls(text: string) {
  return text.replace(/https?:\/\/\S+/gi, "").replace(/www\.\S+/gi, "").trim();
}

function prepareVideoPrompt(message: string) {
  const basePrompt = cleanGenerativePrompt(message, "video");
  const quotedSpeech = extractQuotedText(basePrompt) || extractQuotedText(message);

  let visualPrompt = stripUrls(basePrompt);
  if (quotedSpeech) {
    visualPrompt = visualPrompt.replace(quotedSpeech, " ");
  }

  visualPrompt = visualPrompt
    .replace(/["“”'']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!visualPrompt) {
    visualPrompt = "um personagem de IA falando diretamente para a câmera em um cenário tecnológico futurista";
  }

  if (/\bfalando\b|\bfala\b|\bdizendo\b|\bdiscurso\b/i.test(basePrompt) && !/\bcâmera\b|\bcamera\b|\bspeaking to camera\b|\bdiretamente para a câmera\b/i.test(visualPrompt)) {
    visualPrompt = `${visualPrompt}, falando diretamente para a câmera`;
  }

  return {
    visualPrompt,
    speechText: quotedSpeech || stripUrls(basePrompt),
    displayPrompt: basePrompt,
  };
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

type WebResearchSnippet = {
  title: string;
  url: string;
  content: string;
};

function buildSettingsContext(personalization: {
  tone?: string;
  traits?: string[];
  instructions?: string;
  nickname?: string;
  occupation?: string;
  about?: string;
}) {
  const parts = [
    personalization.nickname ? `Nome preferido do usuário: ${personalization.nickname}.` : null,
    personalization.occupation ? `Ocupação: ${personalization.occupation}.` : null,
    personalization.about ? `Contexto do usuário: ${personalization.about}.` : null,
    personalization.tone ? `Tom preferido: ${personalization.tone}.` : null,
    personalization.traits?.length ? `Traços preferidos: ${personalization.traits.join(", ")}.` : null,
    personalization.instructions ? `Instruções personalizadas do usuário: ${personalization.instructions}.` : null,
  ].filter(Boolean);

  return parts.join(" ");
}

function formatWebResearch(results: unknown) {
  const records = Array.isArray((results as { results?: unknown[] } | null)?.results)
    ? ((results as { results: unknown[] }).results)
    : Array.isArray((results as { data?: unknown[] } | null)?.data)
      ? ((results as { data: unknown[] }).data)
      : [];

  return records
    .map((item) => {
      const record = item && typeof item === "object" ? item as Record<string, unknown> : null;
      return {
        title: typeof record?.title === "string" ? record.title : "Fonte sem título",
        url: typeof record?.url === "string" ? record.url : "",
        content: typeof record?.content === "string"
          ? record.content
          : typeof record?.snippet === "string"
            ? record.snippet
            : "",
      } satisfies WebResearchSnippet;
    })
    .filter((item) => item.content || item.url)
    .slice(0, 4)
    .map((item, index) => `[${index + 1}] ${item.title} ${item.url}\n${item.content}`)
    .join("\n\n");
}

async function buildResearchContext(message: string, enabled: boolean) {
  if (!enabled || !process.env.TAVILY_API_KEY || !shouldUseWebResearch(message)) return "";

  try {
    const results = await tavilySearch(message);
    const formatted = formatWebResearch(results);
    return formatted ? `Pesquisa externa recente:\n${formatted}` : "";
  } catch {
    return "";
  }
}

async function getConversationContext(userId: string, conversationId?: string) {
  if (!conversationId) return [] as { role: string; content: string }[];

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 8,
      },
    },
  });

  return (conversation?.messages || [])
    .slice()
    .reverse()
    .map((message) => {
      const media = parseMediaMessage(message.content);
      if (media?.kind === "image") {
        return { role: message.role, content: `Imagem gerada anteriormente com prompt: ${media.prompt}` };
      }
      if (media?.kind === "audio") {
        return { role: message.role, content: `Áudio gerado anteriormente com texto: ${media.text}` };
      }
      if (media?.kind === "video") {
        return { role: message.role, content: `Vídeo gerado anteriormente com prompt: ${media.prompt}` };
      }

      const normalized = message.content.replace(/\s+/g, " ").trim();
      const maxCharsPerMessage = 1200;
      return {
        role: message.role,
        content: normalized.length > maxCharsPerMessage
          ? `${normalized.slice(0, maxCharsPerMessage - 1)}…`
          : normalized,
      };
    });
}

function fitMessagesForGroq(messages: { role: string; content: string }[]) {
  if (messages.length === 0) return messages;

  const system = messages[0]?.role === "system" ? messages[0] : null;
  const rest = system ? messages.slice(1) : messages.slice();
  const maxContextMessages = 10;
  const trimmedRest = rest.slice(-maxContextMessages);
  const output = system ? [system, ...trimmedRest] : trimmedRest;

  const maxTotalChars = 15000;
  const countChars = (items: { role: string; content: string }[]) =>
    items.reduce((sum, item) => sum + item.content.length, 0);

  while (output.length > (system ? 2 : 1) && countChars(output) > maxTotalChars) {
    output.splice(system ? 1 : 0, 1);
  }

  if (system && output[0].content.length > 3500) {
    output[0] = { ...output[0], content: `${output[0].content.slice(0, 3499)}…` };
  }

  return output;
}

function systemPrompt(country: string, context: {
  settings: string;
  memories: string;
  opsMode: boolean;
  opsPlaybook: string;
  webResearch: string;
}) {
  return [
    "Você é a HYDRA AI, assistente multimodal, operacional e proativa.",
    `Respeite leis e regras do país de origem: ${country}.`,
    "Seja autogerativa dentro do que o sistema permite: proponha próximos passos, detecte inconsistências, revise a própria resposta antes de enviar e prefira corrigir a causa raiz.",
    "Você pode ter humor leve e inteligente quando combinar com o contexto, sem virar resposta boba.",
    "Quando houver erro técnico, aja como engenheiro sênior: diagnostique, liste hipóteses, indique validações e entregue comandos objetivos.",
    "Quando o assunto for deploy, VPS, PM2, Nginx, Prisma ou variáveis de ambiente, priorize mitigação, rollback seguro, verificação final e prevenção de recorrência.",
    "Se existirem memórias úteis do usuário, use-as. Se houver pesquisa externa, trate-a como contexto atual e cite as conclusões de forma objetiva.",
    "Nunca afirme que executou ações em infraestrutura externa quando isso não ocorreu.",
    "Respeite limites de segurança, não produza conteúdo ilegal ou nocivo.",
    context.settings ? `Contexto do usuário: ${context.settings}` : "",
    context.memories ? `Memórias relevantes:\n${context.memories}` : "",
    context.opsMode ? `Playbook operacional:\n${context.opsPlaybook}` : "",
    context.webResearch ? context.webResearch : "",
  ].filter(Boolean).join("\n\n");
}

async function generateChatReply(messages: { role: string; content: string }[]) {
  if (!process.env.GROQ_API_KEY) {
    throw new ApiError("GROQ_API_KEY ausente", 500);
  }

  const compact = fitMessagesForGroq(messages);

  try {
    return await groqChat(compact);
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    const looksLikeLengthError =
      /reduce the length|invalid_request_error|param\":\"messages\"|parâmetro.*messages|parametro.*messages/i.test(text);

    if (!looksLikeLengthError) {
      throw error;
    }

    const fallback = compact.filter((item) => item.role === "system").slice(0, 1);
    const userOnly = compact.filter((item) => item.role === "user").slice(-1);
    return groqChat([...fallback, ...userOnly]);
  }
}

function buildMemoryContext(memories: { title: string; summary: string }[]) {
  return memories.map((memory) => `- ${memory.title}: ${memory.summary}`).join("\n");
}

function extractOpsResolution(reply: string) {
  const normalized = reply.replace(/\s+/g, " ").trim();
  return normalized.slice(0, 380);
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
    const parsed = schema.parse(body);
    const message = parsed.message;
    const conversationId = parsed.conversationId ?? undefined;

    const user = await requireUser(req);
    const country = await requireCountry(req);

    await enforceRulesOrBlock({ text: message, userId: user.id, country });

    const monthKey = currentMonthKey();
    const quota = await canUse(user, "chat", monthKey);
    if (!quota.allowed) throw new ApiError("Limite de chat atingido para seu plano", 403);

    let reply: string;
    let convId: string;

    if (isVideoRequest(message)) {
      const { visualPrompt, speechText, displayPrompt } = prepareVideoPrompt(message);
      void visualPrompt;
      void speechText;
      reply = VIDEO_SUSPENDED_MESSAGE;

      convId = await ensureConversation(user.id, conversationId, displayPrompt);
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
      const agentContext = await getUserAgentContext(user.id);
      const relevantMemories = agentContext.personalization.memoryHistory === false
        ? []
        : findRelevantMemories(agentContext.memories, message);
      const opsMode = isOpsQuery(message);
      const webResearch = await buildResearchContext(message, agentContext.personalization.webSearch !== false);
      const conversationContext = await getConversationContext(user.id, conversationId);
      const system = systemPrompt(country, {
        settings: buildSettingsContext(agentContext.personalization),
        memories: buildMemoryContext(relevantMemories),
        opsMode,
        opsPlaybook: getOpsPlaybookContext(message),
        webResearch,
      });
      reply = await generateChatReply([
        { role: "system", content: system },
        ...conversationContext,
        { role: "user", content: message },
      ]);

      await incrementUsage(user.id, "chat", monthKey);
      convId = await ensureConversation(user.id, conversationId, message);

      if (opsMode && agentContext.personalization.memorySaved !== false) {
        await saveAgentMemory(user.id, buildOpsMemoryEntry(message, extractOpsResolution(reply))).catch(() => undefined);
      }
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
    const isTooLong = /reduce the length|invalid_request_error|param\":\"messages\"|parâmetro.*messages|parametro.*messages/i.test(message);
    const friendly = status === 429
      ? "Limite do provider de IA atingido ou muitas requisições. Revise a conta Groq e tente novamente."
      : status === 402
        ? "O provider de IA recusou a cobrança desta requisição. Revise os créditos da conta Groq."
        : isTooLong
          ? "A conversa ficou muito longa para o provider de IA. Reduzi o contexto automaticamente; tente reenviar a mensagem."
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
