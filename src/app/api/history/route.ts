import { NextRequest, NextResponse } from "next/server";
import { requireUser, ApiError } from "@/lib/api-guard";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const conversations = await prisma.conversation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { messages: { orderBy: { createdAt: "desc" }, take: 2 } },
    });
    return NextResponse.json({ conversations });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao listar histórico";
    return NextResponse.json({ error: message }, { status });
  }
}
