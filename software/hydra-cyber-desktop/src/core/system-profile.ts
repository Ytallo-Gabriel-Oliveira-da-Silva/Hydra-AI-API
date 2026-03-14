import { hostname, platform, release } from "node:os";
import { versions } from "node:process";
import { detectSupportedPlatform } from "./platform-targets.js";

export type SystemProfile = {
  deviceName: string;
  kernel: string;
  runtime: string;
  target: ReturnType<typeof detectSupportedPlatform>;
};

export function buildSystemProfile(): SystemProfile {
  return {
    deviceName: hostname(),
    kernel: `${platform()} ${release()}`,
    runtime: `node ${versions.node}`,
    target: detectSupportedPlatform(),
  };
}