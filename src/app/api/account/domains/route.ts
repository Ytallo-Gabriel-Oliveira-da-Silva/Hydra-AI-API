import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, ApiError } from "@/lib/api-guard";
import { prisma } from "@/lib/db";

const domainSchema = z.object({ domain: z.string().trim().min(3).max(120) });

function normalizeDomain(raw: string) {
  const trimmed = raw.trim().toLowerCase();
  const withoutProtocol = trimmed.replace(/^https?:\/\//, "");
  const withoutPath = withoutProtocol.split("/")[0];
  return withoutPath.replace(/\.$/, "");
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const domains = await prisma.domain.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
    return NextResponse.json({ domains: domains.map((d) => d.name) });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao carregar domínios";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { domain } = domainSchema.parse(body);
    const normalized = normalizeDomain(domain);
    await prisma.domain.upsert({
      where: { userId_name: { userId: user.id, name: normalized } },
      update: {},
      create: { name: normalized, userId: user.id },
    });
    return NextResponse.json({ ok: true, domain: normalized });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao salvar domínio";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const parsed = domainSchema.safeParse(body);
    if (!parsed.success) throw new ApiError("Domínio inválido", 400);
    const normalized = normalizeDomain(parsed.data.domain);
    await prisma.domain.deleteMany({ where: { userId: user.id, name: normalized } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao remover domínio";
    return NextResponse.json({ error: message }, { status });
  }
}
