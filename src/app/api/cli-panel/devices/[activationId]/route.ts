import { NextRequest, NextResponse } from "next/server";
import { ApiError, requireUser } from "@/lib/api-guard";
import { revokeCliDeviceActivation } from "@/lib/platform-panel";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ activationId: string }> },
) {
  try {
    const user = await requireUser(req);
    const { activationId } = await params;
    await revokeCliDeviceActivation(user.id, activationId);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao revogar dispositivo";
    return NextResponse.json({ error: message }, { status });
  }
}
