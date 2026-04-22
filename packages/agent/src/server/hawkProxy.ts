/**
 * Shared Hawk proxy handler — used by apps' /api/hawk/+server.ts
 * Hawk = OpenAI-compatible endpoint at https://hawk.hyperskills.net/v1
 * Bearer token lives server-side in HAWK_API_KEY env var.
 */
function sanitizeId(id: string | undefined): string {
  if (!id) return 'x';
  const clean = id.replace(/[^a-zA-Z0-9]/g, '');
  return clean || 'x';
}

/**
 * Some llama-cpp chat templates (Qwen, Mistral family) enforce alphanumeric
 * tool_call IDs via Jinja raise_exception. Gemma's template drops tool_use_id
 * entirely (cf. gemma4-prompt-builder.ts:194) — safe passthrough.
 * Mirrors the convention of sanitizeServerName (tool-layers.ts:24).
 */
function needsIdSanitize(model: string | null | undefined): boolean {
  if (!model) return false;
  return /^(qwen|mistral|ministral|devstral|codestral|bielik)/.test(model);
}

export async function hawkProxy(
  body: Record<string, unknown>,
  apiKey: string,
  model?: string | null,
): Promise<Response> {
  if (!apiKey) {
    return new Response('HAWK_API_KEY missing', { status: 500 });
  }
  const m = model ?? 'qwen35-4b';
  const cloned = JSON.parse(JSON.stringify(body)) as Record<string, unknown>;
  if (needsIdSanitize(m) && Array.isArray(cloned.messages)) {
    for (const msg of cloned.messages as Array<Record<string, unknown>>) {
      if (msg.role === 'assistant' && Array.isArray(msg.tool_calls)) {
        for (const tc of msg.tool_calls as Array<Record<string, unknown>>) {
          tc.id = sanitizeId(tc.id as string | undefined);
        }
      } else if (msg.role === 'tool' && typeof msg.tool_call_id === 'string') {
        msg.tool_call_id = sanitizeId(msg.tool_call_id);
      }
    }
  }
  const res = await fetch('https://hawk.hyperskills.net/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ ...cloned, model: m }),
  });
  if (!res.ok) return new Response(await res.text(), { status: res.status });
  return Response.json(await res.json());
}
