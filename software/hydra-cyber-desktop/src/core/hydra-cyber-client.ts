import { createHash } from "node:crypto";
import type {
  DeviceActivationEnvelope,
  DeviceActivationRequest,
  DeviceActivationResponse,
  DeviceHeartbeatEnvelope,
  DeviceHeartbeatResponse,
  ReleaseManifestEnvelope,
  ReleaseManifestItem,
} from "./contracts.js";
import { runtimeConfig } from "./runtime-config.js";
import { buildSystemProfile } from "./system-profile.js";
import { requestJson } from "./http-client.js";

function buildJsonHeaders(sessionCookie?: string) {
  return {
    "Content-Type": "application/json",
    ...(sessionCookie ? { Cookie: sessionCookie } : {}),
  };
}

export function buildDeviceFingerprint(seed: string) {
  return createHash("sha256").update(seed).digest("hex");
}

export async function activateDevice(input: {
  sessionCookie: string;
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

  const data = await requestJson<DeviceActivationEnvelope>(`${runtimeConfig.apiBaseUrl}/devices/activate`, {
    method: "POST",
    headers: buildJsonHeaders(input.sessionCookie),
    body: JSON.stringify(payload),
    timeoutMs: 12000,
    retries: 1,
  });
  return data.activation;
}

export async function sendHeartbeat(input: {
  sessionCookie: string;
  activationId: string;
  appVersion: string;
}) {
  const data = await requestJson<DeviceHeartbeatEnvelope>(`${runtimeConfig.apiBaseUrl}/devices/heartbeat`, {
    method: "POST",
    headers: buildJsonHeaders(input.sessionCookie),
    body: JSON.stringify({ activationId: input.activationId, cliVersion: input.appVersion }),
    timeoutMs: 10000,
    retries: 1,
  });
  return data.heartbeat;
}

export async function fetchReleaseManifest() {
  const data = await requestJson<ReleaseManifestEnvelope>(runtimeConfig.releasesBaseUrl, {
    headers: buildJsonHeaders(),
    timeoutMs: 10000,
    retries: 1,
  });
  return data.releases;
}