import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRenewalDateForPlan } from "@/lib/plans";

const db = prisma as any;

type AsaasWebhookPayment = {
  id?: string;
  status?: string;
  externalReference?: string | null;
};

type AsaasWebhookBody = {
  event?: string;
  payment?: AsaasWebhookPayment;
};

function isAuthorized(req: NextRequest) {
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  if (!expectedToken) return true;

  const providedToken = req.headers.get("asaas-access-token")?.trim();
  return providedToken === expectedToken;
}

function shouldMarkAsPaid(event?: string, status?: string) {
  const normalizedEvent = (event || "").toUpperCase();
  const normalizedStatus = (status || "").toUpperCase();

  return (
    normalizedEvent === "PAYMENT_RECEIVED" ||
    normalizedEvent === "PAYMENT_CONFIRMED" ||
    normalizedEvent === "PAYMENT_UPDATED" ||
    normalizedStatus === "RECEIVED" ||
    normalizedStatus === "CONFIRMED" ||
    normalizedStatus === "RECEIVED_IN_CASH"
  );
}

function shouldMarkAsFailed(event?: string, status?: string) {
  const normalizedEvent = (event || "").toUpperCase();
  const normalizedStatus = (status || "").toUpperCase();

  return (
    normalizedEvent === "PAYMENT_DELETED" ||
    normalizedEvent === "PAYMENT_REFUNDED" ||
    normalizedEvent === "PAYMENT_OVERDUE" ||
    normalizedStatus === "OVERDUE" ||
    normalizedStatus === "REFUNDED" ||
    normalizedStatus === "DELETED"
  );
}

async function findTransaction(reference: string, asaasPaymentId?: string) {
  const directMatch = await db.paymentTransaction.findUnique({
    where: { id: reference },
    include: { plan: true, user: true },
  });

  if (directMatch) return directMatch;

  const transactions = await db.paymentTransaction.findMany({
    where: { metadata: { not: null } },
    include: { plan: true, user: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return transactions.find((transaction: { metadata?: string | null }) => {
    if (!transaction.metadata) return false;
    try {
      const metadata = JSON.parse(transaction.metadata) as { asaasPaymentId?: string; externalReference?: string };
      return metadata.externalReference === reference || (!!asaasPaymentId && metadata.asaasPaymentId === asaasPaymentId);
    } catch {
      return false;
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Webhook da Asaas não autorizado" }, { status: 401 });
    }

    const body = (await req.json()) as AsaasWebhookBody;
    const event = body.event;
    const payment = body.payment;
    const reference = payment?.externalReference?.trim();

    if (!reference) {
      return NextResponse.json({ ok: true, ignored: true, reason: "externalReference ausente" });
    }

    const transaction = await findTransaction(reference, payment?.id);
    if (!transaction) {
      return NextResponse.json({ ok: true, ignored: true, reason: "transação não encontrada" });
    }

    if (shouldMarkAsPaid(event, payment?.status)) {
      if (transaction.status !== "paid") {
        const renewalAt = getRenewalDateForPlan(transaction.plan.slug);
        const metadata = transaction.metadata
          ? (() => {
              try {
                return JSON.parse(transaction.metadata) as Record<string, unknown>;
              } catch {
                return {};
              }
            })()
          : {};

        await prisma.$transaction([
          db.paymentTransaction.update({
            where: { id: transaction.id },
            data: {
              status: "paid",
              metadata: JSON.stringify({
                ...metadata,
                asaasEvent: event || null,
                asaasPaymentId: payment?.id || null,
                externalReference: reference,
              }),
            },
          }),
          prisma.user.update({
            where: { id: transaction.userId },
            data: { planId: transaction.planId, currentPeriodEndsAt: renewalAt } as any,
          }),
        ]);
      }

      return NextResponse.json({ ok: true, status: "paid" });
    }

    if (shouldMarkAsFailed(event, payment?.status)) {
      await db.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: payment?.status?.toLowerCase() || "failed",
          metadata: JSON.stringify({
            ...(transaction.metadata
              ? (() => {
                  try {
                    return JSON.parse(transaction.metadata) as Record<string, unknown>;
                  } catch {
                    return {};
                  }
                })()
              : {}),
            asaasEvent: event || null,
            asaasPaymentId: payment?.id || null,
            externalReference: reference,
          }),
        },
      });

      return NextResponse.json({ ok: true, status: "updated" });
    }

    return NextResponse.json({ ok: true, ignored: true, reason: "evento sem ação" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao processar webhook da Asaas";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}