import { env } from '$env/dynamic/private';
import type { RequestHandler } from '@sveltejs/kit';
export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json() as Record<string, unknown>;
  const apiKey = (body.__apiKey as string | undefined) || env.ANTHROPIC_API_KEY || '';
  delete body.__apiKey;
  const model = (request.headers.get('X-Model') ?? 'claude-haiku-4-5-20251001');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-beta': 'prompt-caching-2024-07-31' },
    body: JSON.stringify({ ...body, model }),
  });
  if (!res.ok) return new Response(await res.text(), { status: res.status });
  return Response.json(await res.json());
};
