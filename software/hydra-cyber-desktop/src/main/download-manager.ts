import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rename, stat, unlink } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import type { ReleaseManifestItem } from "../core/contracts.js";

export type DownloadState = {
  id: string;
  status: "idle" | "downloading" | "completed" | "failed";
  releaseVersion: string | null;
  progress: number;
  receivedBytes: number;
  totalBytes: number | null;
  filePath: string | null;
  checksumVerified: boolean;
  error: string | null;
};

const state: DownloadState = {
  id: "",
  status: "idle",
  releaseVersion: null,
  progress: 0,
  receivedBytes: 0,
  totalBytes: null,
  filePath: null,
  checksumVerified: false,
  error: null,
};

function resetState() {
  state.id = randomUUID();
  state.status = "downloading";
  state.progress = 0;
  state.receivedBytes = 0;
  state.totalBytes = null;
  state.filePath = null;
  state.checksumVerified = false;
  state.error = null;
  state.releaseVersion = null;
}

function normalizeChecksum(value: string | null | undefined) {
  if (!value) return null;
  const onlyHex = value.trim().toLowerCase().replace(/^sha256:/, "");
  return /^[a-f0-9]{64}$/.test(onlyHex) ? onlyHex : null;
}

async function verifySha256(filePath: string, expectedHex: string) {
  const file = await import("node:fs");
  const crypto = await import("node:crypto");
  const hash = crypto.createHash("sha256");

  await new Promise<void>((resolve, reject) => {
    const stream = file.createReadStream(filePath);
    stream.on("data", (chunk: string | Buffer) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve());
  });

  const actual = hash.digest("hex");
  if (actual !== expectedHex) {
    throw new Error("Checksum da release não confere com o esperado");
  }
}

export function getDownloadState() {
  return { ...state };
}

export async function startDownload(input: {
  release: ReleaseManifestItem;
  targetDirectory: string;
}) {
  if (!input.release.downloadUrl) {
    throw new Error("Release sem URL de download disponível");
  }

  resetState();
  state.releaseVersion = input.release.version;

  const filename = basename(new URL(input.release.downloadUrl).pathname) || `hydra-cyber-${input.release.version}`;
  const finalPath = join(input.targetDirectory, filename);
  const tempPath = `${finalPath}.part`;

  try {
    await mkdir(dirname(finalPath), { recursive: true });
    await unlink(tempPath).catch(() => null);

    const response = await fetch(input.release.downloadUrl);
    if (!response.ok || !response.body) {
      throw new Error(`Falha ao baixar release (${response.status})`);
    }

    const totalHeader = response.headers.get("content-length");
    state.totalBytes = totalHeader ? Number.parseInt(totalHeader, 10) || null : null;

    const reader = response.body.getReader();
    const output = createWriteStream(tempPath);

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      output.write(Buffer.from(value));
      state.receivedBytes += value.byteLength;
      if (state.totalBytes && state.totalBytes > 0) {
        state.progress = Math.min(100, Math.round((state.receivedBytes / state.totalBytes) * 100));
      }
    }

    await new Promise<void>((resolve, reject) => {
      output.end(() => resolve());
      output.on("error", reject);
    });

    const expectedChecksum = normalizeChecksum(input.release.checksum);
    if (expectedChecksum) {
      await verifySha256(tempPath, expectedChecksum);
      state.checksumVerified = true;
    }

    await rename(tempPath, finalPath);
    await stat(finalPath);

    state.status = "completed";
    state.progress = 100;
    state.filePath = finalPath;
    return getDownloadState();
  } catch (error) {
    state.status = "failed";
    state.error = error instanceof Error ? error.message : String(error);
    return getDownloadState();
  }
}