const { contextBridge, ipcRenderer } = require("electron");

const api = {
  getStatus: () => ipcRenderer.invoke("hydra:getStatus"),
  login: (email: string, password: string) => ipcRenderer.invoke("hydra:login", { email, password }),
  logout: () => ipcRenderer.invoke("hydra:logout"),
  whoami: () => ipcRenderer.invoke("hydra:whoami"),
  activateLicense: (licenseCode: string) => ipcRenderer.invoke("hydra:activateLicense", { licenseCode }),
  heartbeatOnce: () => ipcRenderer.invoke("hydra:heartbeatOnce"),
  startRuntime: (licenseCode?: string) => ipcRenderer.invoke("hydra:startRuntime", { licenseCode }),
  stopRuntime: () => ipcRenderer.invoke("hydra:stopRuntime"),
  listReleases: () => ipcRenderer.invoke("hydra:listReleases"),
  checkForUpdates: () => ipcRenderer.invoke("hydra:checkForUpdates"),
  startDownloadRecommended: () => ipcRenderer.invoke("hydra:startDownloadRecommended"),
  getDownloadStatus: () => ipcRenderer.invoke("hydra:getDownloadStatus"),
  downloadRecommendedRelease: () => ipcRenderer.invoke("hydra:downloadRecommendedRelease"),
  doctor: () => ipcRenderer.invoke("hydra:doctor"),
  runSelfTest: () => ipcRenderer.invoke("hydra:runSelfTest"),
  openPath: (filePath: string) => ipcRenderer.invoke("hydra:openPath", { filePath }),
  getInstallGuide: () => ipcRenderer.invoke("hydra:getInstallGuide"),
  copyText: (text: string) => ipcRenderer.invoke("hydra:copyText", { text }),
};

contextBridge.exposeInMainWorld("hydraDesktop", api);
