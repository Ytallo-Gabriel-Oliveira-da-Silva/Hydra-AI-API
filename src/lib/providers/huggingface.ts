import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { InferenceClient } from "@huggingface/inference";

type HuggingFaceVideoProvider = "auto" | "fal-ai" | "hf-inference" | "replicate" | "wavespeed";

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

  const video = await client.textToVideo({
    provider,
    model,
    inputs: prompt,
    parameters: {
      guidance_scale: 5,
      num_inference_steps: 30,
      num_frames: getFrameCount(duration),
    },
    duration,
  });

  return {
    provider: "huggingface" as const,
    model,
    url: await saveGeneratedVideo(video),
    ratio: aspectRatio,
    duration,
    taskId: nanoid(16),
  } satisfies HuggingFaceVideoResult;
}