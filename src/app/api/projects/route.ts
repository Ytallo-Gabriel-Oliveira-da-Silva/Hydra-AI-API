import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, ApiError } from "@/lib/api-guard";
import { prisma } from "@/lib/db";

const createSchema = z.object({ name: z.string().min(2), status: z.string().default("Ativo"), progress: z.number().int().min(0).max(100).default(0) });

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const projects = await prisma.project.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ projects });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao listar projetos";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const data = createSchema.parse(body);
    const created = await prisma.project.create({ data: { ...data, userId: user.id } });
    return NextResponse.json({ project: created });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao criar projeto";
    return NextResponse.json({ error: message }, { status });
  }
}
