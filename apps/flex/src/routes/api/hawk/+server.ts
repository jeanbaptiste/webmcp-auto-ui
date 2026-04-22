import { env } from '$env/dynamic/private';
import type { RequestHandler } from '@sveltejs/kit';
import { hawkProxy } from '@webmcp-auto-ui/agent/server';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json() as Record<string, unknown>;
  return hawkProxy(body, env.HAWK_API_KEY ?? '', request.headers.get('X-Model'));
};
