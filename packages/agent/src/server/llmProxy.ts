/**
 * Shared LLM proxy handler — used by all apps' /api/chat/+server.ts
 * Accepts the parsed body (with __apiKey already extracted), the resolved
 * API key, and the optional model override from X-Model header.
 */
export async function llmProxy(
  body: Record<string, unknown>,
  apiKey: string,
  model?: string | null,
): Promise<Response> {
  const m = model ?? 'claude-haiku-4-5-20251001';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',
    },
    body: JSON.stringify({ ...body, model: m }),
  });
  if (!res.ok) return new Response(await res.text(), { status: res.status });
  return Response.json(await res.json());
}
