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
  voiceId: string;
};

export type VideoMessagePayload = {
  kind: "video";
  prompt: string;
  url: string;
  aspectRatio: string;
  duration: number;
  taskId?: string;
};

export type MediaMessagePayload = ImageMessagePayload | AudioMessagePayload | VideoMessagePayload;

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
  if (content.startsWith(IMAGE_MESSAGE_PREFIX)) {
    return JSON.parse(content.slice(IMAGE_MESSAGE_PREFIX.length)) as ImageMessagePayload;
  }

  if (content.startsWith(AUDIO_MESSAGE_PREFIX)) {
    return JSON.parse(content.slice(AUDIO_MESSAGE_PREFIX.length)) as AudioMessagePayload;
  }

  if (content.startsWith(VIDEO_MESSAGE_PREFIX)) {
    return JSON.parse(content.slice(VIDEO_MESSAGE_PREFIX.length)) as VideoMessagePayload;
  }

  return null;
}