/**
 * TurboQuant WASM bridge — loads the quantizer and provides typed wrappers.
 * Inspired by Fabrice Bellard's minimal C approach.
 */

export interface QuantizerInstance {
	/** Quantize a float32 vector to uint8 with metadata */
	quantize(vec: Float32Array, bitsPerDim?: number): Uint8Array;
	/** Dequantize back to float32 */
	dequantize(quantized: Uint8Array, dims: number, bitsPerDim?: number): Float32Array;
	/** Asymmetric dot product: float32 query × quantized vector */
	dotAsymmetric(query: Float32Array, quantized: Uint8Array, bitsPerDim?: number): number;
	/** Dot product between two quantized vectors */
	dotQuantized(a: Uint8Array, b: Uint8Array, dims: number, bitsPerDim?: number): number;
	/** Reset the WASM heap (call between batches) */
	resetHeap(): void;
}

let instance: QuantizerInstance | null = null;

interface WasmExports {
	memory: WebAssembly.Memory;
	alloc: (size: number) => number;
	reset_heap: () => void;
	random_rotate: (vec: number, d: number, seed: number) => void;
	quantize: (input: number, output: number, d: number, bits: number) => void;
	dequantize: (input: number, output: number, d: number, bits: number) => void;
	dot_quantized: (a: number, b: number, d: number, bits: number) => number;
	dot_asymmetric: (query: number, quantized: number, d: number, bits: number) => number;
}

const DEFAULT_BITS = 4;
const ROTATION_SEED = 42;
const META_SIZE = 8; // min (f32) + range (f32)

export async function loadQuantizer(): Promise<QuantizerInstance> {
	if (instance) return instance;

	const wasmUrl = new URL('./quantizer.wasm', import.meta.url);
	const response = await fetch(wasmUrl);
	const buffer = await response.arrayBuffer();
	const { instance: wasm } = await WebAssembly.instantiate(buffer, {
		env: {}
	});

	const exports = wasm.exports as unknown as WasmExports;
	const mem = exports.memory;

	instance = {
		quantize(vec: Float32Array, bitsPerDim = DEFAULT_BITS): Uint8Array {
			const d = vec.length;
			exports.reset_heap();

			// Allocate input buffer and copy vec
			const inputPtr = exports.alloc(d * 4);
			new Float32Array(mem.buffer, inputPtr, d).set(vec);

			// Random rotate in-place
			exports.random_rotate(inputPtr, d, ROTATION_SEED);

			// Allocate output buffer (d bytes + 8 bytes metadata)
			const outputPtr = exports.alloc(d + META_SIZE);

			// Quantize
			exports.quantize(inputPtr, outputPtr, d, bitsPerDim);

			// Copy result out (must copy before heap is reused)
			const result = new Uint8Array(d + META_SIZE);
			result.set(new Uint8Array(mem.buffer, outputPtr, d + META_SIZE));
			return result;
		},

		dequantize(quantized: Uint8Array, dims: number, bitsPerDim = DEFAULT_BITS): Float32Array {
			exports.reset_heap();
			const inputPtr = exports.alloc(quantized.length);
			new Uint8Array(mem.buffer, inputPtr, quantized.length).set(quantized);
			const outputPtr = exports.alloc(dims * 4);
			exports.dequantize(inputPtr, outputPtr, dims, bitsPerDim);
			const result = new Float32Array(dims);
			result.set(new Float32Array(mem.buffer, outputPtr, dims));
			return result;
		},

		dotAsymmetric(query: Float32Array, quantized: Uint8Array, bitsPerDim = DEFAULT_BITS): number {
			const d = query.length;
			exports.reset_heap();

			// Copy and rotate query
			const queryPtr = exports.alloc(d * 4);
			new Float32Array(mem.buffer, queryPtr, d).set(query);
			exports.random_rotate(queryPtr, d, ROTATION_SEED);

			// Copy quantized vector
			const qPtr = exports.alloc(quantized.length);
			new Uint8Array(mem.buffer, qPtr, quantized.length).set(quantized);

			return exports.dot_asymmetric(queryPtr, qPtr, d, bitsPerDim);
		},

		dotQuantized(a: Uint8Array, b: Uint8Array, dims: number, bitsPerDim = DEFAULT_BITS): number {
			exports.reset_heap();
			const aPtr = exports.alloc(a.length);
			new Uint8Array(mem.buffer, aPtr, a.length).set(a);
			const bPtr = exports.alloc(b.length);
			new Uint8Array(mem.buffer, bPtr, b.length).set(b);
			return exports.dot_quantized(aPtr, bPtr, dims, bitsPerDim);
		},

		resetHeap() {
			exports.reset_heap();
		}
	};

	return instance;
}
