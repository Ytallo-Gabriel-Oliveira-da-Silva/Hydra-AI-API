import { basename } from "node:path";
import type { SupportedDesktopPlatform } from "./contracts.js";

function isDeb(file: string) {
  return file.toLowerCase().endsWith(".deb");
}

function isRpm(file: string) {
  return file.toLowerCase().endsWith(".rpm");
}

function isAppImage(file: string) {
  return file.toLowerCase().endsWith(".appimage");
}

function isDmg(file: string) {
  return file.toLowerCase().endsWith(".dmg");
}

function isZip(file: string) {
  return file.toLowerCase().endsWith(".zip");
}

export function buildInstallGuide(input: {
  target: SupportedDesktopPlatform;
  downloadedFilePath: string;
}) {
  const file = input.downloadedFilePath;
  const name = basename(file);

  if (input.target.startsWith("windows")) {
    return {
      title: "Instalação no Windows",
      steps: [
        `Arquivo baixado: ${name}`,
        "Feche o Hydra Cyber Desktop antes de instalar a atualização.",
        "Se for .zip, extraia para uma pasta e execute o instalador dentro dela.",
        "Se for .exe/.msi, execute como administrador quando necessário.",
      ],
      command: `Start-Process -FilePath \"${file}\"`,
    };
  }

  if (input.target.startsWith("macos")) {
    return {
      title: "Instalação no macOS",
      steps: [
        `Arquivo baixado: ${name}`,
        "Feche o Hydra Cyber Desktop antes de instalar a atualização.",
        isDmg(name)
          ? "Abra o .dmg, arraste Hydra Cyber para Applications e reabra o app."
          : "Se for .zip, extraia e mova o aplicativo para Applications.",
      ],
      command: `open \"${file}\"`,
    };
  }

  // Linux and Linux variants
  const linuxSteps = [
    `Arquivo baixado: ${name}`,
    "Feche o Hydra Cyber Desktop antes de instalar a atualização.",
  ];

  if (isDeb(name)) {
    linuxSteps.push("Instale via dpkg/apt para resolver dependências do pacote.");
    return {
      title: "Instalação no Linux (DEB)",
      steps: linuxSteps,
      command: `sudo dpkg -i \"${file}\" && sudo apt-get install -f -y`,
    };
  }

  if (isRpm(name)) {
    linuxSteps.push("Instale via rpm ou dnf/yum conforme sua distro.");
    return {
      title: "Instalação no Linux (RPM)",
      steps: linuxSteps,
      command: `sudo rpm -Uvh \"${file}\"`,
    };
  }

  if (isAppImage(name)) {
    linuxSteps.push("Dê permissão de execução e rode o AppImage.");
    return {
      title: "Execução no Linux (AppImage)",
      steps: linuxSteps,
      command: `chmod +x \"${file}\" && \"${file}\"`,
    };
  }

  if (isZip(name)) {
    linuxSteps.push("Extraia o .zip e execute o binário principal.");
    return {
      title: "Instalação no Linux (ZIP)",
      steps: linuxSteps,
      command: `unzip \"${file}\" -d .`,
    };
  }

  linuxSteps.push("Abra o arquivo baixado e siga o método de instalação da sua distro.");
  return {
    title: "Instalação no Linux",
    steps: linuxSteps,
    command: `xdg-open \"${file}\"`,
  };
}