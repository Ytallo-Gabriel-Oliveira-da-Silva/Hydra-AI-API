import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, ApiError } from "@/lib/api-guard";
import { prisma } from "@/lib/db";

const createSchema = z.object({ title: z.string().min(2), summary: z.string().optional() });

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const investigations = await prisma.investigation.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ investigations });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao listar investigações";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const data = createSchema.parse(body);
    const created = await prisma.investigation.create({ data: { ...data, userId: user.id } });
    return NextResponse.json({ investigation: created });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao criar investigação";
    return NextResponse.json({ error: message }, { status });
  }
}
