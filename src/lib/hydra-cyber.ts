import { prisma } from "@/lib/db";
import { normalizeCpfCnpj } from "@/lib/asaas";

export const HYDRA_CYBER_CONTRACT_VERSION = "2026-03-13";

export type HydraCyberProfileInput = {
  fullName: string;
  email: string;
  phone: string;
  documentType: "cpf" | "cnpj";
  documentNumber: string;
  companyName?: string;
  stateRegistration?: string;
  financeEmail?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  responsibleName?: string;
  responsibleCpf?: string;
  responsibleRole?: string;
  responsibilityAccepted: boolean;
  acceptableUseAccepted: boolean;
  billingAgreementAccepted: boolean;
};

export type HydraCyberCompliance = {
  profile: HydraCyberProfileInput;
  readiness: {
    ready: boolean;
    missing: string[];
    canPurchase: boolean;
    canActivateDesktop: boolean;
  };
  contractVersion: string;
  acceptedAt: {
    responsibilityContractAt: string | null;
    acceptableUseAt: string | null;
    billingAgreementAt: string | null;
  };
};

type SettingsPayload = Record<string, unknown> & {
  hydraCyber?: {
    compliance?: Partial<HydraCyberProfileInput> & {
      acceptedAt?: {
        responsibilityContractAt?: string | null;
        acceptableUseAt?: string | null;
        billingAgreementAt?: string | null;
      };
      contractVersion?: string;
    };
  };
};

type StoredCompliance = NonNullable<NonNullable<SettingsPayload["hydraCyber"]>["compliance"]>;

function safeParseSettings(payload?: string | null): SettingsPayload {
  if (!payload) return {};
  try {
    return JSON.parse(payload) as SettingsPayload;
  } catch {
    return {};
  }
}

function normalizeProfile(user: { name: string; email: string }, stored?: StoredCompliance): HydraCyberCompliance {
  const hasCurrentContractVersion = stored?.contractVersion === HYDRA_CYBER_CONTRACT_VERSION;
  const profile: HydraCyberProfileInput = {
    fullName: stored?.fullName || user.name,
    email: stored?.email || user.email,
    phone: stored?.phone || "",
    documentType: stored?.documentType === "cnpj" ? "cnpj" : "cpf",
    documentNumber: stored?.documentNumber || "",
    companyName: stored?.companyName || "",
    stateRegistration: stored?.stateRegistration || "",
    financeEmail: stored?.financeEmail || user.email,
    addressLine1: stored?.addressLine1 || "",
    addressLine2: stored?.addressLine2 || "",
    city: stored?.city || "",
    state: stored?.state || "",
    postalCode: stored?.postalCode || "",
    country: stored?.country || "Brasil",
    responsibleName: stored?.responsibleName || "",
    responsibleCpf: stored?.responsibleCpf || "",
    responsibleRole: stored?.responsibleRole || "",
    responsibilityAccepted: hasCurrentContractVersion && Boolean(stored?.responsibilityAccepted),
    acceptableUseAccepted: hasCurrentContractVersion && Boolean(stored?.acceptableUseAccepted),
    billingAgreementAccepted: hasCurrentContractVersion && Boolean(stored?.billingAgreementAccepted),
  };

  const missing: string[] = [];
  if (profile.fullName.trim().length < 3) missing.push("Nome completo do responsável");
  if (!profile.email.trim()) missing.push("E-mail principal");
  if (!profile.phone.trim()) missing.push("Telefone");
  if (!profile.documentNumber.trim()) missing.push(profile.documentType === "cnpj" ? "CNPJ" : "CPF");
  if (!profile.addressLine1.trim()) missing.push("Endereço");
  if (!profile.city.trim()) missing.push("Cidade");
  if (!profile.state.trim()) missing.push("Estado");
  if (!profile.postalCode.trim()) missing.push("CEP");
  if (!profile.country.trim()) missing.push("País");

  const digits = normalizeCpfCnpj(profile.documentNumber);
  if (profile.documentType === "cpf" && digits.length !== 11) missing.push("CPF válido");
  if (profile.documentType === "cnpj") {
    if (digits.length !== 14) missing.push("CNPJ válido");
    if (!profile.companyName?.trim()) missing.push("Razão social / nome da empresa");
    if (!profile.responsibleName?.trim()) missing.push("Nome pessoal do responsável pelo CNPJ");
    if (normalizeCpfCnpj(profile.responsibleCpf || "").length !== 11) missing.push("CPF do responsável pelo CNPJ");
    if (!profile.responsibleRole?.trim()) missing.push("Cargo do responsável pelo CNPJ");
  }

  if (!profile.responsibilityAccepted) missing.push("Aceite do contrato de responsabilidade");
  if (!profile.acceptableUseAccepted) missing.push("Aceite da política de uso ético");
  if (!profile.billingAgreementAccepted) missing.push("Aceite do acordo de faturamento e cobrança");
  if (stored?.contractVersion && !hasCurrentContractVersion) missing.push(`Aceite atualizado do contrato Hydra Cyber (${HYDRA_CYBER_CONTRACT_VERSION})`);

  return {
    profile,
    readiness: {
      ready: missing.length === 0,
      missing,
      canPurchase: missing.length === 0,
      canActivateDesktop: missing.length === 0,
    },
    contractVersion: HYDRA_CYBER_CONTRACT_VERSION,
    acceptedAt: {
      responsibilityContractAt: hasCurrentContractVersion ? stored?.acceptedAt?.responsibilityContractAt || null : null,
      acceptableUseAt: hasCurrentContractVersion ? stored?.acceptedAt?.acceptableUseAt || null : null,
      billingAgreementAt: hasCurrentContractVersion ? stored?.acceptedAt?.billingAgreementAt || null : null,
    },
  };
}

