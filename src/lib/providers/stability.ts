const STABILITY_API_URL = "https://api.stability.ai/v2beta/stable-image/generate/core";

function stabilityAuthHeader() {
  const key = process.env.STABILITY_API_KEY;
  if (!key) throw new Error("STABILITY_API_KEY ausente");
  return { Authorization: `Bearer ${key}` };
}

export async function stabilityGenerateImage(prompt: string) {
  const form = new FormData();
  form.append("prompt", prompt);
  form.append("output_format", "png");
  form.append("aspect_ratio", "1:1");

  const res = await fetch(STABILITY_API_URL, {
    method: "POST",
    headers: {
      Accept: "image/*",
      ...stabilityAuthHeader(),
    },
    body: form,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Stability image erro ${res.status}: ${error}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  return `data:image/png;base64,${buffer.toString("base64")}`;
}
