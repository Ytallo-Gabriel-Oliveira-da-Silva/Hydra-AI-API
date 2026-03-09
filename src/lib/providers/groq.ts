const GROQ_API_URL = "https://api.groq.com/openai/v1";

function groqAuthHeader() {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY ausente");
  return { Authorization: `Bearer ${key}` };
}

export async function groqChat(messages: { role: string; content: string }[]) {
  const res = await fetch(`${GROQ_API_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...groqAuthHeader(),
    },
    body: JSON.stringify({
      model: process.env.GROQ_CHAT_MODEL || "llama-3.3-70b-versatile",
      messages,
      temperature: 0.6,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Groq chat erro ${res.status}: ${error}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content as string;
}

export async function groqTranscribe(buffer: Buffer, mime: string) {
  const bytes = new Uint8Array(buffer);
  const file = new File([bytes], "audio.webm", { type: mime });
  const form = new FormData();
  form.append("file", file);
  form.append("model", process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo");
  form.append("response_format", "verbose_json");

  const res = await fetch(`${GROQ_API_URL}/audio/transcriptions`, {
    method: "POST",
    headers: {
      ...groqAuthHeader(),
    },
    body: form,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Groq STT erro ${res.status}: ${error}`);
  }

  const data = await res.json();
  return data.text as string;
}
