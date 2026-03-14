export type HydraDesktopStatus = {
  session: {
    authenticated: boolean;
    email: string | null;
    name: string | null;
  };
  activation: {
    activationId: string | null;
    licenseCode: string | null;
    lastHeartbeatAt: string | null;
  };
  runtime: {
    running: boolean;
    heartbeatIntervalMs: number;
  };
};

export type HydraDesktopApi = {
  getStatus: () => Promise<HydraDesktopStatus>;
  login: (email: string, password: string) => Promise<{ ok: true; email: string }>;
  logout: () => Promise<{ ok: true }>;
  whoami: () => Promise<{ id: string; email: string; name: string; plan: { slug: string; name: string } }>;
  activateLicense: (licenseCode: string) => Promise<{ ok: true; activationId: string; licenseCode: string }>;
  heartbeatOnce: () => Promise<{ ok: true; lastHeartbeatAt: string | null }>;
  startRuntime: (licenseCode?: string) => Promise<{ ok: true; activationId: string }>;
  stopRuntime: () => Promise<{ ok: true }>;
  listReleases: () => Promise<{
    target: string;
    recommended: { version: string; channel: string; platform: string; arch: string; publishedAt: string; downloadUrl: string | null; notes: string | null } | null;
    releases: Array<{ version: string; channel: string; platform: string; arch: string; publishedAt: string; downloadUrl: string | null; notes: string | null }>;
  }>;
  checkForUpdates: () => Promise<{
    currentVersion: string;
    target: string;
    update: { hasUpdate: boolean; reason: string; targetVersion: string | null };
    recommended: { version: string; channel: string; platform: string; arch: string; publishedAt: string; downloadUrl: string | null; notes: string | null } | null;
  }>;
  startDownloadRecommended: () => Promise<{
    id: string;
    status: "idle" | "downloading" | "completed" | "failed";
    releaseVersion: string | null;
    progress: number;
    receivedBytes: number;
    totalBytes: number | null;
    filePath: string | null;
    checksumVerified: boolean;
    error: string | null;
  }>;
  getDownloadStatus: () => Promise<{
    id: string;
    status: "idle" | "downloading" | "completed" | "failed";
    releaseVersion: string | null;
    progress: number;
    receivedBytes: number;
    totalBytes: number | null;
    filePath: string | null;
    checksumVerified: boolean;
    error: string | null;
  }>;
  downloadRecommendedRelease: () => Promise<{ ok: true; path: string; bytes: number; checksumVerified: boolean }>;
  doctor: () => Promise<{
    ok: boolean;
    checks: {
      session: { ok: boolean; detail: string };
      releases: { ok: boolean; detail: string };
      runtime: { ok: boolean; detail: string };
    };
  }>;
  runSelfTest: () => Promise<{
    ok: boolean;
    checks: {
      session: { ok: boolean; detail: string };
      releases: { ok: boolean; detail: string };
      runtime: { ok: boolean; detail: string };
      update: { ok: boolean; detail: string };
      download: { ok: boolean; detail: string };
    };
    status: HydraDesktopStatus;
    generatedAt: string;
  }>;
  openPath: (filePath: string) => Promise<{ ok: true }>;
  getInstallGuide: () => Promise<{ title: string; steps: string[]; command: string }>;
  copyText: (text: string) => Promise<{ ok: true }>;
};
