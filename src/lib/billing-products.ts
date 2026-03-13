export type ApiCreditPack = {
  id: string;
  name: string;
  description: string;
  price: number;
  credits: number;
  highlight?: boolean;
};

export type CliLicenseTier = {
  id: string;
  name: string;
  description: string;
  price: number;
  seatLimit: number;
  deviceLimit: number;
  updatesMonths: number;
  supportLabel: string;
  highlights: string[];
  highlight?: boolean;
};

export const apiCreditPacks: ApiCreditPack[] = [
  {
    id: "api-credit-500",
    name: "Pack 500",
    description: "Entrada rápida para começar integrações e validar consumo de texto, imagem e áudio.",
    price: 29,
    credits: 500,
  },
  {
    id: "api-credit-1500",
    name: "Pack 1500",
    description: "Melhor custo-benefício para times pequenos e operações com uso recorrente.",
    price: 79,
    credits: 1500,
    highlight: true,
  },
  {
    id: "api-credit-5000",
    name: "Pack 5000",
    description: "Reservado para ambientes mais intensos, com margem maior para imagem e áudio.",
    price: 229,
    credits: 5000,
  },
];

export const cliLicenseTiers: CliLicenseTier[] = [
  {
    id: "cli-starter",
    name: "Hydra Cyber Starter",
    description: "Entrada individual com terminal local, codex base, modo offline e ativação em 1 dispositivo.",
    price: 149,
    seatLimit: 1,
    deviceLimit: 1,
    updatesMonths: 12,
    supportLabel: "Suporte padrão",
    highlights: [
      "1 usuário / 1 dispositivo",
      "Modo offline para desenvolvimento local",
      "Codex base e dashboard web completo",
    ],
  },
  {
    id: "cli-pro",
    name: "Hydra Cyber Pro",
    description: "Plano individual premium com Hydra AI no app, laboratório híbrido e mais dispositivos por usuário.",
    price: 349,
    seatLimit: 1,
    deviceLimit: 3,
    updatesMonths: 12,
    supportLabel: "Suporte prioritário",
    highlights: [
      "1 usuário / até 3 dispositivos",
      "Hydra AI integrada ao app desktop",
      "Labs híbridos e telemetria avançada",
    ],
    highlight: true,
  },
  {
    id: "cli-team",
    name: "Hydra Cyber Team",
    description: "Pacote para equipes com gestão central de membros, billing compartilhado e auditoria operacional.",
    price: 1190,
    seatLimit: 5,
    deviceLimit: 15,
    updatesMonths: 12,
    supportLabel: "Suporte prioritário para equipe",
    highlights: [
      "Até 5 usuários / 15 dispositivos totais",
      "Gestão central de membros e permissões",
      "Relatórios de consumo por operador",
    ],
  },
  {
    id: "cli-enterprise",
    name: "Hydra Cyber Enterprise",
    description: "Operação corporativa com governança reforçada, suporte dedicado e publicação em nuvem do cliente.",
    price: 3990,
    seatLimit: 20,
    deviceLimit: 80,
    updatesMonths: 12,
    supportLabel: "Suporte dedicado Enterprise",
    highlights: [
      "Até 20 usuários / 80 dispositivos totais",
      "Publicação no cloud do cliente com PM2 + Nginx",
      "Onboarding técnico e trilha de compliance",
    ],
  },
];

export function getApiCreditPack(packId: string) {
  return apiCreditPacks.find((pack) => pack.id === packId) || null;
}

export function getCliLicenseTier(tierId: string) {
  return cliLicenseTiers.find((tier) => tier.id === tierId) || null;
}
