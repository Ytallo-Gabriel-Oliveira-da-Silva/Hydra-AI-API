import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { nanoid } from "nanoid";
import { fal } from "@fal-ai/client";
import { deepgramTextToSpeech } from "@/lib/providers/deepgram";

const ffmpegPath = require("ffmpeg-static") as string | null;
const ffprobePath = (require("ffprobe-static") as { path?: string }).path || null;
const execFileAsync = promisify(execFile);

const FAL_CREDIT_PATTERNS = [
  /insufficient/i,
  /credit/i,
  /balance/i,
  /billing/i,
  /payment required/i,
] as const;

const FAL_FORBIDDEN_PATTERNS = [
  /forbidden/i,
  /permission/i,
  /not authorized/i,
  /access denied/i,
  /unauthorized/i,
] as const;

const FAL_FALLBACK_VIDEO_MODEL = "fal-ai/kling-video/v1/standard/text-to-video";

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

function shouldAttemptSpeechMux(prompt: string) {
  return /\b(falando|fala|dizendo|discurso|discursando|narrando|narração|narracao|speaking|talking|speech|voiceover|voice over)\b/i.test(prompt);
}

function extractSpeechText(prompt: string) {
  const quoted = prompt.match(/["“”'']([^"“”'']+)["“”'']/)?.[1]?.trim();
  if (quoted) return quoted;
  return prompt.trim();
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Deepgram retornou áudio em formato inválido.");
  return {
    mime: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

function extensionForMime(mime: string) {
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("aac")) return "aac";
  return "bin";
}

async function downloadToBuffer(sourceUrl: string) {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Fal.ai retornou uma URL de vídeo inválida: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function videoHasAudio(videoPath: string) {
  if (!ffprobePath) return false;

  try {
    const { stdout } = await execFileAsync(ffprobePath, [
      "-v",
      "error",
      "-select_streams",
      "a",
      "-show_entries",
      "stream=codec_type",
      "-of",
      "csv=p=0",
      videoPath,
    ]);

    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

async function muxNarrationIntoVideo(videoUrl: string, narrationText: string) {
  if (!ffmpegPath || !ffprobePath) return videoUrl;

  const workDir = await mkdtemp(path.join(os.tmpdir(), "hydra-fal-"));

  try {
    const videoBuffer = await downloadToBuffer(videoUrl);
    const videoInputPath = path.join(workDir, "input-video.mp4");
    await writeFile(videoInputPath, videoBuffer);

    if (await videoHasAudio(videoInputPath)) {
      return videoUrl;
    }

    const generatedSpeech = await deepgramTextToSpeech(narrationText);
    const parsedAudio = parseDataUrl(generatedSpeech.audioUrl);
    const audioInputPath = path.join(workDir, `input-audio.${extensionForMime(parsedAudio.mime)}`);
    await writeFile(audioInputPath, parsedAudio.buffer);

    const publicDir = path.join(process.cwd(), "public", "generated", "videos");
    await mkdir(publicDir, { recursive: true });
    const outputFileName = `hydra-video-${nanoid(12)}.mp4`;
    const outputPath = path.join(publicDir, outputFileName);

    await execFileAsync(ffmpegPath, [
      "-y",
      "-i",
      videoInputPath,
      "-i",
      audioInputPath,
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-shortest",
      outputPath,
    ]);

    return `/generated/videos/${outputFileName}`;
  } catch {
    return videoUrl;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

function getFalKey() {
  const key = process.env.FAL_KEY?.trim();
  if (!key) throw new Error("FAL_KEY ausente");
  return key;
}

export function getFalVideoModel() {
  return process.env.FAL_VIDEO_MODEL?.trim() || FAL_FALLBACK_VIDEO_MODEL;
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

  if (model.includes("kling-video")) {
    return {
      requested: rounded <= 7 ? 5 : 10,
      input: rounded <= 7 ? 5 : 10,
    };
  }

  return {
    requested: rounded <= 7 ? 5 : 10,
    input: rounded <= 7 ? 5 : 10,
  };
}

export function isFalForbiddenError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return FAL_FORBIDDEN_PATTERNS.some((pattern) => pattern.test(message));
}

export function isFalCreditError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return FAL_CREDIT_PATTERNS.some((pattern) => pattern.test(message));
}

export function getFalFriendlyError(error: unknown) {
  if (isFalCreditError(error)) {
    return "A conta da fal.ai ficou sem créditos disponíveis para gerar vídeo. O recurso continua ativo no seu plano, mas a geração depende de saldo no provider.";
  }

  if (isFalForbiddenError(error)) {
    return "A chave atual da fal.ai não tem permissão para usar este modelo de vídeo. Ajuste o FAL_VIDEO_MODEL ou use uma chave com acesso liberado.";
  }

  const message = error instanceof Error ? error.message : "Erro ao gerar vídeo";
  return message;
}

async function subscribeFalVideo(model: string, prompt: string, ratio: string, duration: string | number) {
  return fal.subscribe(model, {
    input: {
      prompt,
      aspect_ratio: ratio,
      duration,
      enhance_prompt: true,
      auto_fix: true,
    },
    logs: false,
    startTimeout: 30,
  });
}

export async function falCreateVideo(prompt: string, aspectRatio = "16:9", duration = 6, speechText?: string) {
  configureFalClient();

  const preferredModel = getFalVideoModel();
  const ratio = normalizeAspectRatio(aspectRatio);
  let model = preferredModel;
  let normalizedDuration = normalizeDuration(model, duration);
  let result;

  try {
    result = await subscribeFalVideo(model, prompt, ratio, normalizedDuration.input);
  } catch (error) {
    const canFallbackModel = model !== FAL_FALLBACK_VIDEO_MODEL && isFalForbiddenError(error);
    if (!canFallbackModel) throw error;

    model = FAL_FALLBACK_VIDEO_MODEL;
    normalizedDuration = normalizeDuration(model, duration);
    result = await subscribeFalVideo(model, prompt, ratio, normalizedDuration.input);
  }

  const data = result.data as FalVideoResponse;
  const remoteVideoUrl = data.video?.url;
  if (!remoteVideoUrl) {
    throw new Error("Fal.ai não retornou a URL do vídeo gerado.");
  }

  const narrationText = speechText?.trim() || extractSpeechText(prompt);
  const finalVideoUrl = shouldAttemptSpeechMux(prompt) && process.env.DEEPGRAM_API_KEY
    ? await muxNarrationIntoVideo(remoteVideoUrl, narrationText)
    : remoteVideoUrl;

  return {
    provider: "fal" as const,
    model,
    url: finalVideoUrl,
    ratio,
    duration: normalizedDuration.requested,
    taskId: result.requestId || nanoid(16),
  } satisfies FalVideoResult;
}