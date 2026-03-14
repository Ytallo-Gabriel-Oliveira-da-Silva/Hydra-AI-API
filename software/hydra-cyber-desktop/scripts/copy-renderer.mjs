import { cp, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..");
const sourceDir = resolve(projectRoot, "src", "renderer");
const targetDir = resolve(projectRoot, "dist", "renderer");

await mkdir(targetDir, { recursive: true });
await cp(sourceDir, targetDir, { recursive: true });
console.log("Renderer copiado para dist/renderer");
