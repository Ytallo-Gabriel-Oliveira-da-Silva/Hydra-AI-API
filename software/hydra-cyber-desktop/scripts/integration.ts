import { createServer } from "node:http";
import type { IncomingMessage, RequestListener, ServerResponse } from "node:http";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { requestJson } from "../src/core/http-client.js";
import { buildInstallGuide } from "../src/core/install-guide.js";

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function withServer(handler: RequestListener, run: (baseUrl: string) => Promise<void>) {
  const server = createServer(handler);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Não foi possível resolver porta de teste");
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
}

async function testHttpRetries() {
  let attempts = 0;

  await withServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.url !== "/retry") {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "not-found" }));
      return;
    }

    attempts += 1;
    if (attempts < 3) {
      res.statusCode = 503;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "temporarily-unavailable" }));
      return;
    }

    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, attempts }));
  }, async (baseUrl) => {
    const payload = await requestJson<{ ok: boolean; attempts: number }>(`${baseUrl}/retry`, {
      retries: 3,
      timeoutMs: 800,
    });

    assert(payload.ok, "requestJson should eventually return success payload");
    assert(payload.attempts === 3, "requestJson should retry until the third attempt");
  });
}

async function testHttpTimeout() {
  await withServer((_req: IncomingMessage, res: ServerResponse) => {
    setTimeout(() => {
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: true }));
    }, 250);
  }, async (baseUrl) => {
    let failed = false;
    try {
      await requestJson(`${baseUrl}/slow`, {
        retries: 0,
        timeoutMs: 30,
      });
    } catch {
      failed = true;
    }
    assert(failed, "requestJson should fail when response exceeds timeout");
  });
}

async function testEncryptedSessionState() {
  const tempHome = await mkdtemp(join(tmpdir(), "hydra-cyber-home-"));
  const originalHome = process.env.HOME;
  process.env.HOME = tempHome;

  try {
    const sessionStore = await import("../src/core/session-store.js");
    await sessionStore.saveSessionState({
      sessionCookie: "hydra_session=very-secret-cookie",
      activationId: "act-integration-1",
      licenseCode: "HYDRA-INT-001",
    });

    const stateFile = sessionStore.getSessionFilePath();
    const encrypted = await readFile(stateFile, "utf8");
    assert(!encrypted.includes("very-secret-cookie"), "state file should not contain plaintext session cookie");

    const state = await sessionStore.loadSessionState();
    assert(state.sessionCookie === "hydra_session=very-secret-cookie", "session cookie should survive roundtrip");
    assert(state.activationId === "act-integration-1", "activationId should survive roundtrip");
  } finally {
    process.env.HOME = originalHome;
  }
}

function testInstallGuide() {
  const debGuide = buildInstallGuide({
    target: "linux-x64",
    downloadedFilePath: "/tmp/hydra-cyber_1.2.3_amd64.deb",
  });
  assert(debGuide.command.includes("dpkg -i"), "deb install guide should use dpkg command");

  const appImageGuide = buildInstallGuide({
    target: "linux-x64",
    downloadedFilePath: "/tmp/HydraCyber-1.2.3.AppImage",
  });
  assert(appImageGuide.command.includes("chmod +x"), "AppImage guide should include chmod +x");

  const windowsGuide = buildInstallGuide({
    target: "windows-x64",
    downloadedFilePath: "C:/Users/test/Downloads/HydraCyberSetup.exe",
  });
  assert(windowsGuide.command.includes("Start-Process"), "Windows guide should use Start-Process");
}

async function run() {
  await testHttpRetries();
  await testHttpTimeout();
  await testEncryptedSessionState();
  testInstallGuide();

  console.log("hydra-cyber-desktop integration tests: OK");
}

void run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`hydra-cyber-desktop integration tests: FAIL -> ${message}`);
  process.exit(1);
});
