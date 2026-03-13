import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, requireUser } from "@/lib/api-guard";
import { getHydraCyberCompliance, saveHydraCyberCompliance } from "@/lib/hydra-cyber";

const schema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(8),
  documentType: z.enum(["cpf", "cnpj"]),
  documentNumber: z.string().min(11),
  companyName: z.string().optional().default(""),
  stateRegistration: z.string().optional().default(""),
  financeEmail: z.string().email().optional().or(z.literal("")),
  addressLine1: z.string().min(4),
  addressLine2: z.string().optional().default(""),
  city: z.string().min(2),
  state: z.string().min(2),
  postalCode: z.string().min(5),
  country: z.string().min(2),
  responsibleName: z.string().optional().default(""),
  responsibleCpf: z.string().optional().default(""),
  responsibleRole: z.string().optional().default(""),
  responsibilityAccepted: z.boolean(),
  acceptableUseAccepted: z.boolean(),
  billingAgreementAccepted: z.boolean(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const compliance = await getHydraCyberCompliance(user.id);
    return NextResponse.json(compliance);
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao carregar perfil Hydra Cyber";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const parsed = schema.parse(body);
    const compliance = await saveHydraCyberCompliance(user.id, parsed);
    return NextResponse.json(compliance);
  } catch (err: unknown) {
    const status = err instanceof ApiError ? err.status : 400;
    const message = err instanceof Error ? err.message : "Erro ao salvar perfil Hydra Cyber";
    return NextResponse.json({ error: message }, { status });
  }
}