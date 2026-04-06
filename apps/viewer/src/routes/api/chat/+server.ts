import { env } from '$env/dynamic/private';
import type { RequestHandler } from '@sveltejs/kit';
export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const model = request.headers.get('X-Model') ?? 'claude-haiku-4-5-20251001';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY ?? '', 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ ...body, model }),
  });
  if (!res.ok) return new Response(await res.text(), { status: res.status });
  return Response.json(await res.json());
};
