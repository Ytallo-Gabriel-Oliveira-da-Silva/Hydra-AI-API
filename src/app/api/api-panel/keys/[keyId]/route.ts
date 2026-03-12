import { NextRequest, NextResponse } from "next/server";
import { ApiError, requireUser } from "@/lib/api-guard";
import { revokeApiKeyForUser } from "@/lib/platform-panel";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ keyId: string }> },
) {
  try {
    const user = await requireUser(req);
    const { keyId } = await params;
    await revokeApiKeyForUser(user.id, keyId);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao atualizar chave";
    return NextResponse.json({ error: message }, { status });
  }
}
