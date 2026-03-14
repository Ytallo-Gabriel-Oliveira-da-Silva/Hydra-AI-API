import { fetchCurrentUser, loginWithPassword, logoutSession } from "./auth-client.js";
import { activateDevice, fetchReleaseManifest, sendHeartbeat } from "./hydra-cyber-client.js";
import { runtimeConfig } from "./runtime-config.js";
import { clearSessionState, getSessionFilePath, loadSessionState, saveSessionState } from "./session-store.js";
import { buildSystemProfile } from "./system-profile.js";
import { pickRecommendedRelease } from "./release-selector.js";
import { appendRuntimeEvent, getTelemetryPath } from "./runtime-telemetry.js";
import { getUpdateStatus } from "./versioning.js";

const APP_VERSION = process.env.HYDRA_CYBER_APP_VERSION || "0.1.0-dev";

function parseOption(args: string[], name: string) {
  const index = args.findIndex((item) => item === `--${name}`);
  if (index < 0) return null;
  return args[index + 1] || null;
}

function requireOption(args: string[], name: string) {
  const value = parseOption(args, name);
  if (!value) {
    throw new Error(`Parâmetro obrigatório ausente: --${name}`);
  }
  return value;
}

export async function commandLogin(args: string[]) {
  const email = requireOption(args, "email");
  const password = requireOption(args, "password");
  const result = await loginWithPassword({ email, password });
  await saveSessionState({
    sessionCookie: result.sessionCookie,
    user: result.user,
  });
  console.log(`Login concluído para ${result.user.email}`);
}

export async function commandWhoami() {
  const state = await loadSessionState();
  if (!state.sessionCookie) {
    throw new Error("Nenhuma sessão local encontrada. Use: login --email ... --password ...");
  }
  const user = await fetchCurrentUser(state.sessionCookie);
  await saveSessionState({ user });
  console.log(JSON.stringify({ user }, null, 2));
}

export async function commandLogout() {
  const state = await loadSessionState();
  if (state.sessionCookie) {
    await logoutSession(state.sessionCookie);
  }
  await clearSessionState();
  console.log("Sessão local encerrada.");
}

export async function commandActivate(args: string[]) {
  const state = await loadSessionState();
  if (!state.sessionCookie) {
    throw new Error("Faça login antes de ativar o dispositivo.");
  }

  const licenseCode = requireOption(args, "license");
  const activation = await activateDevice({
    sessionCookie: state.sessionCookie,
    licenseCode,
    appVersion: APP_VERSION,
  });

  await saveSessionState({
    activationId: activation.activationId,
    licenseCode: activation.licenseCode,
  });

  console.log(JSON.stringify({ activation }, null, 2));
}

export async function commandHeartbeat(args: string[]) {
  const state = await loadSessionState();
  if (!state.sessionCookie) {
    throw new Error("Faça login antes de enviar heartbeat.");
  }

  const activationId = parseOption(args, "activation") || state.activationId;
  if (!activationId) {
    throw new Error("Nenhuma ativação encontrada. Use activate --license ... ou informe --activation ...");
  }

  const heartbeat = await sendHeartbeat({
    sessionCookie: state.sessionCookie,
    activationId,
    appVersion: APP_VERSION,
  });

  await saveSessionState({
    activationId,
    lastHeartbeatAt: new Date().toISOString(),
  });

  console.log(JSON.stringify({ heartbeat }, null, 2));
}

export async function commandRun(args: string[]) {
  const state = await loadSessionState();
  if (!state.sessionCookie) {
    throw new Error("Faça login antes de iniciar o runtime.");
  }

  let activationId = state.activationId;
  const explicitLicense = parseOption(args, "license");
  if (!activationId || explicitLicense) {
    if (!explicitLicense) {
      throw new Error("Nenhuma ativação local. Informe --license para ativar este dispositivo.");
    }
    const activation = await activateDevice({
      sessionCookie: state.sessionCookie,
      licenseCode: explicitLicense,
      appVersion: APP_VERSION,
    });
    activationId = activation.activationId;
    await saveSessionState({
      activationId,
      licenseCode: activation.licenseCode,
    });
    console.log(`Dispositivo ativado: ${activation.activationId}`);
  }

  if (!activationId) {
    throw new Error("Falha ao resolver activationId para o runtime.");
  }

  console.log(`Hydra Cyber runtime iniciado com heartbeat a cada ${runtimeConfig.heartbeatIntervalMs}ms`);
  console.log("Use Ctrl+C para encerrar com segurança.");
  await appendRuntimeEvent({ level: "info", event: "cli.runtime.started" });

  let stopped = false;
  let failureCount = 0;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    console.log("Encerrando runtime Hydra Cyber...");
    void appendRuntimeEvent({ level: "info", event: "cli.runtime.stopped" });
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  const tick = async () => {
    if (stopped) return;
    const heartbeat = await sendHeartbeat({
      sessionCookie: state.sessionCookie as string,
      activationId,
      appVersion: APP_VERSION,
    });
    await saveSessionState({
      activationId,
      lastHeartbeatAt: new Date().toISOString(),
    });
    failureCount = 0;
    await appendRuntimeEvent({ level: "info", event: "cli.runtime.heartbeat.ok" });
    console.log(`heartbeat ok: ${heartbeat.lastSeenAt || "sem timestamp"}`);
  };

  await tick();
  const schedule = (delayMs: number) => {
    const timer = setTimeout(() => {
      if (stopped) {
        clearTimeout(timer);
        process.exit(0);
        return;
      }

      void tick()
        .then(() => {
          schedule(runtimeConfig.heartbeatIntervalMs);
        })
        .catch(async (error) => {
          failureCount += 1;
          const message = error instanceof Error ? error.message : String(error);
          const backoff = Math.min(runtimeConfig.heartbeatIntervalMs * Math.pow(2, failureCount), 300000);
          console.error(`heartbeat falhou: ${message}`);
          await appendRuntimeEvent({
            level: "warn",
            event: "cli.runtime.heartbeat.failed",
            details: { failureCount, backoffMs: backoff, message },
          });
          schedule(backoff);
        });
    }, delayMs);
  };

  schedule(runtimeConfig.heartbeatIntervalMs);
}

