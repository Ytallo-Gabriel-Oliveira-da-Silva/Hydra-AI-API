import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addMinutes } from "date-fns";
import { requireUser, ApiError } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { getPlanAmount } from "@/lib/plans";

const db = prisma as any;

const schema = z.object({
  planSlug: z.string().min(2),
  paymentMethod: z.enum(["pix", "credit", "debit"]),
  installments: z.number().int().min(1).max(12).optional(),
  cardholderName: z.string().trim().min(2).optional(),
  cardNumber: z.string().trim().min(12).max(19).optional(),
  expiry: z.string().trim().min(4).optional(),
  cvv: z.string().trim().min(3).max(4).optional(),
});

function buildPixCode(planSlug: string, userId: string) {
  return `00020126580014BR.GOV.BCB.PIX0136hydra-${planSlug}-${userId}5204000053039865406100.005802BR5920HYDRA AI MOCK6009SAO PAULO62070503***6304ABCD`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const parsed = schema.parse(body);
    const plan = await prisma.plan.findUnique({ where: { slug: parsed.planSlug } });
    if (!plan) throw new ApiError("Plano não encontrado", 404);
    if (plan.slug === "free") throw new ApiError("Plano Free não requer pagamento", 400);

    const amount = getPlanAmount(plan.monthlyPrice, plan.yearlyPrice, plan.slug);
    const expiresAt = parsed.paymentMethod === "pix" ? addMinutes(new Date(), 15) : null;
    const pixCode = parsed.paymentMethod === "pix" ? buildPixCode(plan.slug, user.id) : null;
    const paymentLink = parsed.paymentMethod === "pix" ? `https://pay.hydra.local/checkout/${plan.slug}/${user.id}` : null;

    const transaction = await db.paymentTransaction.create({
      data: {
        userId: user.id,
        planId: plan.id,
        paymentMethod: parsed.paymentMethod,
        amount,
        installments: parsed.paymentMethod === "credit" ? parsed.installments || 1 : null,
        status: parsed.paymentMethod === "pix" ? "pending" : "authorized",
        paymentLink,
        pixCode,
        expiresAt,
        metadata: JSON.stringify({
          cardholderName: parsed.cardholderName || null,
          last4: parsed.cardNumber ? parsed.cardNumber.slice(-4) : null,
        }),
      },
    });

    return NextResponse.json({
      transaction: {
        id: transaction.id,
        status: transaction.status,
        paymentMethod: transaction.paymentMethod,
        amount: transaction.amount,
        installments: transaction.installments,
        paymentLink: transaction.paymentLink,
        pixCode: transaction.pixCode,
        expiresAt: transaction.expiresAt,
      },
    });
  } catch (error: unknown) {
    const status = error instanceof ApiError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Erro ao iniciar pagamento";
    return NextResponse.json({ error: message }, { status });
  }
}
