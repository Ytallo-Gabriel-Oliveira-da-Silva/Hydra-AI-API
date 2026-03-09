import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, ApiError } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { getRenewalDateForPlan } from "@/lib/plans";

const db = prisma as any;

const schema = z.object({ transactionId: z.string().min(2) });

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { transactionId } = schema.parse(body);

    const transaction = await db.paymentTransaction.findFirst({
      where: { id: transactionId, userId: user.id },
      include: { plan: true },
    });

    if (!transaction) throw new ApiError("Pagamento não encontrado", 404);
    if (transaction.status === "paid") {
      return NextResponse.json({ ok: true, renewalAt: (user as { currentPeriodEndsAt?: Date | null }).currentPeriodEndsAt, planSlug: transaction.plan.slug });
    }
    if (transaction.paymentMethod === "pix" && transaction.expiresAt && transaction.expiresAt < new Date()) {
      await db.paymentTransaction.update({ where: { id: transaction.id }, data: { status: "expired" } });
      throw new ApiError("O QR Code expirou. Gere um novo pagamento Pix.", 400);
    }

    const renewalAt = getRenewalDateForPlan(transaction.plan.slug);

    await prisma.$transaction([
      db.paymentTransaction.update({ where: { id: transaction.id }, data: { status: "paid" } }),
      prisma.user.update({
        where: { id: user.id },
        data: { planId: transaction.planId, currentPeriodEndsAt: renewalAt } as any,
      }),
    ]);

    return NextResponse.json({
      ok: true,
      planSlug: transaction.plan.slug,
      planName: transaction.plan.name,
      renewalAt,
    });
  } catch (error: unknown) {
    const status = error instanceof ApiError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Erro ao confirmar pagamento";
    return NextResponse.json({ error: message }, { status });
  }
}
