import { NextRequest, NextResponse } from "next/server";
import { requireUser, ApiError } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { getNextAccessEndForPlan } from "@/lib/plans";
import { getAsaasPayment, isAsaasStatusFailed, isAsaasStatusPaid } from "@/lib/asaas";

const db = prisma as any;

function parseMetadata(metadata?: string | null) {
  if (!metadata) return {} as Record<string, unknown>;
  try {
    return JSON.parse(metadata) as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

function serializeTransaction(transaction: any, metadata: Record<string, unknown>) {
  return {
    id: transaction.id,
    status: transaction.status,
    paymentMethod: transaction.paymentMethod,
    amount: transaction.amount,
    paymentLink: transaction.paymentLink,
    pixCode: transaction.pixCode,
    expiresAt: transaction.expiresAt,
    pixQrCodeImage: typeof metadata.pixQrCodeImage === "string" ? metadata.pixQrCodeImage : null,
    checkoutUrl: typeof metadata.asaasCheckoutUrl === "string" ? metadata.asaasCheckoutUrl : transaction.paymentLink,
    asaasStatus: typeof metadata.asaasStatus === "string" ? metadata.asaasStatus : null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const transactionId = req.nextUrl.searchParams.get("transactionId")?.trim();
    if (!transactionId) throw new ApiError("transactionId é obrigatório", 400);

    let transaction = await db.paymentTransaction.findFirst({
      where: { id: transactionId, userId: user.id },
      include: { plan: true, user: true },
    });

    if (!transaction) throw new ApiError("Pagamento não encontrado", 404);

    let metadata = parseMetadata(transaction.metadata);
    const asaasPaymentId = typeof metadata.asaasPaymentId === "string" ? metadata.asaasPaymentId : null;

    if (transaction.paymentMethod === "pix" && transaction.status !== "paid" && transaction.expiresAt && transaction.expiresAt < new Date()) {
      transaction = await db.paymentTransaction.update({
        where: { id: transaction.id },
        data: { status: "expired" },
        include: { plan: true, user: true },
      });
    }

    if (asaasPaymentId && transaction.status !== "paid" && transaction.status !== "expired") {
      const payment = await getAsaasPayment(asaasPaymentId);
      metadata = {
        ...metadata,
        asaasStatus: payment.status || null,
        asaasPaymentId: payment.id,
        externalReference: payment.externalReference || metadata.externalReference || transaction.id,
      };

      if (isAsaasStatusPaid(payment.status)) {
        const renewalAt = getNextAccessEndForPlan(transaction.plan.slug, transaction.user.currentPeriodEndsAt);
        await prisma.$transaction([
          db.paymentTransaction.update({
            where: { id: transaction.id },
            data: { status: "paid", metadata: JSON.stringify(metadata) },
          }),
          prisma.user.update({
            where: { id: transaction.userId },
            data: { planId: transaction.planId, currentPeriodEndsAt: renewalAt } as any,
          }),
        ]);
      } else if (isAsaasStatusFailed(payment.status)) {
        await db.paymentTransaction.update({
          where: { id: transaction.id },
          data: { status: String(payment.status || "failed").toLowerCase(), metadata: JSON.stringify(metadata) },
        });
      } else {
        await db.paymentTransaction.update({
          where: { id: transaction.id },
          data: { metadata: JSON.stringify(metadata) },
        });
      }

      transaction = await db.paymentTransaction.findFirst({
        where: { id: transactionId, userId: user.id },
        include: { plan: true, user: true },
      });
      if (!transaction) throw new ApiError("Pagamento não encontrado", 404);
      metadata = parseMetadata(transaction.metadata);
    }

    return NextResponse.json({ transaction: serializeTransaction(transaction, metadata) });
  } catch (error: unknown) {
    const status = error instanceof ApiError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Erro ao consultar pagamento";
    return NextResponse.json({ error: message }, { status });
  }
}