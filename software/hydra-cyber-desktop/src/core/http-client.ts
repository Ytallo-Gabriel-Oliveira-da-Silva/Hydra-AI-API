type HttpRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  retries?: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function requestJson<T>(url: string, options: HttpRequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    headers,
    body,
    timeoutMs = 15000,
    retries = 1,
  } = options;

  let attempt = 0;
  while (attempt <= retries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const apiError = (payload as { error?: string }).error || `HTTP ${response.status}`;
        throw new Error(apiError);
      }

      return payload as T;
    } catch (error) {
      if (attempt >= retries) {
        throw error;
      }
      await sleep(500 * (attempt + 1));
      attempt += 1;
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error("Falha inesperada no requestJson");
}