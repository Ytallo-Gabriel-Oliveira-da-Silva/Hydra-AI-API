import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const stateDir = join(homedir(), ".hydra-cyber");
const keyPath = join(stateDir, "runtime-state.key");

async function loadOrCreateKey() {
  try {
    return await readFile(keyPath);
  } catch {
    const key = randomBytes(32);
    await mkdir(dirname(keyPath), { recursive: true });
    await writeFile(keyPath, key);
    await chmod(keyPath, 0o600).catch(() => null);
    return key;
  }
}

export async function encryptPayload(plainText: string) {
  const key = await loadOrCreateKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    v: 1,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  });
}

export async function decryptPayload(serialized: string) {
  const payload = JSON.parse(serialized) as {
    iv?: string;
    tag?: string;
    data?: string;
  };

  if (!payload.iv || !payload.tag || !payload.data) {
    throw new Error("Payload criptografado inválido");
  }

  const key = await loadOrCreateKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.data, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}