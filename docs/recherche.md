# Research — Future explorations

## TurboQuant — KV Cache compression for Gemma WASM

**Source:** https://research.google/blog/turboquant-redefining-ai-efficiency-with-extreme-compression/

**Problem:** Gemma WASM (E2B/E4B) recalculates the full KV cache from scratch on every exchange. With 128K context, the uncompressed KV cache can reach 500MB-1GB for E2B. No inter-request caching exists today.

**Idea:** Compress the KV cache after each `model.generate()` using extreme quantization (2-4 bits per value instead of 16), store it, and decompress before the next exchange. This would enable inter-request KV caching in the browser without blowing up memory.

**Approach (V1):**
1. After `model.generate()`, retrieve `past_key_values` tensors
2. Quantize to 4 bits (group quantization: groups of 64 values, 1 scale factor per group)
3. Store compressed cache (~8x smaller)
4. On next exchange, dequantize and pass as `past_key_values` to generate

**Implementation:**
- `compressKVCache(pastKV)` and `decompressKVCache(compressed)` in `packages/agent`
- Runs inside the Web Worker (non-blocking)
- Activated via `turbo: true` flag in WasmProvider options
- `@huggingface/transformers` already has `DynamicCache` and `past_key_values` support — need to verify they are exposed after generate

**Memory estimates (E2B, 128K context):**
| Precision | KV cache size | Feasible in browser? |
|-----------|--------------|---------------------|
| FP16 (current) | ~500MB-1GB | No (too large to keep) |
| 4-bit quantized | ~125-250MB | Borderline |
| 2-bit quantized | ~60-120MB | Yes |

**Risks:**
- Quality degradation from quantization (TurboQuant uses Mixed Precision + Smooth Attention to compensate)
- `@huggingface/transformers` may not expose `past_key_values` after generate in ONNX/WebGPU mode
- Quantization/dequantization overhead may negate the cache benefit for short conversations

**Effort:** ~1-2 days R&D + testing

**Status:** Parked — revisit when Gemma WASM is validated and inter-request caching becomes a priority.
