import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  void req;
  return NextResponse.json(
    { error: "Confirmação manual desativada. O plano só é ativado após confirmação real da Asaas." },
    { status: 410 },
  );
}
