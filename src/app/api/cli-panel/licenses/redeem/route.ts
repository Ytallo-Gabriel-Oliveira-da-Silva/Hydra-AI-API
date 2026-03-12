import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, requireUser } from "@/lib/api-guard";
import { redeemCliLicenseCode } from "@/lib/platform-panel";

const schema = z.object({
  code: z.string().min(8).max(64),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const parsed = schema.parse(body);
    const license = await redeemCliLicenseCode(user.id, parsed.code);
    return NextResponse.json({ license }, { status: 201 });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao ativar licença";
    return NextResponse.json({ error: message }, { status });
  }
}
