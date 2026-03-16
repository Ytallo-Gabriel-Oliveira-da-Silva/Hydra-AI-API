import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const tierCatalog = {
  "cli-starter": { seatLimit: 1, deviceLimit: 1, updatesMonths: 12 },
  "cli-pro": { seatLimit: 1, deviceLimit: 3, updatesMonths: 12 },
  "cli-team": { seatLimit: 5, deviceLimit: 15, updatesMonths: 12 },
  "cli-enterprise": { seatLimit: 20, deviceLimit: 80, updatesMonths: 12 },
};

export function loadDotEnvIfNeeded() {
  if (process.env.DATABASE_URL) return;

  const candidates = [
    ".env",
    ".env.local",
    ".env.production",
    ".env.production.local",
  ];

  for (const file of candidates) {
    const envPath = join(process.cwd(), file);
    if (!existsSync(envPath)) continue;

    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const idx = trimmed.indexOf("=");
      if (idx <= 0) continue;

      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }

    if (process.env.DATABASE_URL) return;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL nao definido. Configure no ambiente ou em .env/.env.local/.env.production");
  }
}

export function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith("--")) continue;

    const key = item.slice(2);
    const next = argv[i + 1];
    out[key] = next && !next.startsWith("--") ? next : true;
  }
  return out;
}

export function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function buildLicenseCode() {
  const block = () => randomBytes(3).toString("hex").toUpperCase();
  return `HYDRA-CLI-${block()}-${block()}-${block()}`;
}

export async function getUserByEmailOrThrow(prisma, email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) throw new Error("Parametro obrigatorio: --email");

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) throw new Error(`Usuario nao encontrado: ${normalizedEmail}`);
  return user;
}

export async function ensureLicenseForUser(prisma, {
  userId,
  tier,
  status = "active",
  forceNew = false,
  metadata = {},
}) {
  if (!tierCatalog[tier]) {
    throw new Error(`Tier invalido: ${tier}. Use: ${Object.keys(tierCatalog).join(", ")}`);
  }

  if (!forceNew) {
    const existingActive = await prisma.cliLicense.findFirst({
      where: {
        userId,
        tier,
        status: "active",
        OR: [{ updatesUntil: null }, { updatesUntil: { gt: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingActive) {
      return { reused: true, license: existingActive };
    }
  }

  const tierData = tierCatalog[tier];
  const created = await prisma.cliLicense.create({
    data: {
      userId,
      code: buildLicenseCode(),
      status,
      tier,
      seatLimit: tierData.seatLimit,
      deviceLimit: tierData.deviceLimit,
      updatesUntil: addMonths(new Date(), tierData.updatesMonths),
      activatedAt: status === "active" ? new Date() : null,
      metadata: JSON.stringify({
        source: "admin-test-script",
        ...metadata,
      }),
    },
  });

  return { reused: false, license: created };
}

export async function grantTestCredits(prisma, {
  userId,
  credits,
  amountCents = 0,
  description,
  source,
}) {
  const normalizedCredits = Number(credits);
  const normalizedAmountCents = Number(amountCents);

  if (!Number.isInteger(normalizedCredits) || normalizedCredits <= 0) {
    throw new Error("--credits precisa ser um inteiro maior que zero");
  }

  if (!Number.isInteger(normalizedAmountCents) || normalizedAmountCents < 0) {
    throw new Error("--amount-cents precisa ser um inteiro maior ou igual a zero");
  }

  const wallet = await prisma.creditWallet.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      currency: "BRL",
      balanceCents: 0,
      creditBalance: 0,
    },
  });

  const transaction = await prisma.paymentTransaction.create({
    data: {
      userId,
      productType: "api_credit",
      productRef: "admin-test-credits",
      displayName: description,
      paymentMethod: "admin_test",
      amount: Math.floor(normalizedAmountCents / 100),
      creditsGranted: normalizedCredits,
      currency: wallet.currency,
      status: "paid",
      metadata: JSON.stringify({
        source,
        isFictional: true,
        amountCents: normalizedAmountCents,
      }),
    },
  });

  const [updatedWallet, ledgerEntry] = await prisma.$transaction([
    prisma.creditWallet.update({
      where: { id: wallet.id },
      data: {
        balanceCents: { increment: normalizedAmountCents },
        creditBalance: { increment: normalizedCredits },
      },
    }),
    prisma.creditLedgerEntry.create({
      data: {
        walletId: wallet.id,
        userId,
        kind: "recharge",
        description,
        amountCents: normalizedAmountCents,
        credits: normalizedCredits,
        referenceType: "payment_transaction",
        referenceId: transaction.id,
        metadata: JSON.stringify({
          source,
          transactionId: transaction.id,
          isFictional: true,
        }),
      },
    }),
  ]);

  return {
    transaction,
    ledgerEntry,
    wallet: updatedWallet,
  };
}
