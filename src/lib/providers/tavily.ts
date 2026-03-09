const TAVILY_URL = "https://api.tavily.com/search";

export async function tavilySearch(query: string) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error("TAVILY_API_KEY ausente");

  const res = await fetch(TAVILY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": key },
    body: JSON.stringify({ query, search_depth: "advanced" }),
  });

  if (!res.ok) throw new Error(`Tavily erro ${res.status}`);
  return res.json();
}
