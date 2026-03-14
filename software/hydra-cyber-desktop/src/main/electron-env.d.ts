import type { HydraDesktopApi } from "./ipc-types.js";

declare global {
  interface Window {
    hydraDesktop: import("./ipc-types.js").HydraDesktopApi;
  }
}

export {};
