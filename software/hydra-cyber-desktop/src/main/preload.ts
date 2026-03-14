import { contextBridge, ipcRenderer } from "electron";
import type { HydraDesktopApi } from "./ipc-types.js";

const api: HydraDesktopApi = {
  getStatus: () => ipcRenderer.invoke("hydra:getStatus"),
  login: (email, password) => ipcRenderer.invoke("hydra:login", { email, password }),
  logout: () => ipcRenderer.invoke("hydra:logout"),
  whoami: () => ipcRenderer.invoke("hydra:whoami"),
  activateLicense: (licenseCode) => ipcRenderer.invoke("hydra:activateLicense", { licenseCode }),
  heartbeatOnce: () => ipcRenderer.invoke("hydra:heartbeatOnce"),
  startRuntime: (licenseCode) => ipcRenderer.invoke("hydra:startRuntime", { licenseCode }),
  stopRuntime: () => ipcRenderer.invoke("hydra:stopRuntime"),
  listReleases: () => ipcRenderer.invoke("hydra:listReleases"),
  checkForUpdates: () => ipcRenderer.invoke("hydra:checkForUpdates"),
  startDownloadRecommended: () => ipcRenderer.invoke("hydra:startDownloadRecommended"),
  getDownloadStatus: () => ipcRenderer.invoke("hydra:getDownloadStatus"),
  downloadRecommendedRelease: () => ipcRenderer.invoke("hydra:downloadRecommendedRelease"),
  doctor: () => ipcRenderer.invoke("hydra:doctor"),
  runSelfTest: () => ipcRenderer.invoke("hydra:runSelfTest"),
  openPath: (filePath) => ipcRenderer.invoke("hydra:openPath", { filePath }),
  getInstallGuide: () => ipcRenderer.invoke("hydra:getInstallGuide"),
  copyText: (text) => ipcRenderer.invoke("hydra:copyText", { text }),
};

contextBridge.exposeInMainWorld("hydraDesktop", api);
