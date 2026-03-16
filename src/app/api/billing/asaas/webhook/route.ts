import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fulfillPaymentTransaction } from "@/lib/payment-fulfillment";
import { securityAuditLog } from "@/lib/security-audit";

const db = prisma as any;

type AsaasWebhookPayment = {
  id?: string;
  status?: string;
  externalReference?: string | null;
};

type AsaasWebhookCheckout = {
  id?: string;
  status?: string;
  link?: string | null;
};

type AsaasWebhookBody = {
  event?: string;
  payment?: AsaasWebhookPayment;
  checkout?: AsaasWebhookCheckout;
};

function isAuthorized(req: NextRequest) {
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  if (!expectedToken) {
    return process.env.NODE_ENV !== "production";
  }

  const providedToken = req.headers.get("asaas-access-token")?.trim()
    || req.headers.get("x-asaas-access-token")?.trim();
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

async function findTransactionByCheckoutId(checkoutId: string) {
  const transactions = await db.paymentTransaction.findMany({
    where: { metadata: { not: null } },
    include: { plan: true, user: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return transactions.find((transaction: { metadata?: string | null }) => {
    if (!transaction.metadata) return false;
    try {
      const metadata = JSON.parse(transaction.metadata) as { asaasCheckoutId?: string };
      return metadata.asaasCheckoutId === checkoutId;
    } catch {
      return false;
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      securityAuditLog({
        event: "billing.asaas_webhook.unauthorized",
        level: "warn",
        req,
        details: {
          hasConfiguredToken: Boolean(process.env.ASAAS_WEBHOOK_TOKEN),
          hasAsaasAccessTokenHeader: Boolean(req.headers.get("asaas-access-token")),
          hasXAsaasAccessTokenHeader: Boolean(req.headers.get("x-asaas-access-token")),
        },
      });

      return NextResponse.json(
        {
          error: process.env.ASAAS_WEBHOOK_TOKEN
            ? "Webhook da Asaas não autorizado"
            : "ASaas webhook token ausente em produção",
        },
        { status: 401 },
      );
    }

    const body = (await req.json()) as AsaasWebhookBody;
    const event = body.event;
    const payment = body.payment;
    const checkout = body.checkout;

    if ((event || "").toUpperCase().startsWith("CHECKOUT_")) {
      const checkoutId = checkout?.id?.trim();
      if (!checkoutId) {
        securityAuditLog({
          event: "billing.asaas_webhook.checkout_missing_id",
          level: "warn",
          req,
          details: { event: event || null },
        });
        return NextResponse.json({ ok: true, ignored: true, reason: "checkout.id ausente" });
      }

      const transaction = await findTransactionByCheckoutId(checkoutId);
      if (!transaction) {
        securityAuditLog({
          event: "billing.asaas_webhook.checkout_not_found",
          level: "warn",
          req,
          details: {
            event: event || null,
            checkoutId,
          },
        });
        return NextResponse.json({ ok: true, ignored: true, reason: "checkout não encontrado" });
      }

      const metadata = transaction.metadata
        ? (() => {
            try {
              return JSON.parse(transaction.metadata) as Record<string, unknown>;
            } catch {
              return {};
            }
          })()
        : {};

      if ((event || "").toUpperCase() === "CHECKOUT_PAID") {
        if (transaction.status !== "paid") {
          await db.paymentTransaction.update({
            where: { id: transaction.id },
            data: {
              metadata: JSON.stringify({
                ...metadata,
                asaasCheckoutId: checkoutId,
                asaasCheckoutStatus: checkout?.status || "PAID",
                asaasCheckoutUrl: checkout?.link || metadata.asaasCheckoutUrl || null,
                asaasEvent: event || null,
              }),
            },
          });
          await fulfillPaymentTransaction(transaction.id, event || null);
        }

        return NextResponse.json({ ok: true, status: "paid" });
      }

      if ((event || "").toUpperCase() === "CHECKOUT_CANCELED" || (event || "").toUpperCase() === "CHECKOUT_EXPIRED") {
        await db.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: (event || "").toUpperCase() === "CHECKOUT_EXPIRED" ? "expired" : "canceled",
            metadata: JSON.stringify({
              ...metadata,
              asaasCheckoutId: checkoutId,
              asaasCheckoutStatus: checkout?.status || null,
              asaasCheckoutUrl: checkout?.link || metadata.asaasCheckoutUrl || null,
              asaasEvent: event || null,
            }),
          },
        });

        return NextResponse.json({ ok: true, status: "updated" });
      }

      return NextResponse.json({ ok: true, ignored: true, reason: "evento de checkout sem ação" });
    }

    const reference = payment?.externalReference?.trim();

    if (!reference) {
      securityAuditLog({
        event: "billing.asaas_webhook.reference_missing",
        level: "warn",
        req,
        details: {
          event: event || null,
          paymentId: payment?.id || null,
        },
      });
      return NextResponse.json({ ok: true, ignored: true, reason: "externalReference ausente" });
    }

    const transaction = await findTransaction(reference, payment?.id);
    if (!transaction) {
      securityAuditLog({
        event: "billing.asaas_webhook.transaction_not_found",
        level: "warn",
        req,
        details: {
          event: event || null,
          reference,
          paymentId: payment?.id || null,
        },
      });
      return NextResponse.json({ ok: true, ignored: true, reason: "transação não encontrada" });
    }

    if (shouldMarkAsPaid(event, payment?.status)) {
      if (transaction.status !== "paid") {
        const metadata = transaction.metadata
          ? (() => {
              try {
                return JSON.parse(transaction.metadata) as Record<string, unknown>;
              } catch {
                return {};
              }
            })()
          : {};

        await db.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            metadata: JSON.stringify({
              ...metadata,
              asaasEvent: event || null,
              asaasPaymentId: payment?.id || null,
              externalReference: reference,
            }),
          },
        });
        await fulfillPaymentTransaction(transaction.id, event || null);
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
    securityAuditLog({
      event: "billing.asaas_webhook.error",
      level: "error",
      req,
      details: {
        reason: message,
      },
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}