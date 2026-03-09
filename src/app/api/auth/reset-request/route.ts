import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { nanoid } from "nanoid";
import { addHours } from "date-fns";
import { buildAppUrl, sendPasswordResetEmail } from "@/lib/mail";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return NextResponse.json({ message: "Se existir conta, um link foi enviado." });

    const token = nanoid(32);
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: addHours(new Date(), 1),
      },
    });

    const baseUrl = buildAppUrl(req.nextUrl.origin);
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
    });

    const payload: { message: string; debugToken?: string } = {
      message: "Se existir conta, um link foi enviado.",
    };
    if (process.env.NODE_ENV !== "production") payload.debugToken = token;
    return NextResponse.json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao solicitar reset";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
