#!/usr/bin/env node
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient({ log: ["error"] });

const tierCatalog = {
  "cli-starter": { seatLimit: 1, deviceLimit: 1, updatesMonths: 12 },
  "cli-pro": { seatLimit: 1, deviceLimit: 3, updatesMonths: 12 },
  "cli-team": { seatLimit: 5, deviceLimit: 15, updatesMonths: 12 },
  "cli-enterprise": { seatLimit: 20, deviceLimit: 80, updatesMonths: 12 },
};

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = argv[i + 1];
    out[key] = next && !next.startsWith("--") ? next : true;
  }
  return out;
}

function buildCode() {
  const block = () => randomBytes(3).toString("hex").toUpperCase();
  return `HYDRA-CLI-${block()}-${block()}-${block()}`;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = String(args.email || "").trim().toLowerCase();
  const tier = String(args.tier || "cli-pro").trim();
  const status = String(args.status || "active").trim();

  if (!email) {
    throw new Error("Parâmetro obrigatório: --email");
  }

  if (!tierCatalog[tier]) {
    throw new Error(`Tier inválido: ${tier}. Use: ${Object.keys(tierCatalog).join(", ")}`);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`Usuário não encontrado: ${email}`);
  }

  const existingActive = await prisma.cliLicense.findFirst({
    where: {
      userId: user.id,
      tier,
      status: "active",
      OR: [{ updatesUntil: null }, { updatesUntil: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingActive) {
    console.log(JSON.stringify({
      ok: true,
      reused: true,
      email,
      userId: user.id,
      licenseId: existingActive.id,
      code: existingActive.code,
      tier: existingActive.tier,
      status: existingActive.status,
      updatesUntil: existingActive.updatesUntil,
      note: "Usuário já tinha licença ativa válida; nenhuma nova licença foi criada.",
    }, null, 2));
    return;
  }

  const tierData = tierCatalog[tier];
  const updatesUntil = addMonths(new Date(), tierData.updatesMonths);

  const created = await prisma.cliLicense.create({
    data: {
      userId: user.id,
      code: buildCode(),
      status,
      tier,
      seatLimit: tierData.seatLimit,
      deviceLimit: tierData.deviceLimit,
      updatesUntil,
      activatedAt: status === "active" ? new Date() : null,
      metadata: JSON.stringify({ source: "admin-script", issuedForEmail: email }),
    },
  });

  console.log(JSON.stringify({
    ok: true,
    reused: false,
    email,
    userId: user.id,
    licenseId: created.id,
    code: created.code,
    tier: created.tier,
    status: created.status,
    updatesUntil: created.updatesUntil,
  }, null, 2));
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`issue-cli-license: FAIL -> ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
