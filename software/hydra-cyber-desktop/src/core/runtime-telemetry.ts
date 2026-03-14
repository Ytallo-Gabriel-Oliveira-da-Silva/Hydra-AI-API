import { mkdir, appendFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const telemetryFilePath = join(homedir(), ".hydra-cyber", "runtime-events.log");

export async function appendRuntimeEvent(input: {
  level: "info" | "warn" | "error";
  event: string;
  details?: Record<string, unknown>;
}) {
  const line = JSON.stringify({
    at: new Date().toISOString(),
    level: input.level,
    event: input.event,
    details: input.details || {},
  });

  await mkdir(dirname(telemetryFilePath), { recursive: true });
  await appendFile(telemetryFilePath, `${line}\n`, "utf8");
}

export function getTelemetryPath() {
  return telemetryFilePath;
}