import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const user = session.user;
    const plan = user.plan;
    const renewal = user.currentPeriodEndsAt ?? null;
    const billingNotice = (session as typeof session & {
      billingNotice?: {
        planExpired?: boolean;
        expiredPlanName?: string | null;
        expiredAt?: string | null;
        reason?: "renewal_failed" | "manual_renewal_required" | null;
      };
    }).billingNotice;

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
      billingNotice: {
        planExpired: billingNotice?.planExpired || false,
        expiredPlanName: billingNotice?.expiredPlanName || null,
        expiredAt: billingNotice?.expiredAt || null,
        reason: billingNotice?.reason || null,
      },
      createdAt: user.createdAt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao carregar perfil";
    const status = 401;
    return NextResponse.json({ error: message }, { status });
  }
}