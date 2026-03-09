import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-guard";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const plan = user.plan;
    const renewal = user.currentPeriodEndsAt ?? null;

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      countryCode: user.countryCode,
      plan: plan
        ? {
            slug: plan.slug,
            name: plan.name,
            monthlyPrice: plan.monthlyPrice,
            yearlyPrice: plan.yearlyPrice,
          }
        : { slug: "free", name: "Free" },
      renewalAt: renewal ? renewal.toISOString() : null,
      createdAt: user.createdAt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao carregar perfil";
    const status = 401;
    return NextResponse.json({ error: message }, { status });
  }
}