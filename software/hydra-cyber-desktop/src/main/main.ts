import { app, BrowserWindow, clipboard, ipcMain, shell } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchCurrentUser, loginWithPassword, logoutSession } from "../core/auth-client.js";
import { activateDevice, fetchReleaseManifest, sendHeartbeat } from "../core/hydra-cyber-client.js";
import { runtimeConfig } from "../core/runtime-config.js";
import { clearSessionState, loadSessionState, saveSessionState } from "../core/session-store.js";
import { pickRecommendedRelease } from "../core/release-selector.js";
import { buildSystemProfile } from "../core/system-profile.js";
import { getUpdateStatus } from "../core/versioning.js";
import { appendRuntimeEvent } from "../core/runtime-telemetry.js";
import { getDownloadState, startDownload } from "./download-manager.js";
import { buildInstallGuide } from "../core/install-guide.js";

const APP_VERSION = app.getVersion() || "0.1.0";
const __dirname = dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let runtimeTimer: NodeJS.Timeout | null = null;
let runtimeStopped = true;
let runtimeFailureCount = 0;

function createWindow() {
  const preloadPath = join(__dirname, "preload.cjs");
  const htmlPath = join(__dirname, "..", "renderer", "index.html");

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 700,
    backgroundColor: "#030712",
    title: "Hydra Cyber",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(htmlPath).catch((error) => {
    console.error("Falha ao carregar renderer:", error);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function getReleaseContext() {
  const releases = await fetchReleaseManifest();
  const target = buildSystemProfile().target;
  const recommended = pickRecommendedRelease({
    releases,
    target,
    channel: runtimeConfig.updateChannel,
  });

  return { releases, target, recommended };
}

async function resolveSessionCookie() {
  const state = await loadSessionState();
  if (!state.sessionCookie) {
    throw new Error("Sessão não encontrada. Faça login no Hydra Cyber.");
  }
  return { state, sessionCookie: state.sessionCookie };
}

async function performHeartbeat() {
  const { state, sessionCookie } = await resolveSessionCookie();
  if (!state.activationId) {
    throw new Error("Ativação ausente. Ative uma licença antes de iniciar o runtime.");
  }

  const heartbeat = await sendHeartbeat({
    sessionCookie,
    activationId: state.activationId,
    appVersion: APP_VERSION,
  });

  await saveSessionState({
    activationId: state.activationId,
    lastHeartbeatAt: new Date().toISOString(),
  });

  return heartbeat;
}

async function ensureActivation(licenseCode?: string | null) {
  const { state, sessionCookie } = await resolveSessionCookie();

  if (state.activationId && !licenseCode) {
    return { activationId: state.activationId, licenseCode: state.licenseCode || null };
  }

  if (!licenseCode) {
    throw new Error("Licença necessária para ativar este dispositivo.");
  }

  const activation = await activateDevice({
    sessionCookie,
    licenseCode,
    appVersion: APP_VERSION,
  });

  await saveSessionState({
    activationId: activation.activationId,
    licenseCode: activation.licenseCode,
  });

  return { activationId: activation.activationId, licenseCode: activation.licenseCode };
}

function startRuntimeLoop() {
  if (runtimeTimer || !runtimeStopped) return;
  runtimeStopped = false;
  runtimeFailureCount = 0;

  const scheduleNext = (delayMs: number) => {
    runtimeTimer = setTimeout(() => {
      void tick();
    }, delayMs);
  };

  const tick = async () => {
    if (runtimeStopped) return;
    try {
      await performHeartbeat();
      runtimeFailureCount = 0;
      await appendRuntimeEvent({ level: "info", event: "runtime.heartbeat.ok" });
      scheduleNext(runtimeConfig.heartbeatIntervalMs);
    } catch (error) {
      runtimeFailureCount += 1;
      const backoff = Math.min(runtimeConfig.heartbeatIntervalMs * Math.pow(2, runtimeFailureCount), 300000);
      const message = toErrorMessage(error);
      console.error("Heartbeat runtime falhou:", message);
      await appendRuntimeEvent({
        level: "warn",
        event: "runtime.heartbeat.failed",
        details: { failureCount: runtimeFailureCount, backoffMs: backoff, message },
      });
      scheduleNext(backoff);
    }
  };

  void tick();
}

function stopRuntimeLoop() {
  runtimeStopped = true;
  if (runtimeTimer) {
    clearTimeout(runtimeTimer);
    runtimeTimer = null;
  }
}

async function buildStatus() {
  const state = await loadSessionState();
  return {
    session: {
      authenticated: Boolean(state.sessionCookie && state.user),
      email: state.user?.email || null,
      name: state.user?.name || null,
    },
    activation: {
      activationId: state.activationId,
      licenseCode: state.licenseCode,
      lastHeartbeatAt: state.lastHeartbeatAt,
    },
    runtime: {
      running: Boolean(runtimeTimer),
      heartbeatIntervalMs: runtimeConfig.heartbeatIntervalMs,
    },
  };
}

async function runSelfTestReport() {
  const state = await loadSessionState();
  const status = await buildStatus();

  let sessionOk = false;
  let sessionDetail = "Sessão local ausente";

  if (state.sessionCookie) {
    try {
      const user = await fetchCurrentUser(state.sessionCookie);
      sessionOk = true;
      sessionDetail = `Sessão válida para ${user.email}`;
    } catch (error) {
      sessionDetail = `Sessão inválida: ${toErrorMessage(error)}`;
    }
  }

  let releasesOk = false;
  let releasesDetail = "Falha ao consultar releases";
  let hasRecommendedRelease = false;
  try {
    const releases = await fetchReleaseManifest();
    const target = buildSystemProfile().target;
    const recommended = pickRecommendedRelease({
      releases,
      target,
      channel: runtimeConfig.updateChannel,
    });
    hasRecommendedRelease = Boolean(recommended);
    releasesOk = hasRecommendedRelease;
    releasesDetail = recommended
      ? `Release recomendada: ${recommended.version} (${target})`
      : `Sem release recomendada para ${target}`;
  } catch (error) {
    releasesDetail = toErrorMessage(error);
  }

  const runtimeOk = Boolean(state.activationId);
  const runtimeDetail = runtimeOk
    ? `Ativação ${state.activationId} pronta para heartbeat`
    : "Dispositivo ainda não ativado";

  let updateOk = false;
  let updateDetail = "Falha ao verificar atualização";
  try {
    const { recommended } = await getReleaseContext();
    const update = getUpdateStatus({
      currentVersion: APP_VERSION,
      recommendedRelease: recommended,
    });
    updateOk = true;
    updateDetail = update.hasUpdate
      ? `Atualização disponível para ${update.targetVersion || "versão mais recente"}`
      : update.reason;
  } catch (error) {
    updateDetail = toErrorMessage(error);
  }

  const download = getDownloadState();
  const downloadOk = download.status !== "failed";
  const downloadDetail = download.status === "failed"
    ? `Falha no download: ${download.error || "erro desconhecido"}`
    : download.status === "completed"
      ? `Último download concluído (${download.releaseVersion || "sem versão"})`
      : hasRecommendedRelease
        ? "Pipeline de download pronto"
        : "Sem release recomendada para testar download";

  return {
    ok: sessionOk && releasesOk && runtimeOk && updateOk && downloadOk,
    checks: {
      session: { ok: sessionOk, detail: sessionDetail },
      releases: { ok: releasesOk, detail: releasesDetail },
      runtime: { ok: runtimeOk, detail: runtimeDetail },
      update: { ok: updateOk, detail: updateDetail },
      download: { ok: downloadOk, detail: downloadDetail },
    },
    status,
    generatedAt: new Date().toISOString(),
  };
}

function registerIpcHandlers() {
  ipcMain.handle("hydra:getStatus", async () => buildStatus());

  ipcMain.handle("hydra:login", async (_event, payload: { email: string; password: string }) => {
    const result = await loginWithPassword({ email: payload.email, password: payload.password });
    await saveSessionState({
      sessionCookie: result.sessionCookie,
      user: result.user,
      activationId: null,
      licenseCode: null,
      lastHeartbeatAt: null,
    });
    await appendRuntimeEvent({ level: "info", event: "auth.login.success", details: { email: result.user.email } });
    return { ok: true, email: result.user.email };
  });

  ipcMain.handle("hydra:logout", async () => {
    const state = await loadSessionState();
    if (state.sessionCookie) {
      await logoutSession(state.sessionCookie);
    }
    stopRuntimeLoop();
    await clearSessionState();
    await appendRuntimeEvent({ level: "info", event: "auth.logout" });
    return { ok: true };
  });

  ipcMain.handle("hydra:whoami", async () => {
    const { sessionCookie } = await resolveSessionCookie();
    const user = await fetchCurrentUser(sessionCookie);
    await saveSessionState({ user });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: {
        slug: user.plan.slug,
        name: user.plan.name,
      },
    };
  });

  ipcMain.handle("hydra:activateLicense", async (_event, payload: { licenseCode: string }) => {
    const activation = await ensureActivation(payload.licenseCode);
    return { ok: true, activationId: activation.activationId, licenseCode: activation.licenseCode };
  });

  ipcMain.handle("hydra:heartbeatOnce", async () => {
    const heartbeat = await performHeartbeat();
    return { ok: true, lastHeartbeatAt: heartbeat.lastSeenAt };
  });

  ipcMain.handle("hydra:startRuntime", async (_event, payload: { licenseCode?: string }) => {
    const activation = await ensureActivation(payload.licenseCode || null);
    await performHeartbeat();
    startRuntimeLoop();
    await appendRuntimeEvent({
      level: "info",
      event: "runtime.started",
      details: { activationId: activation.activationId },
    });
    return { ok: true, activationId: activation.activationId };
  });

  ipcMain.handle("hydra:stopRuntime", async () => {
    stopRuntimeLoop();
    await appendRuntimeEvent({ level: "info", event: "runtime.stopped" });
    return { ok: true };
  });

  ipcMain.handle("hydra:listReleases", async () => {
    const { releases, target, recommended } = await getReleaseContext();

    const mapped = releases.map((item) => ({
      version: item.version,
      channel: item.channel,
      platform: item.platform,
      arch: item.arch,
      publishedAt: item.publishedAt,
      downloadUrl: item.downloadUrl,
      notes: item.notes,
      checksum: item.checksum,
    }));

    return {
      target,
      recommended: recommended
        ? {
            version: recommended.version,
            channel: recommended.channel,
            platform: recommended.platform,
            arch: recommended.arch,
            publishedAt: recommended.publishedAt,
            downloadUrl: recommended.downloadUrl,
            notes: recommended.notes,
          }
        : null,
      releases: mapped,
    };
  });

  ipcMain.handle("hydra:checkForUpdates", async () => {
    const { target, recommended } = await getReleaseContext();
    const update = getUpdateStatus({
      currentVersion: APP_VERSION,
      recommendedRelease: recommended,
    });

    return {
      currentVersion: APP_VERSION,
      target,
      update,
      recommended: recommended
        ? {
            version: recommended.version,
            channel: recommended.channel,
            platform: recommended.platform,
            arch: recommended.arch,
            publishedAt: recommended.publishedAt,
            downloadUrl: recommended.downloadUrl,
            notes: recommended.notes,
          }
        : null,
    };
  });

  ipcMain.handle("hydra:startDownloadRecommended", async () => {
    const { target, recommended } = await getReleaseContext();

    if (!recommended) {
      throw new Error(`Nenhuma release compatível encontrada para ${target}`);
    }

    const current = getDownloadState();
    if (current.status === "downloading") {
      return current;
    }

    void startDownload({
      release: recommended,
      targetDirectory: app.getPath("downloads"),
    }).then(async (result) => {
      await appendRuntimeEvent({
        level: result.status === "completed" ? "info" : "error",
        event: "release.download.finished",
        details: {
          status: result.status,
          releaseVersion: result.releaseVersion,
          path: result.filePath,
          error: result.error,
        },
      });
    });

    await appendRuntimeEvent({
      level: "info",
      event: "release.download.started",
      details: { target, version: recommended.version },
    });

    return getDownloadState();
  });

  ipcMain.handle("hydra:getDownloadStatus", async () => getDownloadState());

  ipcMain.handle("hydra:downloadRecommendedRelease", async () => {
    const { target, recommended } = await getReleaseContext();

    if (!recommended) {
      throw new Error(`Nenhuma release compatível encontrada para ${target}`);
    }

    const downloadResult = await startDownload({
      release: recommended,
      targetDirectory: app.getPath("downloads"),
    });

    if (downloadResult.status !== "completed" || !downloadResult.filePath) {
      throw new Error(downloadResult.error || "Falha ao baixar release recomendada");
    }

    return {
      ok: true,
      path: downloadResult.filePath,
      bytes: downloadResult.receivedBytes,
      checksumVerified: downloadResult.checksumVerified,
    };
  });

  ipcMain.handle("hydra:doctor", async () => {
    const report = await runSelfTestReport();

    return {
      ok: report.checks.session.ok && report.checks.releases.ok,
      checks: {
        session: report.checks.session,
        releases: report.checks.releases,
        runtime: report.checks.runtime,
      },
    };
  });

  ipcMain.handle("hydra:runSelfTest", async () => {
    const report = await runSelfTestReport();
    await appendRuntimeEvent({
      level: report.ok ? "info" : "warn",
      event: "runtime.self_test.completed",
      details: {
        ok: report.ok,
        generatedAt: report.generatedAt,
        checks: report.checks,
      },
    });
    return report;
  });

  ipcMain.handle("hydra:openPath", async (_event, payload: { filePath: string }) => {
    if (!payload?.filePath) {
      throw new Error("Caminho inválido para abrir");
    }
    await shell.openPath(payload.filePath);
    return { ok: true };
  });

  ipcMain.handle("hydra:getInstallGuide", async () => {
    const target = buildSystemProfile().target;
    const download = getDownloadState();
    if (!download.filePath) {
      throw new Error("Nenhum arquivo baixado disponível para gerar guia de instalação");
    }

    return buildInstallGuide({
      target,
      downloadedFilePath: download.filePath,
    });
  });

  ipcMain.handle("hydra:copyText", async (_event, payload: { text: string }) => {
    if (!payload?.text?.trim()) {
      throw new Error("Texto inválido para copiar");
    }
    clipboard.writeText(payload.text);
    return { ok: true };
  });
}

function wireLifecycle() {
  app.whenReady().then(() => {
    registerIpcHandlers();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("before-quit", () => {
    stopRuntimeLoop();
  });

  process.on("uncaughtException", (error) => {
    console.error("uncaughtException:", toErrorMessage(error));
  });

  process.on("unhandledRejection", (error) => {
    console.error("unhandledRejection:", toErrorMessage(error));
  });
}

wireLifecycle();
