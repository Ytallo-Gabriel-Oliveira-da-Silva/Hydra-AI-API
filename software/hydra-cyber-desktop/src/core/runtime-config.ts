import type { HydraCyberRuntimeConfig } from "./contracts.js";

export const runtimeConfig: HydraCyberRuntimeConfig = {
  appName: "hydra-cyber-desktop",
  productName: "Hydra Cyber",
  runtimeMode: process.env.HYDRA_CYBER_RUNTIME_MODE === "headless" ? "headless" : "desktop",
  webBaseUrl: process.env.HYDRA_CYBER_WEB_URL || "https://cyber.hydra-ai.shop",
  apiBaseUrl: process.env.HYDRA_CYBER_API_URL || `${process.env.HYDRA_CYBER_API_ROOT || "https://hydra-ai.shop/api"}/cli-panel`,
  releasesBaseUrl: process.env.HYDRA_CYBER_RELEASES_URL || "https://hydra-ai.shop/api/cli-panel/releases",
  heartbeatIntervalMs: Number(process.env.HYDRA_CYBER_HEARTBEAT_MS || 45000),
  updateChannel: process.env.HYDRA_CYBER_CHANNEL === "beta" || process.env.HYDRA_CYBER_CHANNEL === "nightly"
    ? process.env.HYDRA_CYBER_CHANNEL
    : "stable",
};