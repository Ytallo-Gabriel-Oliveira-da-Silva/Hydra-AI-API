import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, requireUser } from "@/lib/api-guard";
import { createApiKeyForUser, getApiPanelOverview } from "@/lib/platform-panel";

const schema = z.object({
  name: z.string().min(3).max(50),
  scopes: z.array(z.enum(["text", "image", "audio"])) .min(1),
  expiresAt: z.string().datetime().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const overview = await getApiPanelOverview(user.id);
    return NextResponse.json({ keys: overview.keys });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao listar chaves";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const parsed = schema.parse(body);
    const created = await createApiKeyForUser({
      userId: user.id,
      name: parsed.name,
      scopes: parsed.scopes,
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao criar chave";
    return NextResponse.json({ error: message }, { status });
  }
}
