const RUNWAY_API_BASE = "https://api.dev.runwayml.com";
const RUNWAY_API_VERSION = process.env.RUNWAY_API_VERSION || "2024-11-06";

export function isRunwayInsufficientCreditsError(error: unknown) {
  if (!(error instanceof Error)) return false;

  return error.message.includes("You do not have enough credits to run this task")
    || error.message.includes("Você não tem créditos suficientes para executar esta tarefa");
}

export type RunwayVideoResponse = {
  taskId: string;
  status: string;
  url: string;
  ratio: string;
  duration: number;
};

export type RunwayAudioResponse = {
  taskId: string;
  status: string;
  url: string;
  voicePresetId: string;
};

type RunwayTaskResponse = {
  id: string;
  status?: string;
  output?: unknown;
  url?: string;
  videoUrl?: string;
  failure?: string;
  error?: string;
};

function runwayHeaders(contentType = true) {
  const key = process.env.RUNWAY_API_KEY;
  if (!key) throw new Error("RUNWAY_API_KEY ausente");

  return {
    ...(contentType ? { "Content-Type": "application/json" } : {}),
    Authorization: `Bearer ${key}`,
    "X-Runway-Version": RUNWAY_API_VERSION,
  };
}

function normalizeRatio(aspectRatio = "16:9") {
  switch (aspectRatio) {
    case "9:16":
      return "720:1280";
    case "1:1":
      return "1280:720";
    default:
      return "1280:720";
  }
}

function extractOutputUrl(task: RunwayTaskResponse): string | null {
  if (typeof task.url === "string" && task.url) return task.url;
  if (typeof task.videoUrl === "string" && task.videoUrl) return task.videoUrl;

  const output = task.output;
  if (typeof output === "string" && output) return output;

  if (Array.isArray(output)) {
    for (const item of output) {
      if (typeof item === "string" && item) return item;
      if (item && typeof item === "object") {
        const candidate = (item as { url?: string; uri?: string }).url || (item as { url?: string; uri?: string }).uri;
        if (candidate) return candidate;
      }
    }
  }

  if (output && typeof output === "object") {
    const candidate = (output as { url?: string; uri?: string }).url || (output as { url?: string; uri?: string }).uri;
    if (candidate) return candidate;
  }

  return null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getRunwayTask(taskId: string) {
  const res = await fetch(`${RUNWAY_API_BASE}/v1/tasks/${taskId}`, {
    method: "GET",
    headers: runwayHeaders(false),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Runway task erro ${res.status}: ${error}`);
  }

  return (await res.json()) as RunwayTaskResponse;
}

export async function runwayCreateVideo(prompt: string, aspectRatio = "16:9", duration = 6) {
  const ratio = normalizeRatio(aspectRatio);
  const model = process.env.RUNWAY_VIDEO_MODEL || "gen4.5";

  const res = await fetch(`${RUNWAY_API_BASE}/v1/text_to_video`, {
    method: "POST",
    headers: runwayHeaders(),
    body: JSON.stringify({
      model,
      promptText: prompt,
      ratio,
      duration,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Runway erro ${res.status}: ${error}`);
  }

  const created = (await res.json()) as { id?: string };
  if (!created.id) throw new Error("Runway não retornou o ID da tarefa de vídeo");

  for (let attempt = 0; attempt < 24; attempt += 1) {
    await sleep(attempt === 0 ? 5000 : 5000);
    const task = await getRunwayTask(created.id);
    const status = (task.status || "PENDING").toUpperCase();

    if (["SUCCEEDED", "COMPLETED"].includes(status)) {
      const url = extractOutputUrl(task);
      if (!url) throw new Error("Runway concluiu a tarefa, mas não retornou a URL do vídeo");

      return {
        taskId: created.id,
        status,
        url,
        ratio: aspectRatio,
        duration,
      } satisfies RunwayVideoResponse;
    }

    if (["FAILED", "CANCELLED", "ABORTED"].includes(status)) {
      throw new Error(task.failure || task.error || `Runway falhou com status ${status}`);
    }
  }

  throw new Error("Runway demorou demais para concluir o vídeo. Tente novamente em alguns instantes.");
}

export async function runwayTextToSpeech(prompt: string, voicePresetId: string) {
  const res = await fetch(`${RUNWAY_API_BASE}/v1/text_to_speech`, {
    method: "POST",
    headers: runwayHeaders(),
    body: JSON.stringify({
      model: "eleven_multilingual_v2",
      promptText: prompt,
      voice: {
        type: "runway-preset",
        presetId: voicePresetId,
      },
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Runway TTS erro ${res.status}: ${error}`);
  }

  const created = (await res.json()) as { id?: string };
  if (!created.id) throw new Error("Runway não retornou o ID da tarefa de áudio");

  for (let attempt = 0; attempt < 24; attempt += 1) {
    await sleep(5000);
    const task = await getRunwayTask(created.id);
    const status = (task.status || "PENDING").toUpperCase();

    if (["SUCCEEDED", "COMPLETED"].includes(status)) {
      const url = extractOutputUrl(task);
      if (!url) throw new Error("Runway concluiu a tarefa de áudio, mas não retornou a URL do arquivo");

      return {
        taskId: created.id,
        status,
        url,
        voicePresetId,
      } satisfies RunwayAudioResponse;
    }

    if (["FAILED", "CANCELLED", "ABORTED"].includes(status)) {
      throw new Error(task.failure || task.error || `Runway TTS falhou com status ${status}`);
    }
  }

  throw new Error("Runway demorou demais para concluir o áudio. Tente novamente em alguns instantes.");
}
