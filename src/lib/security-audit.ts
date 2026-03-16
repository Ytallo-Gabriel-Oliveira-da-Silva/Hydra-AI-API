import { createHash, randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { getRequestIp } from "@/lib/rate-limit";

type AuditLevel = "info" | "warn" | "error";

type SecurityAuditInput = {
  event: string;
  level?: AuditLevel;
  req?: NextRequest;
  userId?: string | null;
  details?: Record<string, unknown>;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function hashIdentifier(value?: string | null) {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) return null;
  return sha256(normalized);
}

export function createRequestAuditContext(req: NextRequest) {
  return {
    requestId: req.headers.get("x-request-id") || randomUUID(),
    ip: getRequestIp(req),
    method: req.method,
    path: req.nextUrl.pathname,
    userAgent: req.headers.get("user-agent") || "unknown",
  };
}

export function securityAuditLog(input: SecurityAuditInput) {
  const payload = {
    ts: new Date().toISOString(),
    source: "hydra-security-audit",
    event: input.event,
    request: input.req ? createRequestAuditContext(input.req) : undefined,
    userId: input.userId || undefined,
    details: input.details || undefined,
  };

  const line = JSON.stringify(payload);
  const level = input.level || "info";
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.info(line);
}