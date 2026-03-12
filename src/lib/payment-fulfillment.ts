import { addMonths } from "date-fns";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { getCliLicenseTier } from "@/lib/billing-products";
import { getNextAccessEndForPlan } from "@/lib/plans";

const db = prisma as any;

type TransactionWithRelations = {
  id: string;
  userId: string;
  planId: string | null;
  productType: string;
  productRef: string | null;
  displayName: string | null;
  paymentMethod: string;
  amount: number;
  creditsGranted: number;
  currency: string;
  status: string;
  metadata: string | null;
  user: { currentPeriodEndsAt: Date | null } | null;
  plan: { slug: string } | null;
};

function parseMetadata(metadata?: string | null) {
  if (!metadata) return {} as Record<string, unknown>;
  try {
    return JSON.parse(metadata) as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

function mergeMetadata(existing: string | null | undefined, next: Record<string, unknown>) {
  return JSON.stringify({ ...parseMetadata(existing), ...next });
}

function buildLicenseCode() {
  return `HYDRA-CLI-${nanoid(4).toUpperCase()}-${nanoid(4).toUpperCase()}-${nanoid(4).toUpperCase()}`;
}

export async function fulfillPaymentTransaction(transactionId: string, event?: string | null) {
  const transaction = await prisma.paymentTransaction.findUnique({
    where: { id: transactionId },
    include: {
      user: { select: { currentPeriodEndsAt: true } },
      plan: { select: { slug: true } },
    },
  }) as TransactionWithRelations | null;

  if (!transaction) throw new Error("Transação não encontrada");
  if (transaction.status === "paid") return transaction;

  if (transaction.productType === "plan") {
    if (!transaction.planId || !transaction.plan) throw new Error("Plano da transação não encontrado");
    const renewalAt = getNextAccessEndForPlan(transaction.plan.slug, transaction.user?.currentPeriodEndsAt || null);

    const claimedPlan = await db.paymentTransaction.updateMany({
      where: { id: transaction.id, status: { not: "paid" } },
      data: { status: "paid", metadata: mergeMetadata(transaction.metadata, { asaasEvent: event || null }) },
    });
    if (claimedPlan.count === 0) {
      return prisma.paymentTransaction.findUnique({ where: { id: transaction.id }, include: { plan: true, user: true } });
    }
    await prisma.user.update({
      where: { id: transaction.userId },
      data: { planId: transaction.planId, currentPeriodEndsAt: renewalAt },
    });

    return prisma.paymentTransaction.findUnique({ where: { id: transaction.id }, include: { plan: true, user: true } });
  }

  if (transaction.productType === "api_credit") {
    // Atomic claim: only the first caller to arrive here processes the settlement.
    // If two concurrent requests (webhook + polling) both pass the status === "paid"
    // guard above, this updateMany ensures only one proceeds and credits the wallet.
    const claimedCredit = await db.paymentTransaction.updateMany({
      where: { id: transaction.id, status: { not: "paid" } },
      data: { status: "paid", metadata: mergeMetadata(transaction.metadata, { asaasEvent: event || null }) },
    });
    if (claimedCredit.count === 0) {
      return prisma.paymentTransaction.findUnique({ where: { id: transaction.id }, include: { plan: true, user: true } });
    }

    const wallet = await prisma.creditWallet.upsert({
      where: { userId: transaction.userId },
      update: {},
      create: {
        userId: transaction.userId,
        currency: transaction.currency,
        balanceCents: 0,
        creditBalance: 0,
      },
    });

    await prisma.$transaction([
      prisma.creditWallet.update({
        where: { id: wallet.id },
        data: {
          balanceCents: { increment: transaction.amount * 100 },
          creditBalance: { increment: transaction.creditsGranted },
        },
      }),
      prisma.creditLedgerEntry.create({
        data: {
          walletId: wallet.id,
          userId: transaction.userId,
          kind: "recharge",
          description: transaction.displayName || "Recarga de créditos Hydra API",
          amountCents: transaction.amount * 100,
          credits: transaction.creditsGranted,
          referenceType: "payment_transaction",
          referenceId: transaction.id,
          metadata: mergeMetadata(transaction.metadata, { productRef: transaction.productRef }),
        },
      }),
    ]);

    return prisma.paymentTransaction.findUnique({ where: { id: transaction.id }, include: { plan: true, user: true } });
  }

  if (transaction.productType === "cli_license") {
    const tier = getCliLicenseTier(transaction.productRef || "");
    if (!tier) throw new Error("Produto de licença CLI inválido");

    // Atomic claim before creating the license — prevents duplicate issuance on
    // concurrent webhook + polling calls.
    const claimedLicense = await db.paymentTransaction.updateMany({
      where: { id: transaction.id, status: { not: "paid" } },
      data: { status: "paid_pending_license" },
    });
    if (claimedLicense.count === 0) {
      return prisma.paymentTransaction.findUnique({ where: { id: transaction.id }, include: { plan: true, user: true } });
    }

    const existingLicense = await prisma.cliLicense.findFirst({
      where: {
        userId: transaction.userId,
        metadata: { contains: transaction.id },
      },
    });

    const license = existingLicense || await prisma.cliLicense.create({
      data: {
        userId: transaction.userId,
        code: buildLicenseCode(),
        status: "active",
        tier: tier.id,
        seatLimit: tier.seatLimit,
        deviceLimit: tier.deviceLimit,
        updatesUntil: addMonths(new Date(), tier.updatesMonths),
        activatedAt: new Date(),
        metadata: JSON.stringify({ sourceTransactionId: transaction.id, productRef: transaction.productRef }),
      },
    });

    await db.paymentTransaction.updateMany({
      where: { id: transaction.id },
      data: {
        status: "paid",
        metadata: mergeMetadata(transaction.metadata, {
          asaasEvent: event || null,
          issuedLicenseId: license.id,
          issuedLicenseCode: license.code,
        }),
      },
    });

    return prisma.paymentTransaction.findUnique({ where: { id: transaction.id }, include: { plan: true, user: true } });
  }

  throw new Error("Tipo de produto não suportado na liquidação");
}

export function serializeBillingTransaction(transaction: {
  id: string;
  status: string;
  paymentMethod: string;
  amount: number;
  paymentLink: string | null;
  pixCode: string | null;
  expiresAt: Date | null;
  metadata?: string | null;
  displayName?: string | null;
  productType?: string;
  productRef?: string | null;
  creditsGranted?: number;
}) {
  const metadata = parseMetadata(transaction.metadata);
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
    displayName: transaction.displayName || null,
    productType: transaction.productType || "plan",
    productRef: transaction.productRef || null,
    creditsGranted: transaction.creditsGranted || 0,
    issuedLicenseCode: typeof metadata.issuedLicenseCode === "string" ? metadata.issuedLicenseCode : null,
  };
}

export function parsePaymentMetadata(metadata?: string | null) {
  return parseMetadata(metadata);
}
