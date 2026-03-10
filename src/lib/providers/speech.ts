import { elevenLabsTTS } from "@/lib/providers/elevenlabs";
import { runwayTextToSpeech } from "@/lib/providers/runway";
import { findHydraVoiceById, resolveHydraVoiceId } from "@/lib/voices";

async function fetchAudioAsDataUrl(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Falha ao baixar áudio gerado ${res.status}: ${error}`);
  }

  const contentType = res.headers.get("content-type") || "audio/mpeg";
  const buffer = Buffer.from(await res.arrayBuffer());
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

function shouldFallbackToRunway(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.message.includes("paid_plan_required") || error.message.includes("Free users cannot use library voices via the API");
}

export async function generateSpeechAudio(text: string, requestedVoiceId?: string | null) {
  const hydraVoiceId = resolveHydraVoiceId(requestedVoiceId);
  const voice = findHydraVoiceById(hydraVoiceId);
  if (!voice) throw new Error("Voz inválida ou não encontrada");

  try {
    const base64 = await elevenLabsTTS(text, voice.id);
    return {
      voiceId: voice.id,
      voiceLabel: voice.label,
      provider: "elevenlabs" as const,
      audioUrl: `data:audio/mpeg;base64,${base64}`,
    };
  } catch (error) {
    if (!shouldFallbackToRunway(error)) {
      throw error;
    }

    if (!process.env.RUNWAY_API_KEY) {
      throw new Error("ElevenLabs exige plano pago para essa voz e o fallback da Runway não está configurado");
    }

    const generated = await runwayTextToSpeech(text, voice.runwayPresetId);
    const audioUrl = await fetchAudioAsDataUrl(generated.url);

    return {
      voiceId: voice.id,
      voiceLabel: voice.label,
      provider: "runway" as const,
      audioUrl,
    };
  }
}