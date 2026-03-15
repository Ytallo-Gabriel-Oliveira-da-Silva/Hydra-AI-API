const ui = {
  statusBox: document.getElementById("status-box"),
  console: document.getElementById("console"),
  releases: document.getElementById("releases"),
  recommendedRelease: document.getElementById("recommended-release"),
  downloadStatus: document.getElementById("download-status"),
  installGuide: document.getElementById("install-guide"),
  loginEmail: document.getElementById("login-email"),
  loginPassword: document.getElementById("login-password"),
  licenseCode: document.getElementById("license-code"),
  btnRefreshStatus: document.getElementById("btn-refresh-status"),
  btnHeartbeat: document.getElementById("btn-heartbeat"),
  btnDoctor: document.getElementById("btn-doctor"),
  btnSelfTest: document.getElementById("btn-self-test"),
  btnLogin: document.getElementById("btn-login"),
  btnWhoami: document.getElementById("btn-whoami"),
  btnLogout: document.getElementById("btn-logout"),
  btnActivate: document.getElementById("btn-activate"),
  btnStartRuntime: document.getElementById("btn-start-runtime"),
  btnStopRuntime: document.getElementById("btn-stop-runtime"),
  btnReleases: document.getElementById("btn-releases"),
  btnCheckUpdates: document.getElementById("btn-check-updates"),
  btnDownloadRecommended: document.getElementById("btn-download-recommended"),
  btnInstallGuide: document.getElementById("btn-install-guide"),
  btnCopyInstallCommand: document.getElementById("btn-copy-install-command"),
};

let downloadPollTimer = null;
let lastInstallGuide = null;

function desktopApi() {
  const api = window.hydraDesktop;
  if (!api) {
    throw new Error("Bridge do desktop indisponível. Reinstale/atualize para a build mais recente.");
  }
  return api;
}

function log(message, payload) {
  const line = payload ? `${message}\n${JSON.stringify(payload, null, 2)}` : message;
  const now = new Date().toLocaleTimeString();
  ui.console.textContent = `[${now}] ${line}\n\n` + ui.console.textContent;
}

function renderStatus(status) {
  ui.statusBox.innerHTML = `
    <p><strong>Autenticado:</strong> ${status.session.authenticated ? "sim" : "não"}</p>
    <p><strong>Usuário:</strong> ${status.session.email || "-"}</p>
    <p><strong>Ativação:</strong> ${status.activation.activationId || "-"}</p>
    <p><strong>Runtime:</strong> ${status.runtime.running ? "rodando" : "parado"}</p>
    <p><strong>Último heartbeat:</strong> ${status.activation.lastHeartbeatAt || "-"}</p>
  `;
}

async function refreshStatus() {
  const status = await desktopApi().getStatus();
  renderStatus(status);
  return status;
}

async function guarded(name, task) {
  try {
    const result = await task();
    log(`${name}: OK`, result);
    await refreshStatus();
    return result;
  } catch (error) {
    log(`${name}: FALHA`, { error: error?.message || String(error) });
    return null;
  }
}

ui.btnRefreshStatus.addEventListener("click", () => void guarded("status", refreshStatus));
ui.btnHeartbeat.addEventListener("click", () => void guarded("heartbeat", () => desktopApi().heartbeatOnce()));
ui.btnDoctor.addEventListener("click", () => void guarded("doctor", () => desktopApi().doctor()));
ui.btnSelfTest.addEventListener("click", () => void guarded("self-test", () => desktopApi().runSelfTest()));

ui.btnLogin.addEventListener("click", () => {
  const email = ui.loginEmail.value.trim();
  const password = ui.loginPassword.value;
  void guarded("login", () => desktopApi().login(email, password));
});

ui.btnWhoami.addEventListener("click", () => void guarded("whoami", () => desktopApi().whoami()));
ui.btnLogout.addEventListener("click", () => void guarded("logout", () => desktopApi().logout()));

ui.btnActivate.addEventListener("click", () => {
  const licenseCode = ui.licenseCode.value.trim();
  void guarded("activate", () => desktopApi().activateLicense(licenseCode));
});

ui.btnStartRuntime.addEventListener("click", () => {
  const licenseCode = ui.licenseCode.value.trim();
  void guarded("runtime:start", () => desktopApi().startRuntime(licenseCode || undefined));
});

ui.btnStopRuntime.addEventListener("click", () => void guarded("runtime:stop", () => desktopApi().stopRuntime()));

