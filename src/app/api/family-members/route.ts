import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, ApiError } from "@/lib/api-guard";
import { prisma } from "@/lib/db";

const db = prisma as any;

const memberSchema = z.object({ value: z.string().trim().min(2).max(160) });

function parseMember(value: string) {
  const normalized = value.trim();
  const isEmail = normalized.includes("@");
  return {
    name: isEmail ? normalized.split("@")[0] : normalized,
    email: isEmail ? normalized.toLowerCase() : null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const members = await db.familyMember.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
    return NextResponse.json({
      members: members.map((member: { email?: string | null; name: string }) => member.email || member.name),
    });
  } catch (error: unknown) {
    const status = error instanceof ApiError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Erro ao carregar membros";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { value } = memberSchema.parse(body);
    const member = parseMember(value);
    const existing = await db.familyMember.findFirst({ where: { userId: user.id, name: member.name } });
    if (existing) {
      await db.familyMember.update({ where: { id: existing.id }, data: { email: member.email || undefined } });
    } else {
      await db.familyMember.create({ data: { userId: user.id, name: member.name, email: member.email || undefined } });
    }
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const status = error instanceof ApiError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Erro ao salvar membro";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { value } = memberSchema.parse(body);
    const member = parseMember(value);
    await db.familyMember.deleteMany({ where: { userId: user.id, name: member.name } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const status = error instanceof ApiError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Erro ao remover membro";
    return NextResponse.json({ error: message }, { status });
  }
}
