type AsaasErrorItem = {
  description?: string;
};

type AsaasErrorResponse = {
  errors?: AsaasErrorItem[];
};

type AsaasCheckoutCallback = {
  successUrl: string;
  cancelUrl: string;
  expiredUrl: string;
};

export type AsaasPaymentStatus =
  | "PENDING"
  | "RECEIVED"
  | "CONFIRMED"
  | "OVERDUE"
  | "REFUNDED"
  | "DELETED"
  | "RECEIVED_IN_CASH"
  | string;

export type AsaasCreateCustomerPayload = {
  name: string;
  cpfCnpj: string;
  email?: string;
  mobilePhone?: string;
  externalReference?: string;
  notificationDisabled?: boolean;
};

export type AsaasCreateCustomerResponse = {
  id: string;
};

export type AsaasCreatePaymentPayload = {
  customer: string;
  billingType: "PIX";
  value: number;
  dueDate: string;
  description: string;
  externalReference: string;
};

export type AsaasCreatePaymentResponse = {
  id: string;
  status: AsaasPaymentStatus;
  invoiceUrl?: string | null;
};

export type AsaasPixQrCodeResponse = {
  encodedImage?: string;
  payload?: string;
  expirationDate?: string;
};

export type AsaasCreateCheckoutPayload = {
  billingTypes: ["CREDIT_CARD"];
  chargeTypes: ["RECURRENT"];
  minutesToExpire: number;
  externalReference: string;
  callback: AsaasCheckoutCallback;
  items: Array<{
    name: string;
    description: string;
    quantity: number;
    value: number;
  }>;
  subscription: {
    cycle: "MONTHLY" | "YEARLY";
    nextDueDate: string;
    endDate: string;
  };
};

export type AsaasCreateCheckoutResponse = {
  id: string;
  link?: string | null;
};

export type AsaasPaymentResponse = {
  id: string;
  status: AsaasPaymentStatus;
  invoiceUrl?: string | null;
  externalReference?: string | null;
};

function getAsaasApiBaseUrl() {
  return process.env.ASAAS_ENVIRONMENT === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";
}

function getAsaasCheckoutHost() {
  return process.env.ASAAS_ENVIRONMENT === "production"
    ? "https://asaas.com"
    : "https://sandbox.asaas.com";
}

function extractAsaasError(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as AsaasErrorResponse & { message?: string };
  if (Array.isArray(data.errors) && data.errors.length > 0) {
    return data.errors
      .map((error) => error.description?.trim())
      .filter(Boolean)
      .join("; ");
  }
  if (typeof data.message === "string" && data.message.trim()) {
    return data.message.trim();
  }
  return null;
}

async function asaasRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = process.env.ASAAS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ASAAS_API_KEY não configurada.");
  }

  const response = await fetch(`${getAsaasApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      access_token: apiKey,
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    throw new Error(extractAsaasError(payload) || `Asaas respondeu com erro ${response.status}.`);
  }

  return payload as T;
}

export function getAsaasCheckoutUrl(checkoutId: string, providedLink?: string | null) {
  if (providedLink?.trim()) return providedLink.trim();
  return `${getAsaasCheckoutHost()}/checkoutSession/show?id=${encodeURIComponent(checkoutId)}`;
}

export function normalizeCpfCnpj(value: string) {
  return value.replace(/\D/g, "");
}

export function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function isAsaasStatusPaid(status?: string | null) {
  const normalized = (status || "").toUpperCase();
  return normalized === "RECEIVED" || normalized === "CONFIRMED" || normalized === "RECEIVED_IN_CASH";
}

export function isAsaasStatusFailed(status?: string | null) {
  const normalized = (status || "").toUpperCase();
  return normalized === "OVERDUE" || normalized === "REFUNDED" || normalized === "DELETED";
}

export async function createAsaasCustomer(payload: AsaasCreateCustomerPayload) {
  return asaasRequest<AsaasCreateCustomerResponse>("/customers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createAsaasPixPayment(payload: AsaasCreatePaymentPayload) {
  return asaasRequest<AsaasCreatePaymentResponse>("/payments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAsaasPixQrCode(paymentId: string) {
  return asaasRequest<AsaasPixQrCodeResponse>(`/payments/${paymentId}/pixQrCode`);
}

export async function createAsaasCheckout(payload: AsaasCreateCheckoutPayload) {
  return asaasRequest<AsaasCreateCheckoutResponse>("/checkouts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAsaasPayment(paymentId: string) {
  return asaasRequest<AsaasPaymentResponse>(`/payments/${paymentId}`);
}