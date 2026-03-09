import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPlanAmount, getRenewalDateForPlan } from "@/lib/plans";

export async function GET(_req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const plan = await prisma.plan.findUnique({ where: { slug } });
    if (!plan) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      plan: {
        ...plan,
        billingLabel:
          plan.slug === "annual"
            ? "Cobrança anual"
            : plan.slug === "free"
              ? "Sem cobrança"
              : "Cobrança mensal",
        amount: getPlanAmount(plan.monthlyPrice, plan.yearlyPrice, plan.slug),
        previewRenewalAt: getRenewalDateForPlan(plan.slug),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao carregar plano";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
