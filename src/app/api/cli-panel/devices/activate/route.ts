import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, requireUser } from "@/lib/api-guard";
import { activateHydraCyberDevice, assertHydraCyberReady } from "@/lib/hydra-cyber";

const schema = z.object({
  licenseCode: z.string().min(8).max(64),
  deviceName: z.string().min(2).max(80),
  deviceFingerprint: z.string().min(12).max(200),
  platform: z.string().min(2).max(40),
  cliVersion: z.string().min(1).max(32),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    await assertHydraCyberReady(user.id);
    const body = await req.json();
    const parsed = schema.parse(body);
    const activation = await activateHydraCyberDevice({ userId: user.id, ...parsed });
    return NextResponse.json({ activation }, { status: 201 });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao ativar dispositivo";
    return NextResponse.json({ error: message }, { status });
  }
}