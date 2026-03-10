export type HydraVoiceOption = {
  id: string;
  label: string;
  description: string;
  previewText: string;
};

export const hydraVoiceOptions: HydraVoiceOption[] = [
  {
    id: "dtSEyYGNJqjrtBArPCVZ",
    label: "Titã",
    description: "Grave, firme e cinematográfica para respostas fortes.",
    previewText: "Olá, eu sou a voz Titã da HYDRA AI. Pronta para responder com presença.",
  },
  {
    id: "tMXujoAjiboschVOhAnk",
    label: "Clara",
    description: "Natural, limpa e equilibrada para conversas gerais.",
    previewText: "Olá, eu sou a voz Clara da HYDRA AI. Minha fala é clara e confortável.",
  },
  {
    id: "xKhbyU7E3bC6T89Kn26c",
    label: "Adam",
    description: "Masculina, objetiva e moderna para assistentes técnicos.",
    previewText: "Olá, eu sou a voz Adam da HYDRA AI. Posso explicar tudo de forma objetiva.",
  },
  {
    id: "bKrvJaCHEqucAEpSzACi",
    label: "Brian",
    description: "Mais madura e sóbria para tom executivo.",
    previewText: "Olá, eu sou a voz Brian da HYDRA AI. Ideal para um tom profissional e direto.",
  },
  {
    id: "PoPHDFYHijTq7YiSCwE3",
    label: "Steven",
    description: "Segura e estável para leituras e respostas longas.",
    previewText: "Olá, eu sou a voz Steven da HYDRA AI. Minha leitura é estável e envolvente.",
  },
  {
    id: "uaXmxAsXACgEChuJxq9s",
    label: "Phil",
    description: "Tom amigável para experiências mais leves.",
    previewText: "Olá, eu sou a voz Phil da HYDRA AI. Posso falar de um jeito mais leve e amigável.",
  },
  {
    id: "nwj0s2LU9bDWRKND5yzA",
    label: "Bunty",
    description: "Carismática e diferente para uma identidade marcante.",
    previewText: "Olá, eu sou a voz Bunty da HYDRA AI. Tenho uma presença marcante e diferente.",
  },
  {
    id: "XhNlP8uwiH6XZSFnH1yL",
    label: "Elizabeth",
    description: "Mais refinada para um estilo elegante e premium.",
    previewText: "Olá, eu sou a voz Elizabeth da HYDRA AI. Minha fala busca soar elegante e refinada.",
  },
];

export const DEFAULT_HYDRA_VOICE_ID = hydraVoiceOptions[0].id;

export function findHydraVoiceById(voiceId?: string | null) {
  if (!voiceId) return null;
  return hydraVoiceOptions.find((voice) => voice.id === voiceId) || null;
}

export function findHydraVoiceByLabel(label?: string | null) {
  if (!label) return null;
  return hydraVoiceOptions.find((voice) => voice.label.toLowerCase() === label.toLowerCase()) || null;
}

export function resolveHydraVoiceId(voiceId?: string | null) {
  return findHydraVoiceById(voiceId)?.id || DEFAULT_HYDRA_VOICE_ID;
}