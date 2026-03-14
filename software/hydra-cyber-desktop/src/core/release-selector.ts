import type { ReleaseManifestItem, SupportedDesktopPlatform } from "./contracts.js";

type ReleaseTarget = { platform: string; arch: string };

const releaseTargetMap: Record<SupportedDesktopPlatform, ReleaseTarget> = {
  "windows-x64": { platform: "windows", arch: "x64" },
  "windows-arm64": { platform: "windows", arch: "arm64" },
  "linux-x64": { platform: "linux", arch: "x64" },
  "linux-arm64": { platform: "linux", arch: "arm64" },
  "linux-musl-x64": { platform: "linux", arch: "x64" },
  "linux-musl-arm64": { platform: "linux", arch: "arm64" },
  "macos-x64": { platform: "macos", arch: "x64" },
  "macos-arm64": { platform: "macos", arch: "arm64" },
};

export function pickRecommendedRelease(input: {
  releases: ReleaseManifestItem[];
  target: SupportedDesktopPlatform;
  channel?: string;
}) {
  const target = releaseTargetMap[input.target];
  const channel = input.channel || "stable";

  const candidates = input.releases.filter(
    (item) =>
      item.platform.toLowerCase() === target.platform &&
      item.arch.toLowerCase() === target.arch &&
      item.channel.toLowerCase() === channel,
  );

  if (candidates.length > 0) {
    return candidates[0] || null;
  }

  return input.releases.find(
    (item) =>
      item.platform.toLowerCase() === target.platform && item.arch.toLowerCase() === target.arch,
  ) || null;
}