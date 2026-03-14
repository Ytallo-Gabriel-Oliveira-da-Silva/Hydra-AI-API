import { arch, platform } from "node:process";
import type { SupportedDesktopPlatform } from "./contracts.js";

const targetMatrix: Record<string, SupportedDesktopPlatform> = {
  "win32:x64": "windows-x64",
  "win32:arm64": "windows-arm64",
  "linux:x64": "linux-x64",
  "linux:arm64": "linux-arm64",
  "darwin:x64": "macos-x64",
  "darwin:arm64": "macos-arm64",
};

export function detectSupportedPlatform(): SupportedDesktopPlatform {
  const resolved = targetMatrix[`${platform}:${arch}`];
  if (!resolved) {
    throw new Error(`Plataforma ainda não mapeada para Hydra Cyber: ${platform}/${arch}`);
  }
  return resolved;
}

export const plannedTargets: SupportedDesktopPlatform[] = [
  "windows-x64",
  "windows-arm64",
  "linux-x64",
  "linux-arm64",
  "linux-musl-x64",
  "linux-musl-arm64",
  "macos-x64",
  "macos-arm64",
];