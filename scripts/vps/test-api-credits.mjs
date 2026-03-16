#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";
import {
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
  const credits = Number(args.credits || 50000);
  const amountCents = Number(args["amount-cents"] || 0);

  const user = await getUserByEmailOrThrow(prisma, email);
  const result = await grantTestCredits(prisma, {
    userId: user.id,
    credits,
    amountCents,
    description: "Recarga de teste Hydra API",
    source: "admin:test-api-credits",
  });

  console.log(JSON.stringify({
    ok: true,
    type: "api-test-credits",
    email,
    userId: user.id,
    credited: {
      credits,
      amountCents,
      transactionId: result.transaction.id,
      ledgerId: result.ledgerEntry.id,
    },
    wallet: {
      currency: result.wallet.currency,
      balanceCents: result.wallet.balanceCents,
      creditBalance: result.wallet.creditBalance,
    },
  }, null, 2));
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`test-api-credits: FAIL -> ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
