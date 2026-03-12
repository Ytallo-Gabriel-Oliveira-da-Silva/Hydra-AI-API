import { NextRequest, NextResponse } from "next/server";
import { ApiError, requireUser } from "@/lib/api-guard";
import { getCliPanelOverview } from "@/lib/platform-panel";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const overview = await getCliPanelOverview(user.id);
    return NextResponse.json(overview);
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao carregar Hydra CLI Panel";
    return NextResponse.json({ error: message }, { status });
  }
}
