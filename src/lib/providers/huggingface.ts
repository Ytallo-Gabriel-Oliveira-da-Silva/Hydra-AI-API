import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { InferenceClient } from "@huggingface/inference";

type HuggingFaceVideoProvider = "auto" | "fal-ai" | "hf-inference" | "replicate" | "wavespeed";

const HUGGINGFACE_CREDIT_PATTERNS = [
  /failed to perform inference/i,
  /depleted your monthly included credits/i,
  /purchase pre-paid credits/i,
  /subscribe to pro/i,
] as const;

export type HuggingFaceVideoResult = {
  provider: "huggingface";
  model: string;
  url: string;
  ratio: string;
  duration: number;
  taskId: string;
};

function getHuggingFaceToken() {
  const token = process.env.HUGGINGFACE_API_KEY?.trim();
  if (!token) throw new Error("HUGGINGFACE_API_KEY ausente");
  return token;
}

export function getHuggingFaceVideoModel() {
  return process.env.HUGGINGFACE_VIDEO_MODEL?.trim() || "Wan-AI/Wan2.1-T2V-14B";
}

export function getHuggingFaceVideoProvider() {
  const provider = process.env.HUGGINGFACE_VIDEO_PROVIDER?.trim();
  if (provider === "auto" || provider === "fal-ai" || provider === "hf-inference" || provider === "replicate" || provider === "wavespeed") {
    return provider satisfies HuggingFaceVideoProvider;
  }

  return "wavespeed" as const;
}

function getFrameCount(duration: number) {
  return Math.max(16, Math.min(96, duration * 8));
}

function isDurationValidationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return /validation errors/i.test(message) && /duration/i.test(message);
}

export function isHuggingFaceCreditError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return HUGGINGFACE_CREDIT_PATTERNS.some((pattern) => pattern.test(message));
}

export function getHuggingFaceFriendlyError(error: unknown) {
  if (isHuggingFaceCreditError(error)) {
    return "O Hugging Face ficou sem créditos disponíveis para gerar vídeo nesta conta. O recurso continua ativo no seu plano, mas a geração depende de saldo no provider.";
  }

  const message = error instanceof Error ? error.message : "Erro ao gerar vídeo";
  return message;
}

function mimeToExtension(mime: string) {
  if (mime.includes("quicktime")) return "mov";
  if (mime.includes("webm")) return "webm";
  return "mp4";
}

async function saveGeneratedVideo(blob: Blob) {
  const bytes = Buffer.from(await blob.arrayBuffer());
  const extension = mimeToExtension(blob.type || "video/mp4");
  const fileName = `hydra-video-${nanoid(12)}.${extension}`;
  const publicDir = path.join(process.cwd(), "public", "generated", "videos");
  await mkdir(publicDir, { recursive: true });
  await writeFile(path.join(publicDir, fileName), bytes);
  return `/generated/videos/${fileName}`;
}

export async function huggingFaceCreateVideo(prompt: string, aspectRatio = "16:9", duration = 6) {
  const client = new InferenceClient(getHuggingFaceToken());
  const model = getHuggingFaceVideoModel();
  const provider = getHuggingFaceVideoProvider();
  const requestedDuration = Math.max(2, Math.min(10, Math.round(duration)));

  let video: Blob;

  try {
    video = await client.textToVideo({
      provider,
      model,
      inputs: prompt,
      parameters: {
        guidance_scale: 5,
        num_inference_steps: 30,
        num_frames: getFrameCount(requestedDuration),
      },
      duration: requestedDuration,
    });
  } catch (error) {
    if (!isDurationValidationError(error)) throw error;

    video = await client.textToVideo({
      provider,
      model,
      inputs: prompt,
      parameters: {
        guidance_scale: 5,
        num_inference_steps: 30,
        num_frames: getFrameCount(requestedDuration),
      },
    });
  }

  return {
    provider: "huggingface" as const,
    model,
    url: await saveGeneratedVideo(video),
    ratio: aspectRatio,
    duration: requestedDuration,
    taskId: nanoid(16),
  } satisfies HuggingFaceVideoResult;
}