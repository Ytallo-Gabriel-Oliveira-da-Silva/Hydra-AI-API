import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCountry, requireUser, enforceRulesOrBlock, ApiError } from "@/lib/api-guard";
import { currentMonthKey, canUse, incrementUsage } from "@/lib/usage";
import { prisma } from "@/lib/db";
import { groqChat } from "@/lib/providers/groq";

const schema = z.object({
  message: z.string().min(1),
  conversationId: z.string().optional(),
});

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

    const system = systemPrompt(country);
    const reply = await generateChatReply([
      { role: "system", content: system },
      { role: "user", content: message },
    ]);

    await incrementUsage(user.id, "chat", monthKey);

    let convId = conversationId;
    if (!convId) {
      const conv = await prisma.conversation.create({
        data: {
          userId: user.id,
          title: message.slice(0, 60),
          messages: { create: [] },
        },
      });
      convId = conv.id;
    }

    await prisma.message.createMany({
      data: [
        { conversationId: convId!, role: "user", content: message },
        { conversationId: convId!, role: "assistant", content: reply },
      ],
    });

    return NextResponse.json({ reply, conversationId: convId });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro no chat";
    const friendly = status === 429
      ? "Limite do provider de IA atingido ou muitas requisições. Revise a conta Groq e tente novamente."
      : status === 402
        ? "O provider de IA recusou a cobrança desta requisição. Revise os créditos da conta Groq."
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
