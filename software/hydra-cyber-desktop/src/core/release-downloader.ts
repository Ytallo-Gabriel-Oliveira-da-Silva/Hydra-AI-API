import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rename, stat, unlink } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import type { ReleaseManifestItem } from "./contracts.js";

function normalizeChecksum(value: string | null | undefined) {
  if (!value) return null;
  const onlyHex = value.trim().toLowerCase().replace(/^sha256:/, "");
  return /^[a-f0-9]{64}$/.test(onlyHex) ? onlyHex : null;
}

async function verifySha256(filePath: string, expectedHex: string) {
  const file = await import("node:fs");
  const hash = createHash("sha256");

  await new Promise<void>((resolve, reject) => {
    const stream = file.createReadStream(filePath);
    stream.on("data", (chunk: string | Buffer) => {
      hash.update(chunk);
    });
    stream.on("error", reject);
    stream.on("end", () => resolve());
  });

  const actual = hash.digest("hex");
  if (actual !== expectedHex) {
    throw new Error("Checksum da release não confere com o esperado");
  }
}

export async function downloadRelease(input: {
  release: ReleaseManifestItem;
  targetDirectory: string;
}) {
  if (!input.release.downloadUrl) {
    throw new Error("Release sem URL de download disponível");
  }

  const filename = basename(new URL(input.release.downloadUrl).pathname) || `hydra-cyber-${input.release.version}`;
  const finalPath = join(input.targetDirectory, filename);
  const tempPath = `${finalPath}.part`;

  await mkdir(dirname(finalPath), { recursive: true });
  await unlink(tempPath).catch(() => null);

  const response = await fetch(input.release.downloadUrl);
  if (!response.ok || !response.body) {
    throw new Error(`Falha ao baixar release (${response.status})`);
  }

  const output = createWriteStream(tempPath);
  await pipeline(response.body as unknown as NodeJS.ReadableStream, output);

  const expectedChecksum = normalizeChecksum(input.release.checksum);
  if (expectedChecksum) {
    await verifySha256(tempPath, expectedChecksum);
  }

  await rename(tempPath, finalPath);
  const fileStats = await stat(finalPath);

  return {
    path: finalPath,
    bytes: fileStats.size,
    checksumVerified: Boolean(expectedChecksum),
  };
}