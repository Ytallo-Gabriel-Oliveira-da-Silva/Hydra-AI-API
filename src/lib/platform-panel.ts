import { createHash } from "crypto";
import { subMonths } from "date-fns";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";

const API_KEY_PREFIX_LENGTH = 18;

function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

function buildApiSecret() {
  return `hydra_live_${nanoid(40)}`;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseScopes(scopes: string) {
  return scopes.split(",").map((item) => item.trim()).filter(Boolean);
}

export async function ensureCreditWallet(userId: string) {
  return prisma.creditWallet.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      currency: "BRL",
      balanceCents: 0,
      creditBalance: 0,
    },
  });
}

export async function getApiPanelOverview(userId: string) {
  const wallet = await ensureCreditWallet(userId);

  const [keys, requestLogs, payments, quotaHistory] = await Promise.all([
    prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.apiRequestLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        apiKey: {
          select: { id: true, name: true, prefix: true },
        },
      },
    }),
    prisma.paymentTransaction.findMany({
      where: { userId },
      include: {
        plan: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.quotaUsage.findMany({
      where: {
        userId,
        month: {
          in: Array.from({ length: 6 }, (_, index) => monthKey(subMonths(new Date(), 5 - index))),
        },
      },
      orderBy: { month: "asc" },
    }),
  ]);

  const usageSeries = Array.from({ length: 6 }, (_, index) => {
    const label = monthKey(subMonths(new Date(), 5 - index));
    const usage = quotaHistory.find((item) => item.month === label);
    return {
      month: label,
      text: usage?.chatCount || 0,
      image: usage?.imageCount || 0,
      audio: usage?.audioCount || 0,
      total: (usage?.chatCount || 0) + (usage?.imageCount || 0) + (usage?.audioCount || 0),
    };
  });

  const totalRequests = usageSeries.reduce((sum, item) => sum + item.total, 0);
  const failedRequests = requestLogs.filter((log) => log.statusCode >= 400).length;
  const successRate = requestLogs.length === 0 ? 100 : ((requestLogs.length - failedRequests) / requestLogs.length) * 100;
  const totalCreditsConsumed = requestLogs.reduce((sum, log) => sum + log.creditCost, 0);

  return {
    wallet: {
      currency: wallet.currency,
      balanceCents: wallet.balanceCents,
      creditBalance: wallet.creditBalance,
    },
    summary: {
      totalKeys: keys.length,
      activeKeys: keys.filter((key) => key.status === "active").length,
      totalRequests,
      successRate,
      totalCreditsConsumed,
    },
    usageSeries,
    keys: keys.map((key) => ({
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      status: key.status,
      scopes: parseScopes(key.scopes),
      createdAt: key.createdAt.toISOString(),
      expiresAt: key.expiresAt?.toISOString() || null,
      lastUsedAt: key.lastUsedAt?.toISOString() || null,
    })),
    recentLogs: requestLogs.map((log) => ({
      id: log.id,
      resourceType: log.resourceType,
      endpoint: log.endpoint,
      statusCode: log.statusCode,
      latencyMs: log.latencyMs,
      creditCost: log.creditCost,
      createdAt: log.createdAt.toISOString(),
      apiKeyName: log.apiKey?.name || null,
      apiKeyPrefix: log.apiKey?.prefix || null,
    })),
    recentPayments: payments.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      createdAt: payment.createdAt.toISOString(),
      planName: payment.displayName || payment.plan?.name || payment.productRef || "Pagamento Hydra",
    })),
  };
}

export async function createApiKeyForUser({
  userId,
  name,
  scopes,
  expiresAt,
}: {
  userId: string;
  name: string;
  scopes: string[];
  expiresAt?: Date | null;
}) {
  const secret = buildApiSecret();
  const prefix = secret.slice(0, API_KEY_PREFIX_LENGTH);
  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      name,
      prefix,
      secretHash: hashSecret(secret),
      scopes: scopes.join(","),
      expiresAt: expiresAt || undefined,
      status: "active",
    },
  });

  return {
    secret,
    key: {
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      status: apiKey.status,
      scopes,
      createdAt: apiKey.createdAt.toISOString(),
      expiresAt: apiKey.expiresAt?.toISOString() || null,
      lastUsedAt: null,
    },
  };
}

