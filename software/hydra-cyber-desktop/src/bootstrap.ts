import { plannedTargets } from "./core/platform-targets.js";
import { runtimeConfig } from "./core/runtime-config.js";
import { buildSystemProfile } from "./core/system-profile.js";
import {
  commandActivate,
  commandCheckUpdates,
  commandHeartbeat,
  commandLogin,
  commandLogout,
  commandReleases,
  commandRun,
  commandSelfTest,
  commandStatus,
  commandWhoami,
  printHelp,
} from "./core/desktop-runtime.js";

function logBootstrapSummary() {
  const profile = buildSystemProfile();
  console.log(`[${runtimeConfig.productName}] bootstrap inicial carregado`);
  console.log(`modo: ${runtimeConfig.runtimeMode}`);
  console.log(`target atual: ${profile.target}`);
  console.log(`kernel: ${profile.kernel}`);
  console.log(`web: ${runtimeConfig.webBaseUrl}`);
  console.log(`api: ${runtimeConfig.apiBaseUrl}`);
  console.log(`targets planejados: ${plannedTargets.join(", ")}`);
}

async function main() {
  logBootstrapSummary();

  const [, , command = "help", ...args] = process.argv;

  switch (command) {
    case "login":
      await commandLogin(args);
      break;
    case "whoami":
      await commandWhoami();
      break;
    case "activate":
      await commandActivate(args);
      break;
    case "heartbeat":
      await commandHeartbeat(args);
      break;
    case "run":
      await commandRun(args);
      break;
    case "releases":
      await commandReleases();
      break;
    case "check-updates":
      await commandCheckUpdates();
      break;
    case "status":
      await commandStatus();
      break;
    case "self-test":
      await commandSelfTest();
      break;
    case "logout":
      await commandLogout();
      break;
    case "help":
    default:
      printHelp();
      break;
  }
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`erro: ${message}`);
  process.exit(1);
});