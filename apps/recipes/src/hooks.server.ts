import type { Handle } from '@sveltejs/kit';

/**
 * Set Cross-Origin headers required for SharedArrayBuffer and WebGPU.
 * Without these headers, the LiteRT worker cannot use WebGPU or WASM threads.
 */
export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  // Use 'credentialless' instead of 'require-corp' so that cross-origin
  // resources (CDN WASM files, HuggingFace model downloads) can be loaded
  // without requiring CORP headers on every response.
  response.headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
  return response;
};
