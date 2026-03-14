import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import type { DesktopSessionState } from "./contracts.js";
import { decryptPayload, encryptPayload } from "./state-crypto.js";

const sessionFilePath = join(homedir(), ".hydra-cyber", "runtime-state.enc");
const legacyPlaintextFilePath = join(homedir(), ".hydra-cyber", "runtime-state.json");

function emptyState(): DesktopSessionState {
  return {
    sessionCookie: null,
    user: null,
    activationId: null,
    licenseCode: null,
    lastHeartbeatAt: null,
    updatedAt: new Date().toISOString(),
  };
}

export function getSessionFilePath() {
  return sessionFilePath;
}

export async function loadSessionState() {
  try {
    const encrypted = await readFile(sessionFilePath, "utf8");
    const raw = await decryptPayload(encrypted);
    const parsed = JSON.parse(raw) as DesktopSessionState;
    return {
      ...emptyState(),
      ...parsed,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    // One-time migration fallback from previous plaintext file.
    try {
      const rawLegacy = await readFile(legacyPlaintextFilePath, "utf8");
      const parsedLegacy = JSON.parse(rawLegacy) as DesktopSessionState;
      const migrated = {
        ...emptyState(),
        ...parsedLegacy,
        updatedAt: parsedLegacy.updatedAt || new Date().toISOString(),
      };
      await saveSessionState(migrated);
      return migrated;
    } catch {
      return emptyState();
    }
  }
}

export async function saveSessionState(partial: Partial<DesktopSessionState>) {
  const current = await loadSessionState();
  const next: DesktopSessionState = {
    ...current,
    ...partial,
    updatedAt: new Date().toISOString(),
  };

  await mkdir(dirname(sessionFilePath), { recursive: true });
  const encrypted = await encryptPayload(JSON.stringify(next));
  await writeFile(sessionFilePath, encrypted, "utf8");
  return next;
}

export async function clearSessionState() {
  return saveSessionState({
    sessionCookie: null,
    user: null,
    activationId: null,
    licenseCode: null,
    lastHeartbeatAt: null,
  });
}