export async function getHydraCyberCompliance(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      settings: { select: { payload: true } },
    },
  });

  if (!user) throw new Error("Usuário não encontrado");

  const settings = safeParseSettings(user.settings?.payload);
  return normalizeProfile(user, settings.hydraCyber?.compliance);
}

export async function saveHydraCyberCompliance(userId: string, input: HydraCyberProfileInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      settings: { select: { payload: true } },
    },
  });

  if (!user) throw new Error("Usuário não encontrado");

  const settings = safeParseSettings(user.settings?.payload);
  const now = new Date().toISOString();
  const previousAcceptance = settings.hydraCyber?.compliance?.acceptedAt;

  const nextSettings: SettingsPayload = {
    ...settings,
    hydraCyber: {
      ...(settings.hydraCyber || {}),
      compliance: {
        ...input,
        documentNumber: normalizeCpfCnpj(input.documentNumber),
        responsibleCpf: normalizeCpfCnpj(input.responsibleCpf || ""),
        contractVersion: HYDRA_CYBER_CONTRACT_VERSION,
        acceptedAt: {
          responsibilityContractAt: input.responsibilityAccepted
            ? previousAcceptance?.responsibilityContractAt || now
            : null,
          acceptableUseAt: input.acceptableUseAccepted
            ? previousAcceptance?.acceptableUseAt || now
            : null,
          billingAgreementAt: input.billingAgreementAccepted
            ? previousAcceptance?.billingAgreementAt || now
            : null,
        },
      },
    },
  };

  await prisma.userSettings.upsert({
    where: { userId },
    update: { payload: JSON.stringify(nextSettings) },
    create: { userId, payload: JSON.stringify(nextSettings) },
  });

  return getHydraCyberCompliance(userId);
}

export async function assertHydraCyberReady(userId: string) {
  const compliance = await getHydraCyberCompliance(userId);
  if (!compliance.readiness.ready) {
    throw new Error(`Complete o perfil Hydra Cyber antes de continuar: ${compliance.readiness.missing.join(", ")}`);
  }
  return compliance;
}

