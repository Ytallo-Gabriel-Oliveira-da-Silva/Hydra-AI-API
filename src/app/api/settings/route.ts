import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, ApiError } from "@/lib/api-guard";
import { prisma } from "@/lib/db";

const payloadSchema = z.record(z.string(), z.unknown());

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });
    return NextResponse.json({ settings: settings ? JSON.parse(settings.payload) : null });
  } catch (error: unknown) {
    const status = error instanceof ApiError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Erro ao carregar configurações";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const settings = payloadSchema.parse(body.settings);
    await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: { payload: JSON.stringify(settings) },
      create: { userId: user.id, payload: JSON.stringify(settings) },
    });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const status = error instanceof ApiError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Erro ao salvar configurações";
    return NextResponse.json({ error: message }, { status });
  }
}
