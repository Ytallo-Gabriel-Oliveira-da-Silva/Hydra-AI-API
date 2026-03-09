import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, endSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("hydra_session")?.value;
  if (token) await endSession(token);
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
