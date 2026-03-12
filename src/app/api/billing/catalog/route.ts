import { NextRequest, NextResponse } from "next/server";
import { requireUser, ApiError } from "@/lib/api-guard";
import { apiCreditPacks, cliLicenseTiers } from "@/lib/billing-products";
import { ensureCreditWallet, getCliPanelOverview } from "@/lib/platform-panel";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const [wallet, cliOverview] = await Promise.all([
      ensureCreditWallet(user.id),
      getCliPanelOverview(user.id),
    ]);

    return NextResponse.json({
      wallet: {
        currency: wallet.currency,
        balanceCents: wallet.balanceCents,
        creditBalance: wallet.creditBalance,
      },
      apiCreditPacks,
      cliLicenseTiers,
      cliSummary: cliOverview.summary,
    });
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao carregar catálogo comercial";
    return NextResponse.json({ error: message }, { status });
  }
}