ui.btnReleases.addEventListener("click", async () => {
  const data = await guarded("releases", () => desktopApi().listReleases());
  if (!data) return;
  ui.releases.innerHTML = "";
  ui.recommendedRelease.innerHTML = "";

  if (data.recommended) {
    ui.recommendedRelease.innerHTML = `
      <div><strong>Recomendada para ${data.target}:</strong> ${data.recommended.version} (${data.recommended.channel})</div>
      <div>${data.recommended.platform}/${data.recommended.arch}</div>
      <div>${data.recommended.downloadUrl ? `<a href="${data.recommended.downloadUrl}" target="_blank" rel="noreferrer">download direto</a>` : "download indisponível"}</div>
    `;
  } else {
    ui.recommendedRelease.textContent = `Sem release recomendada para ${data.target}.`;
  }

  data.releases.forEach((release) => {
    const item = document.createElement("div");
    item.className = "release-item";

    const link = release.downloadUrl
      ? `<a href="${release.downloadUrl}" target="_blank" rel="noreferrer">download</a>`
      : "download indisponível";

    item.innerHTML = `
      <strong>${release.version}</strong> (${release.channel})<br/>
      ${release.platform}/${release.arch}<br/>
      ${new Date(release.publishedAt).toLocaleString()}<br/>
      ${link}
      ${release.notes ? `<div>${release.notes}</div>` : ""}
    `;

    ui.releases.appendChild(item);
  });
});

ui.btnCheckUpdates.addEventListener("click", () => {
  void guarded("updates", async () => {
    const data = await desktopApi().checkForUpdates();
    ui.recommendedRelease.innerHTML = `
      <div><strong>Versão atual:</strong> ${data.currentVersion}</div>
      <div><strong>Target:</strong> ${data.target}</div>
      <div><strong>Status:</strong> ${data.update.reason}</div>
      ${data.recommended ? `<div><strong>Release alvo:</strong> ${data.recommended.version} (${data.recommended.channel})</div>` : ""}
    `;
    return data;
  });
});

function stopDownloadPolling() {
  if (downloadPollTimer) {
    clearInterval(downloadPollTimer);
    downloadPollTimer = null;
  }
}

function renderDownloadStatus(status) {
  const total = status.totalBytes || 0;
  const current = status.receivedBytes || 0;
  const ratio = total > 0 ? `${status.progress}% (${current}/${total} bytes)` : `${current} bytes`;

  ui.downloadStatus.innerHTML = `
    <div><strong>Download:</strong> ${status.status}</div>
    <div><strong>Versão:</strong> ${status.releaseVersion || "-"}</div>
    <div><strong>Progresso:</strong> ${ratio}</div>
    ${status.filePath ? `<div><strong>Arquivo:</strong> ${status.filePath}</div>` : ""}
    ${status.error ? `<div class="download-error"><strong>Erro:</strong> ${status.error}</div>` : ""}
  `;
}

function renderInstallGuide(guide) {
  ui.installGuide.innerHTML = `
    <div><strong>${guide.title}</strong></div>
    <ol>
      ${guide.steps.map((step) => `<li>${step}</li>`).join("")}
    </ol>
    <div><strong>Comando sugerido:</strong></div>
    <pre>${guide.command}</pre>
  `;
}

ui.btnDownloadRecommended.addEventListener("click", () => {
  void guarded("download:recommended", async () => {
    stopDownloadPolling();
    const initial = await desktopApi().startDownloadRecommended();
    renderDownloadStatus(initial);

    downloadPollTimer = setInterval(() => {
      void desktopApi().getDownloadStatus().then(async (status) => {
        renderDownloadStatus(status);
        if (status.status === "completed") {
          stopDownloadPolling();
          if (status.filePath) {
            await desktopApi().openPath(status.filePath);
          }
        }
        if (status.status === "failed") {
          stopDownloadPolling();
        }
      }).catch((error) => {
        stopDownloadPolling();
        log("download:status FALHA", { error: error?.message || String(error) });
      });
    }, 1000);

    return initial;
  });
});

ui.btnInstallGuide.addEventListener("click", () => {
  void guarded("install:guide", async () => {
    const guide = await desktopApi().getInstallGuide();
    lastInstallGuide = guide;
    renderInstallGuide(guide);
    return guide;
  });
});

ui.btnCopyInstallCommand.addEventListener("click", () => {
  void guarded("install:copy-command", async () => {
    if (!lastInstallGuide?.command) {
      throw new Error("Carregue o guia de instalação antes de copiar o comando");
    }
    await desktopApi().copyText(lastInstallGuide.command);
    return { copied: true, command: lastInstallGuide.command };
  });
});

void refreshStatus().catch((error) => {
  log("status:init FALHA", { error: error?.message || String(error) });
  ui.statusBox.innerHTML = `
    <p><strong>Status:</strong> indisponível</p>
    <p><strong>Detalhe:</strong> falha ao carregar status inicial</p>
  `;
});

if (!window.hydraDesktop) {
  log("bridge:init FALHA", {
    error: "window.hydraDesktop não foi exposto pelo preload",
  });
  ui.statusBox.innerHTML = `
    <p><strong>Status:</strong> bridge indisponível</p>
    <p><strong>Ação:</strong> baixe a build mais recente do app</p>
  `;
}

log("Hydra Cyber Desktop UI inicializada");
