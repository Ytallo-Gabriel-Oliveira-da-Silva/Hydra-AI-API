import { compareVersions, getUpdateStatus } from "../src/core/versioning.js";
import { pickRecommendedRelease } from "../src/core/release-selector.js";
import { encryptPayload, decryptPayload } from "../src/core/state-crypto.js";
import { buildInstallGuide } from "../src/core/install-guide.js";

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  // Versioning
  assert(compareVersions("0.2.0", "0.1.9") > 0, "compareVersions should detect newer version");
  assert(compareVersions("1.0.0", "1.0.0") === 0, "compareVersions should detect equal version");
  assert(compareVersions("1.0.0", "1.2.0") < 0, "compareVersions should detect older version");

  const update = getUpdateStatus({
    currentVersion: "0.1.0",
    recommendedRelease: {
      version: "0.2.0",
      channel: "stable",
      platform: "linux",
      arch: "x64",
      downloadUrl: "https://example.com/app.tar.gz",
      checksum: null,
      notes: null,
      publishedAt: new Date().toISOString(),
    },
  });
  assert(update.hasUpdate, "getUpdateStatus should mark update available");

  // Release selector
  const selected = pickRecommendedRelease({
    target: "linux-x64",
    channel: "stable",
    releases: [
      {
        version: "0.1.0",
        channel: "stable",
        platform: "linux",
        arch: "x64",
        downloadUrl: "https://example.com/linux-x64.tar.gz",
        checksum: null,
        notes: null,
        publishedAt: new Date().toISOString(),
      },
      {
        version: "0.1.0",
        channel: "stable",
        platform: "windows",
        arch: "x64",
        downloadUrl: "https://example.com/windows.zip",
        checksum: null,
        notes: null,
        publishedAt: new Date().toISOString(),
      },
    ],
  });
  assert(Boolean(selected), "pickRecommendedRelease should return a compatible release");
  assert(selected?.platform === "linux", "pickRecommendedRelease should match platform");

  // Encryption/decryption
  const raw = JSON.stringify({ sessionCookie: "hydra_session=fake", updatedAt: new Date().toISOString() });
  const encrypted = await encryptPayload(raw);
  const decrypted = await decryptPayload(encrypted);
  assert(decrypted === raw, "decryptPayload should return original payload");

  // Install guide
  const guide = buildInstallGuide({
    target: "linux-x64",
    downloadedFilePath: "/tmp/hydra-cyber_0.2.0_amd64.deb",
  });
  assert(guide.command.includes("dpkg -i"), "buildInstallGuide should return deb install command");

  console.log("hydra-cyber-desktop smoke tests: OK");
}

void run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`hydra-cyber-desktop smoke tests: FAIL -> ${message}`);
  process.exit(1);
});
