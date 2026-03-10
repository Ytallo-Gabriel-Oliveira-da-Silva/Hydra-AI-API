const ELEVEN_URL = "https://api.elevenlabs.io/v1/text-to-speech";

function resolveVoiceId(voiceId?: string) {
  const candidate = voiceId?.trim() || process.env.ELEVENLABS_VOICE_ID?.trim() || "";

  if (!candidate || candidate === "your-elevenlabs-voice-id" || candidate.startsWith("your-")) {
    return "pNInz6obpgDQGcFmaJgB";
  }

  return candidate;
}

export async function elevenLabsTTS(text: string, voiceId?: string) {
  const key = process.env.ELEVENLABS_API_KEY;
  const voice = resolveVoiceId(voiceId);
  if (!key) throw new Error("ELEVENLABS_API_KEY ausente");

  const res = await fetch(`${ELEVEN_URL}/${voice}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
      "xi-api-key": key,
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.8 },
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`ElevenLabs erro ${res.status}: ${error}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  return buffer.toString("base64");
}
