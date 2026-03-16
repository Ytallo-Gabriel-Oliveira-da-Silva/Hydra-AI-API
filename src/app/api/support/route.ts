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

type SupportSource = "hydra" | "api" | "cli" | "cyber";

function randomCode(size = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < size; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function detectSupportSource(req: NextRequest): SupportSource {
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host || "").toLowerCase();
  const path = req.nextUrl.pathname.toLowerCase();

  if (host.startsWith("api.")) return "api";
  if (host.startsWith("cli.")) return "cli";
  if (host.startsWith("cyber.")) return "cyber";
  if (path.startsWith("/api-panel")) return "api";
  if (path.startsWith("/cli-panel")) return "cli";

  return "hydra";
}

function buildTicketCode(source: SupportSource) {
  const code = randomCode(10);
  if (source === "api") return `api-hy-ticket:${code}`;
  if (source === "cli") return `cli-hy-ticket:${code}`;
  if (source === "cyber") return `cyber-hy-ticket:${code}`;
  return `hydra-ticket:${code}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = schema.parse(body);
    const source = detectSupportSource(req);
    const ticketCode = buildTicketCode(source);
    const supportLink = `${req.nextUrl.origin}/support`;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "unknown";

    await sendSupportTicketEmail({
      ...payload,
      ticketCode,
      source,
      origin: req.nextUrl.origin,
      supportLink,
      ip,
    });

    return NextResponse.json({
      ok: true,
      ticketCode,
      message: `Pedido enviado com sucesso. Seu código de atendimento é ${ticketCode}. Nosso suporte retornará no e-mail cadastrado no formulário.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao enviar pedido de suporte";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}