export async function commandReleases() {
  const releases = await fetchReleaseManifest();
  const target = buildSystemProfile().target;
  const recommended = pickRecommendedRelease({
    releases,
    target,
    channel: runtimeConfig.updateChannel,
  });

  console.log(JSON.stringify({
    target,
    channel: runtimeConfig.updateChannel,
    recommended,
    releases,
  }, null, 2));
}

export async function commandCheckUpdates() {
  const releases = await fetchReleaseManifest();
  const target = buildSystemProfile().target;
  const recommended = pickRecommendedRelease({
    releases,
    target,
    channel: runtimeConfig.updateChannel,
  });

  const update = getUpdateStatus({
    currentVersion: APP_VERSION,
    recommendedRelease: recommended,
  });

  console.log(JSON.stringify({
    currentVersion: APP_VERSION,
    target,
    update,
    recommended,
  }, null, 2));
}

export async function commandStatus() {
  const state = await loadSessionState();
  const profile = buildSystemProfile();
  console.log(JSON.stringify({
    appVersion: APP_VERSION,
    mode: runtimeConfig.runtimeMode,
    webBaseUrl: runtimeConfig.webBaseUrl,
    apiBaseUrl: runtimeConfig.apiBaseUrl,
    releasesBaseUrl: runtimeConfig.releasesBaseUrl,
    runtimeStateFile: getSessionFilePath(),
    runtimeTelemetryFile: getTelemetryPath(),
    system: profile,
    state,
  }, null, 2));
}

export async function commandSelfTest() {
  const state = await loadSessionState();

  let sessionOk = false;
  let sessionDetail = "Sessão local ausente";
  if (state.sessionCookie) {
    try {
      const user = await fetchCurrentUser(state.sessionCookie);
      sessionOk = true;
      sessionDetail = `Sessão válida para ${user.email}`;
    } catch (error) {
      sessionDetail = `Sessão inválida: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  let releasesOk = false;
  let releasesDetail = "Falha ao consultar releases";
  let recommendedVersion: string | null = null;
  try {
    const releases = await fetchReleaseManifest();
    const target = buildSystemProfile().target;
    const recommended = pickRecommendedRelease({
      releases,
      target,
      channel: runtimeConfig.updateChannel,
    });
    releasesOk = Boolean(recommended);
    recommendedVersion = recommended?.version || null;
    releasesDetail = recommended
      ? `Release recomendada: ${recommended.version} (${target})`
      : `Sem release recomendada para ${target}`;
  } catch (error) {
    releasesDetail = error instanceof Error ? error.message : String(error);
  }

  const runtimeOk = Boolean(state.activationId);
  const runtimeDetail = runtimeOk
    ? `Ativação ${state.activationId} pronta para heartbeat`
    : "Dispositivo ainda não ativado";

  let updateOk = false;
  let updateDetail = "Falha ao verificar atualização";
  try {
    const releases = await fetchReleaseManifest();
    const target = buildSystemProfile().target;
    const recommended = pickRecommendedRelease({
      releases,
      target,
      channel: runtimeConfig.updateChannel,
    });
    const update = getUpdateStatus({
      currentVersion: APP_VERSION,
      recommendedRelease: recommended,
    });
    updateOk = true;
    updateDetail = update.hasUpdate
      ? `Atualização disponível para ${update.targetVersion || "versão mais recente"}`
      : update.reason;
  } catch (error) {
    updateDetail = error instanceof Error ? error.message : String(error);
  }

  const report = {
    ok: sessionOk && releasesOk && runtimeOk && updateOk,
    generatedAt: new Date().toISOString(),
    checks: {
      session: { ok: sessionOk, detail: sessionDetail },
      releases: { ok: releasesOk, detail: releasesDetail },
      runtime: { ok: runtimeOk, detail: runtimeDetail },
      update: { ok: updateOk, detail: updateDetail },
    },
    context: {
      appVersion: APP_VERSION,
      recommendedVersion,
      runtimeStateFile: getSessionFilePath(),
      runtimeTelemetryFile: getTelemetryPath(),
    },
  };

  await appendRuntimeEvent({
    level: report.ok ? "info" : "warn",
    event: "cli.runtime.self_test.completed",
    details: report,
  });

  console.log(JSON.stringify(report, null, 2));
}

export function printHelp() {
  console.log(`Hydra Cyber Desktop - comandos

  login --email <email> --password <senha>
  whoami
  activate --license <codigo>
  heartbeat [--activation <id>]
  run [--license <codigo>]
  releases
  check-updates
  status
  self-test
  logout
  help
`);
}