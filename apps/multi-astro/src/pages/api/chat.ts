import type { APIRoute } from 'astro';
import { anthropicProxy } from '@webmcp-auto-ui/agent/server';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json() as Record<string, unknown>;
  const apiKey = (body.__apiKey as string | undefined) || import.meta.env.ANTHROPIC_API_KEY || '';
  delete body.__apiKey;
  return anthropicProxy(body, apiKey, request.headers.get('X-Model'));
};
