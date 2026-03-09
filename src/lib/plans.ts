import { addMonths, addYears } from "date-fns";
import { prisma } from "./db";

export function getRenewalDateForPlan(planSlug: string, from = new Date()) {
  if (planSlug === "annual") return addYears(from, 1);
  if (planSlug === "plus" || planSlug === "pro") return addMonths(from, 1);
  return null;
}

export function getPlanAmount(monthlyPrice: number | null, yearlyPrice: number | null, planSlug: string) {
  if (planSlug === "annual") return yearlyPrice ?? 0;
  return monthlyPrice ?? 0;
}

export async function getPublicPlans() {
  const plans = await prisma.plan.findMany({ orderBy: { monthlyPrice: "asc" } });
  return plans.map((plan) => ({
    ...plan,
    billingLabel:
      plan.slug === "annual"
        ? "Cobrança anual"
        : plan.slug === "free"
          ? "Sem cobrança"
          : "Cobrança mensal",
    renewalDescription:
      plan.slug === "annual"
        ? "Renovação a cada 12 meses"
        : plan.slug === "free"
          ? "Sem renovação"
          : "Renovação mensal",
  }));
}
