/**
 * Shared Hawk proxy handler — used by apps' /api/hawk/+server.ts
 * Hawk = OpenAI-compatible endpoint at https://hawk.hyperskills.net/v1
 * Bearer token lives server-side in HAWK_API_KEY env var.
 */
export async function hawkProxy(
  body: Record<string, unknown>,
  apiKey: string,
  model?: string | null,
): Promise<Response> {
  if (!apiKey) {
    return new Response('HAWK_API_KEY missing', { status: 500 });
  }
  const m = model ?? 'qwen35-4b';
  const res = await fetch('https://hawk.hyperskills.net/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ ...body, model: m }),
  });
  if (!res.ok) return new Response(await res.text(), { status: res.status });
  return Response.json(await res.json());
}
