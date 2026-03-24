interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  // Use relative paths — Next.js rewrites proxy /api/* and /auth/* to the API server
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  let data: { success: boolean; error?: string; data?: unknown };
  try {
    data = await res.json();
  } catch {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(text || `Request failed with status ${res.status}`);
  }

  if (!data.success) {
    throw new Error(data.error || 'API request failed');
  }

  return data.data as T;
}
