const RUNWAY_URL = "https://api.runwayml.com/v1/videos";

export type RunwayVideoResponse = {
  id: string;
  status: string;
  url?: string;
};

export async function runwayCreateVideo(prompt: string, aspectRatio = "16:9") {
  const key = process.env.RUNWAY_API_KEY;
  if (!key) throw new Error("RUNWAY_API_KEY ausente");

  const res = await fetch(RUNWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      prompt,
      model: "gen3a",
      aspect_ratio: aspectRatio,
    }),
  });

  if (!res.ok) throw new Error(`Runway erro ${res.status}`);
  const data = (await res.json()) as RunwayVideoResponse;
  return data;
}
