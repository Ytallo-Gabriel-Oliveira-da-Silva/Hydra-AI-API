import { nanoid } from "nanoid";
import { fal } from "@fal-ai/client";

const FAL_CREDIT_PATTERNS = [
  /insufficient/i,
  /credit/i,
  /balance/i,
  /billing/i,
  /payment required/i,
] as const;

export type FalVideoResult = {
  provider: "fal";
  model: string;
  url: string;
  ratio: string;
  duration: number;
  taskId: string;
};

type FalVideoResponse = {
  video?: {
    url?: string;
  };
};

function getFalKey() {
  const key = process.env.FAL_KEY?.trim();
  if (!key) throw new Error("FAL_KEY ausente");
  return key;
}

export function getFalVideoModel() {
  return process.env.FAL_VIDEO_MODEL?.trim() || "fal-ai/veo2";
}

function configureFalClient() {
  fal.config({
    credentials: getFalKey(),
  });
}

function normalizeAspectRatio(aspectRatio: string) {
  if (aspectRatio === "9:16" || aspectRatio === "1:1") return aspectRatio;
  return "16:9";
}

function normalizeDuration(model: string, duration: number) {
  const rounded = Math.round(duration);
  if (model.includes("veo2")) {
    return {
      requested: Math.max(5, Math.min(8, rounded)),
      input: `${Math.max(5, Math.min(8, rounded))}s`,
    };
  }

  return {
    requested: rounded <= 7 ? 5 : 10,
    input: rounded <= 7 ? 5 : 10,
  };
}

export function isFalCreditError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return FAL_CREDIT_PATTERNS.some((pattern) => pattern.test(message));
}

export function getFalFriendlyError(error: unknown) {
  if (isFalCreditError(error)) {
    return "A conta da fal.ai ficou sem créditos disponíveis para gerar vídeo. O recurso continua ativo no seu plano, mas a geração depende de saldo no provider.";
  }

  const message = error instanceof Error ? error.message : "Erro ao gerar vídeo";
  return message;
}

export async function falCreateVideo(prompt: string, aspectRatio = "16:9", duration = 6) {
  configureFalClient();

  const model = getFalVideoModel();
  const ratio = normalizeAspectRatio(aspectRatio);
  const normalizedDuration = normalizeDuration(model, duration);

  const result = await fal.subscribe(model, {
    input: {
      prompt,
      aspect_ratio: ratio,
      duration: normalizedDuration.input,
      enhance_prompt: true,
      auto_fix: true,
    },
    logs: false,
    startTimeout: 30,
  });

  const data = result.data as FalVideoResponse;
  const remoteVideoUrl = data.video?.url;
  if (!remoteVideoUrl) {
    throw new Error("Fal.ai não retornou a URL do vídeo gerado.");
  }

  return {
    provider: "fal" as const,
    model,
    url: remoteVideoUrl,
    ratio,
    duration: normalizedDuration.requested,
    taskId: result.requestId || nanoid(16),
  } satisfies FalVideoResult;
}