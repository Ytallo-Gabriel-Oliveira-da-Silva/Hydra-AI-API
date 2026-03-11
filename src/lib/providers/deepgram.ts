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

export function getDeepgramSttModel() {
  return process.env.DEEPGRAM_STT_MODEL?.trim() || "nova-3";
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

export async function deepgramTranscribe(buffer: Buffer, mime: string) {
  const model = getDeepgramSttModel();
  const response = await fetch(
    `${DEEPGRAM_API_BASE}/listen?model=${encodeURIComponent(model)}&smart_format=true&detect_language=true&punctuate=true`,
    {
      method: "POST",
      headers: deepgramHeaders({
        "Content-Type": mime || "audio/webm",
      }),
      body: new Uint8Array(buffer),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Deepgram STT erro ${response.status}: ${error}`);
  }

  const data = (await response.json()) as {
    results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string }> }> };
  };

  const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim();
  if (!transcript) {
    throw new Error("Deepgram STT não retornou transcrição.");
  }

  return {
    text: transcript,
    model,
    provider: "deepgram" as const,
  };
}