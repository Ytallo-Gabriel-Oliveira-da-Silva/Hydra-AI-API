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
    name: "CLI Starter",
    description: "Licença individual para uso profissional do Hydra CLI com updates por 12 meses.",
    price: 149,
    seatLimit: 1,
    deviceLimit: 2,
    updatesMonths: 12,
    supportLabel: "Suporte padrão",
  },
  {
    id: "cli-pro",
    name: "CLI Pro",
    description: "Mais dispositivos, prioridade operacional e base mais forte para uso intensivo.",
    price: 349,
    seatLimit: 1,
    deviceLimit: 5,
    updatesMonths: 12,
    supportLabel: "Suporte prioritário",
    highlight: true,
  },
];

export function getApiCreditPack(packId: string) {
  return apiCreditPacks.find((pack) => pack.id === packId) || null;
}

export function getCliLicenseTier(tierId: string) {
  return cliLicenseTiers.find((tier) => tier.id === tierId) || null;
}
