import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, requireUser } from "@/lib/api-guard";
import { heartbeatHydraCyberDevice } from "@/lib/hydra-cyber";

const schema = z.object({
  activationId: z.string().min(8),
  cliVersion: z.string().min(1).max(32).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const parsed = schema.parse(body);
    const heartbeat = await heartbeatHydraCyberDevice({ userId: user.id, ...parsed });
    return NextResponse.json({ heartbeat });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao atualizar heartbeat do dispositivo";
    return NextResponse.json({ error: message }, { status });
  }
}