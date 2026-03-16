#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";
import {
  ensureLicenseForUser,
  getUserByEmailOrThrow,
  grantTestCredits,
  loadDotEnvIfNeeded,
  parseArgs,
} from "./admin-test-utils.mjs";

loadDotEnvIfNeeded();

const prisma = new PrismaClient({ log: ["error"] });

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = String(args.email || "").trim().toLowerCase();
  const tier = String(args.tier || "cli-pro").trim();
  const credits = Number(args.credits || 50000);
  const amountCents = Number(args["amount-cents"] || 0);
  const forceNew = Boolean(args["force-new-license"]);

  const user = await getUserByEmailOrThrow(prisma, email);

  const licenseResult = await ensureLicenseForUser(prisma, {
    userId: user.id,
    tier,
    status: "active",
    forceNew,
    metadata: {
      surface: "cli",
      issuedForEmail: email,
    },
  });

  const creditResult = await grantTestCredits(prisma, {
    userId: user.id,
    credits,
    amountCents,
    description: "Recarga de teste Hydra CLI",
    source: "admin:test-cli",
  });

  console.log(JSON.stringify({
    ok: true,
    type: "cli-test-access",
    email,
    userId: user.id,
    license: {
      reused: licenseResult.reused,
      id: licenseResult.license.id,
      code: licenseResult.license.code,
      status: licenseResult.license.status,
      tier: licenseResult.license.tier,
      updatesUntil: licenseResult.license.updatesUntil,
    },
    credited: {
      credits,
      amountCents,
      transactionId: creditResult.transaction.id,
      ledgerId: creditResult.ledgerEntry.id,
    },
    wallet: {
      currency: creditResult.wallet.currency,
      balanceCents: creditResult.wallet.balanceCents,
      creditBalance: creditResult.wallet.creditBalance,
    },
  }, null, 2));
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`test-cli-access: FAIL -> ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
