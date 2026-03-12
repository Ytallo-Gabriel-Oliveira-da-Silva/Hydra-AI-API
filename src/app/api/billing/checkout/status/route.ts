import { NextRequest, NextResponse } from "next/server";
import { requireUser, ApiError } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { getAsaasPayment, isAsaasStatusFailed, isAsaasStatusPaid } from "@/lib/asaas";
import { fulfillPaymentTransaction, parsePaymentMetadata, serializeBillingTransaction } from "@/lib/payment-fulfillment";

const db = prisma as any;

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

    let metadata = parsePaymentMetadata(transaction.metadata);
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
        await db.paymentTransaction.update({
          where: { id: transaction.id },
          data: { metadata: JSON.stringify(metadata) },
        });
        await fulfillPaymentTransaction(transaction.id, typeof metadata.asaasEvent === "string" ? metadata.asaasEvent : "PAYMENT_STATUS_SYNC");
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
      metadata = parsePaymentMetadata(transaction.metadata);
    }

    return NextResponse.json({ transaction: serializeBillingTransaction(transaction) });
  } catch (error: unknown) {
    const status = error instanceof ApiError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Erro ao consultar pagamento";
    return NextResponse.json({ error: message }, { status });
  }
}