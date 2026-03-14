import { createHash } from "node:crypto";
import type {
  DeviceActivationRequest,
  DeviceActivationResponse,
  DeviceHeartbeatResponse,
  ReleaseManifestItem,
} from "./contracts.js";
import { runtimeConfig } from "./runtime-config.js";
import { buildSystemProfile } from "./system-profile.js";

function buildJsonHeaders(sessionToken?: string) {
  return {
    "Content-Type": "application/json",
    ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
  };
}

export function buildDeviceFingerprint(seed: string) {
  return createHash("sha256").update(seed).digest("hex");
}

export async function activateDevice(input: {
  sessionToken: string;
  licenseCode: string;
  appVersion: string;
}) {
  const profile = buildSystemProfile();
  const payload: DeviceActivationRequest = {
    licenseCode: input.licenseCode,
    deviceName: profile.deviceName,
    deviceFingerprint: buildDeviceFingerprint(`${profile.deviceName}:${profile.kernel}:${profile.target}`),
    platform: profile.target,
    cliVersion: input.appVersion,
  };

  const response = await fetch(`${runtimeConfig.apiBaseUrl}/devices/activate`, {
    method: "POST",
    headers: buildJsonHeaders(input.sessionToken),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Falha ao ativar dispositivo Hydra Cyber");
  }

  return response.json() as Promise<DeviceActivationResponse>;
}

export async function sendHeartbeat(input: {
  sessionToken: string;
  activationId: string;
  appVersion: string;
}) {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/devices/heartbeat`, {
    method: "POST",
    headers: buildJsonHeaders(input.sessionToken),
    body: JSON.stringify({ activationId: input.activationId, cliVersion: input.appVersion }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Falha no heartbeat do Hydra Cyber");
  }

  return response.json() as Promise<DeviceHeartbeatResponse>;
}

export async function fetchReleaseManifest() {
  const response = await fetch(runtimeConfig.releasesBaseUrl, {
    headers: buildJsonHeaders(),
  });

  if (!response.ok) {
    throw new Error("Falha ao consultar releases do Hydra Cyber");
  }

  return response.json() as Promise<ReleaseManifestItem[]>;
}