export async function revokeApiKeyForUser(userId: string, keyId: string) {
  const key = await prisma.apiKey.findFirst({ where: { id: keyId, userId } });
  if (!key) throw new Error("Chave não encontrada");

  await prisma.apiKey.update({
    where: { id: keyId },
    data: { status: "revoked" },
  });
}

export async function getCliPanelOverview(userId: string) {
  const [licenses, devices, releases, wallet] = await Promise.all([
    prisma.cliLicense.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        activations: {
          where: { revokedAt: null },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.cliDeviceActivation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.cliRelease.findMany({
      orderBy: [{ publishedAt: "desc" }, { version: "desc" }],
      take: 12,
    }),
    ensureCreditWallet(userId),
  ]);

  return {
    wallet: {
      currency: wallet.currency,
      balanceCents: wallet.balanceCents,
      creditBalance: wallet.creditBalance,
    },
    summary: {
      totalLicenses: licenses.length,
      activeLicenses: licenses.filter((license) => license.status === "active").length,
      activeDevices: devices.filter((device) => !device.revokedAt).length,
      releaseCount: releases.length,
    },
    licenses: licenses.map((license) => ({
      id: license.id,
      code: license.code,
      status: license.status,
      tier: license.tier,
      seatLimit: license.seatLimit,
      deviceLimit: license.deviceLimit,
      updatesUntil: license.updatesUntil?.toISOString() || null,
      issuedAt: license.issuedAt.toISOString(),
      activatedAt: license.activatedAt?.toISOString() || null,
      activations: license.activations.map((activation) => ({
        id: activation.id,
        deviceName: activation.deviceName,
        platform: activation.platform,
        cliVersion: activation.cliVersion,
        lastSeenAt: activation.lastSeenAt?.toISOString() || null,
        createdAt: activation.createdAt.toISOString(),
      })),
    })),
    devices: devices.map((device) => ({
      id: device.id,
      deviceName: device.deviceName,
      platform: device.platform,
      cliVersion: device.cliVersion,
      lastSeenAt: device.lastSeenAt?.toISOString() || null,
      revokedAt: device.revokedAt?.toISOString() || null,
      createdAt: device.createdAt.toISOString(),
    })),
    releases: releases.map((release) => ({
      id: release.id,
      version: release.version,
      channel: release.channel,
      platform: release.platform,
      arch: release.arch,
      downloadUrl: release.downloadUrl,
      checksum: release.checksum,
      notes: release.notes,
      publishedAt: release.publishedAt.toISOString(),
    })),
  };
}

export async function redeemCliLicenseCode(userId: string, code: string) {
  const normalizedCode = code.trim().toUpperCase();
  const license = await prisma.cliLicense.findUnique({ where: { code: normalizedCode } });
  if (!license) throw new Error("Código de licença inválido");
  if (license.userId && license.userId !== userId) throw new Error("Esta licença já está vinculada a outra conta");
  if (license.status === "revoked") throw new Error("Esta licença foi revogada");
  if (license.status === "expired") throw new Error("Esta licença expirou");

  const updated = await prisma.cliLicense.update({
    where: { id: license.id },
    data: {
      userId,
      status: "active",
      activatedAt: license.activatedAt || new Date(),
    },
    include: {
      activations: {
        where: { revokedAt: null },
      },
    },
  });

  return {
    id: updated.id,
    code: updated.code,
    status: updated.status,
    tier: updated.tier,
    seatLimit: updated.seatLimit,
    deviceLimit: updated.deviceLimit,
    updatesUntil: updated.updatesUntil?.toISOString() || null,
    issuedAt: updated.issuedAt.toISOString(),
    activatedAt: updated.activatedAt?.toISOString() || null,
    activations: updated.activations.map((activation) => ({
      id: activation.id,
      deviceName: activation.deviceName,
      platform: activation.platform,
      cliVersion: activation.cliVersion,
      lastSeenAt: activation.lastSeenAt?.toISOString() || null,
      createdAt: activation.createdAt.toISOString(),
    })),
  };
}

export async function revokeCliDeviceActivation(userId: string, activationId: string) {
  const activation = await prisma.cliDeviceActivation.findFirst({ where: { id: activationId, userId } });
  if (!activation) throw new Error("Dispositivo não encontrado");

  await prisma.cliDeviceActivation.update({
    where: { id: activationId },
    data: { revokedAt: new Date() },
  });
}
