export const IMAGE_MESSAGE_PREFIX = "__hydra_image__:";
export const AUDIO_MESSAGE_PREFIX = "__hydra_audio__:";
export const VIDEO_MESSAGE_PREFIX = "__hydra_video__:";

export type ImageMessagePayload = {
  kind: "image";
  prompt: string;
  url: string;
};

export type AudioMessagePayload = {
  kind: "audio";
  prompt: string;
  text: string;
  audioUrl: string;
  voiceId?: string;
  provider?: string;
  model?: string;
};

export type VideoMessagePayload = {
  kind: "video";
  prompt: string;
  url: string;
  aspectRatio: string;
  duration: number;
  taskId?: string;
  provider?: string;
  model?: string;
};

export type MediaMessagePayload = ImageMessagePayload | AudioMessagePayload | VideoMessagePayload;

const MEDIA_PREFIXES = [IMAGE_MESSAGE_PREFIX, AUDIO_MESSAGE_PREFIX, VIDEO_MESSAGE_PREFIX] as const;

function normalizePreviewText(text: string, maxLength = 96) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

export function buildMediaMessage(payload: MediaMessagePayload) {
  switch (payload.kind) {
    case "image":
      return `${IMAGE_MESSAGE_PREFIX}${JSON.stringify(payload)}`;
    case "audio":
      return `${AUDIO_MESSAGE_PREFIX}${JSON.stringify(payload)}`;
    case "video":
      return `${VIDEO_MESSAGE_PREFIX}${JSON.stringify(payload)}`;
  }
}

export function parseMediaMessage(content: string): MediaMessagePayload | null {
  try {
    if (content.startsWith(IMAGE_MESSAGE_PREFIX)) {
      return JSON.parse(content.slice(IMAGE_MESSAGE_PREFIX.length)) as ImageMessagePayload;
    }

    if (content.startsWith(AUDIO_MESSAGE_PREFIX)) {
      return JSON.parse(content.slice(AUDIO_MESSAGE_PREFIX.length)) as AudioMessagePayload;
    }

    if (content.startsWith(VIDEO_MESSAGE_PREFIX)) {
      return JSON.parse(content.slice(VIDEO_MESSAGE_PREFIX.length)) as VideoMessagePayload;
    }
  } catch {
    return null;
  }

  return null;
}

export function isEncodedMediaMessage(content: string) {
  return MEDIA_PREFIXES.some((prefix) => content.startsWith(prefix));
}

export function getMessagePreview(content: string) {
  const media = parseMediaMessage(content);
  if (media?.kind === "image") return normalizePreviewText(`Imagem gerada: ${media.prompt}`);
  if (media?.kind === "audio") return normalizePreviewText(`Áudio gerado: ${media.text}`);
  if (media?.kind === "video") return normalizePreviewText(`Vídeo gerado: ${media.prompt}`);
  if (isEncodedMediaMessage(content)) return "Conteúdo multimídia gerado";
  return normalizePreviewText(content || "");
}