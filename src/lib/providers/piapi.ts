import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { nanoid } from "nanoid";
import { deepgramTextToSpeech } from "@/lib/providers/deepgram";

const ffmpegPath = require("ffmpeg-static") as string | null;
const ffprobePath = (require("ffprobe-static") as { path?: string }).path || null;
const execFileAsync = promisify(execFile);

const PIAPI_BASE_URL = "https://api.piapi.ai/api/v1";
const PIAPI_VIDEO_MODEL = "sora2";
const PIAPI_VIDEO_TASK_TYPE = "sora2-pro-video";
const PIAPI_VIDEO_RESOLUTION = "720p";
const PIAPI_POLL_INTERVAL_MS = 4_000;
const PIAPI_POLL_TIMEOUT_MS = 4 * 60 * 1000;

const PIAPI_CREDIT_PATTERNS = [
  /insufficient/i,
  /credit/i,
  /balance/i,
  /billing/i,
  /payment required/i,
  /quota/i,
] as const;

const PIAPI_AUTH_PATTERNS = [
  /forbidden/i,
  /permission/i,
  /unauthorized/i,
  /invalid api key/i,
  /access denied/i,
] as const;

const PIAPI_RATE_LIMIT_PATTERNS = [
  /rate limit/i,
  /too many requests/i,
  /429/i,
] as const;

export type PiapiVideoResult = {
  provider: "piapi";
  model: string;
  url: string;
  ratio: string;
  duration: number;
  taskId: string;
};

type JsonRecord = Record<string, unknown>;

const NON_ERROR_MESSAGES = new Set(["success", "ok", "completed", "processing", "pending", "starting"]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    throw new Error(`PIAPI retornou uma URL de vídeo inválida: ${response.status}`);
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

  const workDir = await mkdtemp(path.join(os.tmpdir(), "hydra-piapi-"));

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

function getPiapiKey() {
  const key = process.env.PIAPI_API_KEY?.trim();
  if (!key) throw new Error("PIAPI_API_KEY ausente");
  return key;
}

function piapiHeaders() {
  return {
    "x-api-key": getPiapiKey(),
    "content-type": "application/json",
  };
}

function normalizeAspectRatio(aspectRatio: string) {
  return aspectRatio === "9:16" ? "9:16" : "16:9";
}

function normalizeDuration(duration: number) {
  return Math.max(4, Math.min(10, Math.round(duration)));
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function parseJsonText(text: string) {
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function isMeaningfulErrorMessage(message: string | null | undefined) {
  if (!message) return false;
  const normalized = message.trim().toLowerCase();
  if (!normalized) return false;
  return !NON_ERROR_MESSAGES.has(normalized);
}

function findFirstString(value: unknown, matcher: (key: string, text: string) => boolean): string | null {
  if (typeof value === "string") {
    return matcher("", value) ? value : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findFirstString(item, matcher);
      if (match) return match;
    }
    return null;
  }

  const record = asRecord(value);
  if (!record) return null;

  for (const [key, child] of Object.entries(record)) {
    if (typeof child === "string" && matcher(key, child)) {
      return child;
    }

    const nested = findFirstString(child, matcher);
    if (nested) return nested;
  }

  return null;
}

function extractTaskId(payload: unknown) {
  const record = asRecord(payload);
  const directTaskId = typeof record?.task_id === "string"
    ? record.task_id
    : typeof record?.taskId === "string"
      ? record.taskId
      : typeof asRecord(record?.data)?.task_id === "string"
        ? asRecord(record?.data)?.task_id as string
        : typeof asRecord(record?.data)?.taskId === "string"
          ? asRecord(record?.data)?.taskId as string
          : null;

  if (directTaskId?.trim()) return directTaskId.trim();

  return findFirstString(payload, (key, text) => {
    if (!text.trim()) return false;
    return key === "task_id" || key === "taskId" || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text.trim());
  });
}

function extractStatus(payload: unknown) {
  return findFirstString(payload, (key, text) => key === "status" && !!text.trim())?.toLowerCase().trim() || null;
}

function extractOutputVideoUrl(payload: unknown) {
  const record = asRecord(payload);
  const output = record?.output;

  const outputVideo = asRecord(output)?.video;
  if (typeof outputVideo === "string" && /^https?:\/\//i.test(outputVideo)) {
    return outputVideo;
  }

  const outputRecord = asRecord(output);
  const directCandidates = [
    outputRecord?.url,
    outputRecord?.file_url,
    outputRecord?.video_url,
    asRecord(outputRecord?.video)?.url,
    asRecord(outputRecord?.result)?.video,
    asRecord(outputRecord?.result)?.url,
    asRecord(outputRecord?.result)?.file_url,
    asRecord(outputRecord?.data)?.video,
    asRecord(outputRecord?.data)?.url,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) {
      return candidate;
    }
  }

  return findFirstString(payload, (key, text) => {
    if (!/^https?:\/\//i.test(text)) return false;
    if (key === "video" || key === "url" || key === "file_url" || key === "video_url") return true;
    return /\.mp4(\?|$)/i.test(text);
  });
}

function extractErrorMessage(payload: unknown) {
  const record = asRecord(payload);
  const error = asRecord(record?.error);
  if (typeof error?.message === "string" && isMeaningfulErrorMessage(error.message)) return error.message.trim();
  if (typeof error?.raw_message === "string" && isMeaningfulErrorMessage(error.raw_message)) return error.raw_message.trim();
  if (typeof error?.detail === "string" && isMeaningfulErrorMessage(error.detail)) return error.detail.trim();
  if (typeof record?.message === "string" && isMeaningfulErrorMessage(record.message)) return record.message.trim();
  return null;
}

export function isPiapiCreditError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return PIAPI_CREDIT_PATTERNS.some((pattern) => pattern.test(message));
}

