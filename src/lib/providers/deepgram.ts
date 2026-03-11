const DEEPGRAM_API_BASE = "https://api.deepgram.com/v1";

export type DeepgramSpeechResult = {
  provider: "deepgram";
  audioUrl: string;
  model: string;
};

function deepgramHeaders(extra?: HeadersInit) {
  const key = process.env.DEEPGRAM_API_KEY?.trim();
  if (!key) throw new Error("DEEPGRAM_API_KEY ausente");

  return {
    Authorization: `Token ${key}`,
    ...(extra || {}),
  };
}

function blobToDataUrl(blob: Blob) {
  return blob.arrayBuffer().then((buffer) => {
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:${blob.type || "audio/mpeg"};base64,${base64}`;
  });
}

export function getDeepgramTtsModel() {
  return process.env.DEEPGRAM_TTS_MODEL?.trim() || "aura-2-thalia-en";
}

export async function deepgramTextToSpeech(text: string) {
  const model = getDeepgramTtsModel();
  const response = await fetch(`${DEEPGRAM_API_BASE}/speak?model=${encodeURIComponent(model)}`, {
    method: "POST",
    headers: deepgramHeaders({
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    }),
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Deepgram TTS erro ${response.status}: ${error}`);
  }

  const audioBlob = await response.blob();
  return {
    provider: "deepgram" as const,
    audioUrl: await blobToDataUrl(audioBlob),
    model,
  } satisfies DeepgramSpeechResult;
}