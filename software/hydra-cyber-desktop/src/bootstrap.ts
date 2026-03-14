import { plannedTargets } from "./core/platform-targets.js";
import { runtimeConfig } from "./core/runtime-config.js";
import { buildSystemProfile } from "./core/system-profile.js";

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

logBootstrapSummary();