export async function activateHydraCyberDevice({
  userId,
  licenseCode,
  deviceName,
  deviceFingerprint,
  platform,
  cliVersion,
}: {
  userId: string;
  licenseCode: string;
  deviceName: string;
  deviceFingerprint: string;
  platform: string;
  cliVersion: string;
}) {
  const normalizedCode = licenseCode.trim().toUpperCase();
  const license = await prisma.cliLicense.findUnique({
    where: { code: normalizedCode },
    include: { activations: { where: { revokedAt: null }, orderBy: { createdAt: "desc" } } },
  });

  if (!license) throw new Error("Licença não encontrada");
  if (license.userId && license.userId !== userId) throw new Error("Esta licença pertence a outra conta");
  if (license.status === "revoked") throw new Error("Esta licença foi revogada");
  if (license.updatesUntil && license.updatesUntil < new Date()) throw new Error("A validade desta licença terminou");

  const boundLicense = !license.userId
    ? await prisma.cliLicense.update({
        where: { id: license.id },
        data: { userId, status: "active", activatedAt: license.activatedAt || new Date() },
        include: { activations: { where: { revokedAt: null }, orderBy: { createdAt: "desc" } } },
      })
    : license;

  const existingActivation = boundLicense.activations.find((item) => item.deviceFingerprint === deviceFingerprint);
  if (existingActivation) {
    const updated = await prisma.cliDeviceActivation.update({
      where: { id: existingActivation.id },
      data: { deviceName, platform, cliVersion, lastSeenAt: new Date() },
    });

    return {
      licenseCode: boundLicense.code,
      licenseTier: boundLicense.tier,
      activationId: updated.id,
      deviceLimit: boundLicense.deviceLimit,
      activeDevices: boundLicense.activations.length,
      updatesUntil: boundLicense.updatesUntil?.toISOString() || null,
    };
  }

  if (boundLicense.activations.length >= boundLicense.deviceLimit) {
    throw new Error("Limite de dispositivos ativos atingido para esta licença. Revogue um dispositivo antigo no dashboard web.");
  }

  const activation = await prisma.cliDeviceActivation.create({
    data: {
      licenseId: boundLicense.id,
      userId,
      deviceName,
      deviceFingerprint,
      platform,
      cliVersion,
      lastSeenAt: new Date(),
    },
  });

  return {
    licenseCode: boundLicense.code,
    licenseTier: boundLicense.tier,
    activationId: activation.id,
    deviceLimit: boundLicense.deviceLimit,
    activeDevices: boundLicense.activations.length + 1,
    updatesUntil: boundLicense.updatesUntil?.toISOString() || null,
  };
}

export async function heartbeatHydraCyberDevice({
  userId,
  activationId,
  cliVersion,
}: {
  userId: string;
  activationId: string;
  cliVersion?: string;
}) {
  const activation = await prisma.cliDeviceActivation.findFirst({
    where: { id: activationId, userId, revokedAt: null },
    include: { license: true },
  });

  if (!activation) throw new Error("Ativação não encontrada ou revogada");
  if (activation.license.updatesUntil && activation.license.updatesUntil < new Date()) {
    if (activation.license.status !== "expired") {
      await prisma.cliLicense.update({
        where: { id: activation.license.id },
        data: { status: "expired" },
      });
    }
    throw new Error("A licença vinculada a este dispositivo expirou");
  }

  const updated = await prisma.cliDeviceActivation.update({
    where: { id: activation.id },
    data: {
      lastSeenAt: new Date(),
      cliVersion: cliVersion || activation.cliVersion,
    },
  });

  return {
    activationId: updated.id,
    lastSeenAt: updated.lastSeenAt?.toISOString() || null,
    licenseCode: activation.license.code,
    licenseTier: activation.license.tier,
    updatesUntil: activation.license.updatesUntil?.toISOString() || null,
  };
}