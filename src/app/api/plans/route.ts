import { NextResponse } from "next/server";
import { getPublicPlans } from "@/lib/plans";

export async function GET() {
  try {
    const plans = await getPublicPlans();
    return NextResponse.json({ plans });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao carregar planos";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
