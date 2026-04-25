/**
 * Centralised onnxruntime-web version pins.
 *
 * Two distinct usages exist in the codebase, each requiring a different ORT
 * build, so we expose two constants rather than one:
 *
 * 1. STANDALONE (`ORT_VERSION` / `ORT_CDN_BASE`) — used by the nano-RAG
 *    embedder (packages/agent/src/nano-rag/embedder.ts). The embedder does
 *    `await import('onnxruntime-web')`, which resolves through the host app's
 *    importmap (apps/flex, apps/notebook-viewer). The matching .wasm binaries
 *    must be served from a CDN that mirrors the *exact* same release. We pin
 *    1.21.0 because it is a stable release present on jsdelivr/esm.sh and
 *    matches the embedder's tested chain.
 *
 * 2. TRANSFORMERS-PINNED (`ORT_TRANSFORMERS_VERSION` /
 *    `ORT_TRANSFORMERS_CDN_BASE`) — used by transformers.worker.ts when it
 *    loads transformers.js 4.1.0 from esm.sh. transformers.js 4.1.0 ships
 *    with ORT 1.26.0-dev.20260410-5e55544225 internally; we override the
 *    wasm paths to fetch the matching native binaries from jsdelivr (esm.sh
 *    serves the JS, jsdelivr serves the .wasm). Bumping this requires
 *    bumping the transformers.js version in lock-step.
 *
 * The two pins are intentionally NOT the same: mixing 1.21 wasm with the
 * 1.26-dev JS bundle (or vice versa) crashes at runtime with cryptic
 * "wasm backend not initialised" / signature mismatch errors.
 */

// Standalone embedder usage (nano-RAG). Stable release.
export const ORT_VERSION = '1.21.0';
export const ORT_CDN_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}`;

// transformers.js 4.1.0 internal pin. Must match the version baked into
// https://esm.sh/@huggingface/transformers@4.1.0.
export const ORT_TRANSFORMERS_VERSION = '1.26.0-dev.20260410-5e55544225';
export const ORT_TRANSFORMERS_CDN_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_TRANSFORMERS_VERSION}`;
