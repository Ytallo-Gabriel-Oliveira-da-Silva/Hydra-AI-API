import { deepgramTextToSpeech } from "@/lib/providers/deepgram";

export async function generateSpeechAudio(text: string) {
  const generated = await deepgramTextToSpeech(text);
  return {
    provider: generated.provider,
    model: generated.model,
    audioUrl: generated.audioUrl,
  };
}