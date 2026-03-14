export type SupportedDesktopPlatform =
  | "windows-x64"
  | "windows-arm64"
  | "linux-x64"
  | "linux-arm64"
  | "linux-musl-x64"
  | "linux-musl-arm64"
  | "macos-x64"
  | "macos-arm64";

export type HydraCyberRuntimeMode = "desktop" | "headless";

export type HydraCyberRuntimeConfig = {
  appName: string;
  productName: string;
  runtimeMode: HydraCyberRuntimeMode;
  webBaseUrl: string;
  apiBaseUrl: string;
  releasesBaseUrl: string;
  heartbeatIntervalMs: number;
  updateChannel: "stable" | "beta" | "nightly";
};

export type DeviceActivationRequest = {
  licenseCode: string;
  deviceName: string;
  deviceFingerprint: string;
  platform: SupportedDesktopPlatform;
  cliVersion: string;
};

export type DeviceActivationResponse = {
  activationId: string;
  licenseCode: string;
  licenseTier: string;
  deviceLimit: number;
  activeDevices: number;
  updatesUntil: string | null;
};

export type DeviceHeartbeatResponse = {
  activationId: string;
  lastSeenAt: string | null;
  licenseCode: string;
  licenseTier: string;
  updatesUntil: string | null;
};

export type ReleaseManifestItem = {
  version: string;
  channel: string;
  platform: string;
  arch: string;
  downloadUrl: string;
  checksum: string | null;
  notes: string | null;
  publishedAt: string;
};