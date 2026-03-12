import { NextRequest, NextResponse } from "next/server";
import { requireUser, ApiError } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { getAsaasPayment, isAsaasStatusFailed, isAsaasStatusPaid } from "@/lib/asaas";
import { fulfillPaymentTransaction, parsePaymentMetadata, serializeBillingTransaction } from "@/lib/payment-fulfillment";

const db = prisma as any;

// Returns true if a Pix window has closed without payment.
// Only evaluated AFTER Asaas is consulted so a last-second payment is never blocked.
function isPixPastDue(t: { paymentMethod: string; status: string; expiresAt: Date | null }) {
  return (
    t.paymentMethod === "pix" &&
    !["paid", "expired"].includes(t.status) &&
    !!t.expiresAt &&
    t.expiresAt < new Date()
  );
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const transactionId = req.nextUrl.searchParams.get("transactionId")?.trim();
    if (!transactionId) throw new ApiError("transactionId \u00e9 obrigat\u00f3rio", 400);

    let transaction = await db.paymentTransaction.findFirst({
      where: { id: transactionId, userId: user.id },
      include: { plan: true, user: true },
    });

    if (!transaction) throw new ApiError("Pagamento n\u00e3o encontrado", 404);

    let metadata = parsePaymentMetadata(transaction.metadata);
    const asaasPaymentId = typeof metadata.asaasPaymentId === "string" ? metadata.asaasPaymentId : null;

    if (asaasPaymentId && !["paid", "expired"].includes(transaction.status)) {
      // Always check Asaas FIRST before applying local expiry.
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
        // Asaas confirms not paid. Only now apply local expiry if window closed.
        const pastDue = isPixPastDue(transaction);
        await db.paymentTransaction.update({
          where: { id: transaction.id },
          data: { status: pastDue ? "expired" : transaction.status, metadata: JSON.stringify(metadata) },
        });
      }

      transaction = await db.paymentTransaction.findFirst({
        where: { id: transactionId, userId: user.id },
        include: { plan: true, user: true },
      });
      if (!transaction) throw new ApiError("Pagamento n\u00e3o encontrado", 404);
      metadata = parsePaymentMetadata(transaction.metadata);
    } else if (!asaasPaymentId && isPixPastDue(transaction)) {
      // No Asaas charge registered yet, safe to expire locally
      transaction = await db.paymentTransaction.update({
        where: { id: transaction.id },
        data: { status: "expired" },
        include: { plan: true, user: true },
      });
    }

    return NextResponse.json({ transaction: serializeBillingTransaction(transaction) });
  } catch (error: unknown) {
    const status = error instanceof ApiError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Erro ao consultar pagamento";
    return NextResponse.json({ error: message }, { status });
  }
}
