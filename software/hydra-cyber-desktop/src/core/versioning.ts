import type { ReleaseManifestItem } from "./contracts.js";

function normalize(version: string) {
  return version.trim().replace(/^v/i, "");
}

function parse(version: string) {
  return normalize(version)
    .split("-")[0]
    .split(".")
    .map((item) => Number.parseInt(item, 10) || 0);
}

export function compareVersions(a: string, b: string) {
  const pa = parse(a);
  const pb = parse(b);
  const max = Math.max(pa.length, pb.length);
  for (let i = 0; i < max; i += 1) {
    const av = pa[i] || 0;
    const bv = pb[i] || 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

export function getUpdateStatus(input: {
  currentVersion: string;
  recommendedRelease: ReleaseManifestItem | null;
}) {
  if (!input.recommendedRelease) {
    return {
      hasUpdate: false,
      reason: "No compatible release found",
      targetVersion: null,
    };
  }

  const cmp = compareVersions(input.recommendedRelease.version, input.currentVersion);
  return {
    hasUpdate: cmp > 0,
    reason: cmp > 0 ? "Update available" : "Up to date",
    targetVersion: input.recommendedRelease.version,
  };
}