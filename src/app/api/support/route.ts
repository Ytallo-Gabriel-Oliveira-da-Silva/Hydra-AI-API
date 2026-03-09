import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendSupportTicketEmail } from "@/lib/mail";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email(),
  subject: z.string().trim().min(4).max(160),
  category: z.string().trim().min(2).max(60),
  message: z.string().trim().min(20).max(5000),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = schema.parse(body);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "unknown";

    await sendSupportTicketEmail({
      ...payload,
      origin: req.nextUrl.origin,
      ip,
    });

    return NextResponse.json({ ok: true, message: "Pedido enviado ao suporte." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao enviar pedido de suporte";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}