export function isPiapiAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return PIAPI_AUTH_PATTERNS.some((pattern) => pattern.test(message));
}

export function isPiapiRateLimitError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return PIAPI_RATE_LIMIT_PATTERNS.some((pattern) => pattern.test(message));
}

export function getPiapiFriendlyError(error: unknown) {
  if (isPiapiCreditError(error)) {
    return "A conta da PIAPI ficou sem créditos disponíveis para gerar vídeo. O recurso continua ativo no seu plano, mas a geração depende de saldo no provider.";
  }

  if (isPiapiAuthError(error)) {
    return "A chave atual da PIAPI não tem permissão para usar a geração de vídeo configurada. Revise PIAPI_API_KEY e o acesso ao Sora2 Pro.";
  }

  if (isPiapiRateLimitError(error)) {
    return "A PIAPI recusou temporariamente a geração de vídeo por limite de requisições. Tente novamente em instantes.";
  }

  return error instanceof Error ? error.message : "Erro ao gerar vídeo";
}

async function createPiapiVideoTask(prompt: string, aspectRatio: string, duration: number) {
  const response = await fetch(`${PIAPI_BASE_URL}/task`, {
    method: "POST",
    headers: piapiHeaders(),
    body: JSON.stringify({
      model: PIAPI_VIDEO_MODEL,
      task_type: PIAPI_VIDEO_TASK_TYPE,
      input: {
        prompt,
        aspect_ratio: normalizeAspectRatio(aspectRatio),
        resolution: PIAPI_VIDEO_RESOLUTION,
        duration: normalizeDuration(duration),
      },
    }),
  });

  const text = await response.text();
  const payload = parseJsonText(text);

  if (!response.ok) {
    const errorMessage = extractErrorMessage(payload) || text || `PIAPI video erro ${response.status}`;
    throw new Error(`PIAPI video erro ${response.status}: ${errorMessage}`);
  }

  const taskId = extractTaskId(payload);
  if (!taskId) {
    throw new Error("PIAPI não retornou o identificador da tarefa de vídeo.");
  }

  return taskId;
}

async function getPiapiTask(taskId: string) {
  const response = await fetch(`${PIAPI_BASE_URL}/task/${taskId}`, {
    method: "GET",
    headers: piapiHeaders(),
  });

  const text = await response.text();
  const payload = parseJsonText(text);

  if (!response.ok) {
    const errorMessage = extractErrorMessage(payload) || text || `PIAPI task erro ${response.status}`;
    throw new Error(`PIAPI task erro ${response.status}: ${errorMessage}`);
  }

  return payload;
}

async function waitForPiapiVideo(taskId: string) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < PIAPI_POLL_TIMEOUT_MS) {
    const payload = await getPiapiTask(taskId);
    const status = extractStatus(payload);
    const videoUrl = extractOutputVideoUrl(payload);

    if (videoUrl && (status === "completed" || status === "success" || status === "finished" || status === null)) {
      return { payload, videoUrl };
    }

    if (videoUrl) {
      return { payload, videoUrl };
    }

    if (status === "failed" || status === "error" || status === "cancelled") {
      throw new Error(extractErrorMessage(payload) || "A PIAPI falhou ao gerar o vídeo.");
    }

    await sleep(PIAPI_POLL_INTERVAL_MS);
  }

  throw new Error("A PIAPI demorou demais para finalizar a geração de vídeo.");
}

export async function piapiCreateVideo(prompt: string, aspectRatio = "16:9", duration = 6, speechText?: string) {
  getPiapiKey();

  const normalizedDuration = normalizeDuration(duration);
  const normalizedRatio = normalizeAspectRatio(aspectRatio);
  const taskId = await createPiapiVideoTask(prompt, normalizedRatio, normalizedDuration);
  const { videoUrl } = await waitForPiapiVideo(taskId);

  const narrationText = speechText?.trim() || extractSpeechText(prompt);
  const finalVideoUrl = shouldAttemptSpeechMux(prompt) && process.env.DEEPGRAM_API_KEY
    ? await muxNarrationIntoVideo(videoUrl, narrationText)
    : videoUrl;

  return {
    provider: "piapi" as const,
    model: PIAPI_VIDEO_TASK_TYPE,
    url: finalVideoUrl,
    ratio: normalizedRatio,
    duration: normalizedDuration,
    taskId,
  } satisfies PiapiVideoResult;
}