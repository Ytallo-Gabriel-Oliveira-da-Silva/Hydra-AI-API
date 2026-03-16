#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";
import {
  getUserByEmailOrThrow,
  loadDotEnvIfNeeded,
  parseArgs,
} from "./admin-test-utils.mjs";

loadDotEnvIfNeeded();

const prisma = new PrismaClient({ log: ["error"] });

const allowedPlans = new Set(["plus", "pro", "annual"]);

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addYears(date, years) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function getNextAccessEndForPlan(planSlug, currentPeriodEndsAt, now = new Date()) {
  const baseDate = currentPeriodEndsAt && currentPeriodEndsAt > now ? currentPeriodEndsAt : now;
  if (planSlug === "annual") return addYears(baseDate, 1);
  if (planSlug === "plus" || planSlug === "pro") return addMonths(baseDate, 1);
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = String(args.email || "").trim().toLowerCase();
  const planSlug = String(args.plan || "").trim().toLowerCase();

  if (!allowedPlans.has(planSlug)) {
    throw new Error("--plan invalido. Use: plus, pro ou annual");
  }

  const user = await getUserByEmailOrThrow(prisma, email);
  const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
  if (!plan) {
    throw new Error(`Plano nao encontrado no banco: ${planSlug}. Rode o seed antes de usar este comando.`);
  }

  const renewalAt = getNextAccessEndForPlan(plan.slug, user.currentPeriodEndsAt || null);
  if (!renewalAt) {
    throw new Error(`Nao foi possivel calcular renovacao para o plano: ${plan.slug}`);
  }

  const amount = plan.slug === "annual"
    ? Number(plan.yearlyPrice || 0)
    : Number(plan.monthlyPrice || 0);

  const [transaction, updatedUser] = await prisma.$transaction([
    prisma.paymentTransaction.create({
      data: {
        userId: user.id,
        planId: plan.id,
        productType: "plan",
        productRef: plan.slug,
        displayName: `Assinatura de teste ${plan.name}`,
        paymentMethod: "admin_test",
        amount,
        currency: "BRL",
        status: "paid",
        metadata: JSON.stringify({
          source: "admin:test-main-plan",
          isFictional: true,
          forcedPlanSlug: plan.slug,
        }),
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        planId: plan.id,
        currentPeriodEndsAt: renewalAt,
      },
      include: {
        plan: {
          select: { id: true, slug: true, name: true },
        },
      },
    }),
  ]);

  console.log(JSON.stringify({
    ok: true,
    type: "main-plan-test",
    email,
    userId: user.id,
    selectedPlan: {
      id: plan.id,
      slug: plan.slug,
      name: plan.name,
    },
    transaction: {
      id: transaction.id,
      status: transaction.status,
      amount: transaction.amount,
      paymentMethod: transaction.paymentMethod,
      createdAt: transaction.createdAt,
    },
    userPlan: {
      planId: updatedUser.planId,
      planSlug: updatedUser.plan?.slug || null,
      planName: updatedUser.plan?.name || null,
      currentPeriodEndsAt: updatedUser.currentPeriodEndsAt,
    },
  }, null, 2));
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`test-main-plan: FAIL -> ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
