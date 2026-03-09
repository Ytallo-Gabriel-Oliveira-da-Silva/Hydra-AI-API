import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, ApiError } from "@/lib/api-guard";
import { prisma } from "@/lib/db";

function normalizeDomain(raw: string) {
  const trimmed = raw.trim().toLowerCase();
  const withoutProtocol = trimmed.replace(/^https?:\/\//, "");
  const withoutPath = withoutProtocol.split("/")[0];
  return withoutPath.replace(/\.$/, "");
}

const integrationSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    apiKey: z.string().trim().max(500).optional().or(z.literal("")),
    domain: z.string().trim().max(120).optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (!value.apiKey && !value.domain) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["apiKey"],
        message: "Informe uma API key ou um domínio",
      });
    }
  });

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const integrations = await prisma.integration.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
    return NextResponse.json({
      integrations: integrations.map((i) => ({
        name: i.name,
        domain: i.domain,
        hasKey: !!i.apiKey,
      })),
    });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao carregar integrações";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { name, apiKey, domain } = integrationSchema.parse(body);
    await prisma.integration.upsert({
      where: { userId_name: { userId: user.id, name } },
      update: {
        apiKey: apiKey || null,
        domain: domain ? normalizeDomain(domain) : null,
      },
      create: {
        name,
        apiKey: apiKey || null,
        domain: domain ? normalizeDomain(domain) : null,
        userId: user.id,
      },
    });
    return NextResponse.json({ ok: true, name });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao salvar integração";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const parsed = z.object({ name: z.string().trim().min(2).max(120) }).safeParse(body);
    if (!parsed.success) throw new ApiError("Nome da integração inválido", 400);
    await prisma.integration.deleteMany({ where: { userId: user.id, name: parsed.data.name } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao remover integração";
    return NextResponse.json({ error: message }, { status });
  }
}
