import { env } from '$env/dynamic/private';
import type { RequestHandler } from '@sveltejs/kit';
import { anthropicProxy } from '@webmcp-auto-ui/agent/server';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json() as Record<string, unknown>;
  const apiKey = (body.__apiKey as string | undefined) || env.ANTHROPIC_API_KEY || '';
  delete body.__apiKey;
  return anthropicProxy(body, apiKey, request.headers.get('X-Model'));
};
