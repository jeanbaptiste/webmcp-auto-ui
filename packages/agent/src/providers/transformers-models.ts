// Shared catalog of in-browser models served via transformers.js (ONNX + WebGPU).
// Read by TransformersProvider (agent A) and the <LLMSelector> UI (agent D).
//
// Each entry pins:
//   - `repo`: HuggingFace repository ID to load via from_pretrained
//   - `dtype`: mixed per-component quantization (embed_tokens / decoder / vision)
//   - `family`: prompt builder family — drives which {gemma,qwen,mistral}-prompt-builder is used
//   - `toolFormat`: output tool-call syntax — drives which parser strategy is used
//   - `contextLength`: native context budget (for clipping heuristics)
//   - `vision`: true if the model accepts images via RawImage + AutoProcessor
//   - `modelClass`: optional specialized transformers.js class name (for VLMs);
//                   defaults to AutoModelForCausalLM when omitted

export type TransformersFamily = 'gemma4' | 'qwen3' | 'mistral';
export type ToolCallFormat = 'gemma-native' | 'qwen-json' | 'mistral-toolcalls';

export type DType = 'q4' | 'q4f16' | 'q8' | 'fp16' | 'fp32';

export interface TransformersModelEntry {
  repo: string;
  dtype: DType | {
    embed_tokens?: DType;
    decoder_model_merged?: DType;
    vision_encoder?: DType;
    audio_encoder?: DType;
  };
  family: TransformersFamily;
  toolFormat: ToolCallFormat;
  contextLength: number;
  vision: boolean;
  modelClass?: string;
  /** Approximate download size in bytes (for progress UI). */
  size: number;
  /** Human-readable label for the model selector. */
  label: string;
}

export type TransformersModelId =
  | 'transformers-gemma-4-e2b'
  | 'transformers-gemma-4-e4b'
  | 'transformers-qwen-3-4b'
  | 'transformers-qwen-3.5-2b'
  | 'transformers-qwen-3.5-4b'
  | 'transformers-ministral-3-3b';

export const TRANSFORMERS_MODELS: Record<TransformersModelId, TransformersModelEntry> = {
  'transformers-gemma-4-e2b': {
    repo: 'onnx-community/gemma-4-E2B-it-ONNX',
    modelClass: 'Gemma4ForConditionalGeneration',
    dtype: {
      audio_encoder: 'q4',
      vision_encoder: 'q4',
      embed_tokens: 'q4',
      decoder_model_merged: 'q4f16',
    },
    family: 'gemma4',
    toolFormat: 'gemma-native',
    contextLength: 32768,
    vision: true,
    size: 2_000_000_000,
    label: 'Gemma 4 E2B (Vision)',
  },
  'transformers-gemma-4-e4b': {
    repo: 'onnx-community/gemma-4-E4B-it-ONNX',
    modelClass: 'Gemma4ForConditionalGeneration',
    dtype: {
      audio_encoder: 'q4',
      vision_encoder: 'q4',
      embed_tokens: 'q4',
      decoder_model_merged: 'q4f16',
    },
    family: 'gemma4',
    toolFormat: 'gemma-native',
    contextLength: 32768,
    vision: true,
    size: 3_000_000_000,
    label: 'Gemma 4 E4B (Vision)',
  },
  'transformers-qwen-3-4b': {
    // onnx-community/Qwen3-4B-ONNX ships a monolithic model_q4f16.onnx
    // (not split into embed_tokens + decoder_model_merged), so transformers.js
    // expects a scalar dtype string to resolve onnx/model_<dtype>.onnx.
    repo: 'onnx-community/Qwen3-4B-ONNX',
    dtype: 'q4f16',
    family: 'qwen3',
    toolFormat: 'qwen-json',
    contextLength: 32768,
    vision: false,
    size: 3_050_000_000,
    label: 'Qwen 3 4B',
  },
  'transformers-qwen-3.5-2b': {
    repo: 'onnx-community/Qwen3.5-2B-ONNX',
    dtype: { embed_tokens: 'q4', vision_encoder: 'fp16', decoder_model_merged: 'q4' },
    family: 'qwen3',
    toolFormat: 'qwen-json',
    contextLength: 32768,
    vision: true,
    modelClass: 'Qwen3_5ForConditionalGeneration',
    size: 1_600_000_000,
    label: 'Qwen 3.5 2B',
  },
  'transformers-qwen-3.5-4b': {
    repo: 'onnx-community/Qwen3.5-4B-ONNX',
    dtype: { embed_tokens: 'q4', vision_encoder: 'fp16', decoder_model_merged: 'q4' },
    family: 'qwen3',
    toolFormat: 'qwen-json',
    contextLength: 32768,
    vision: true,
    modelClass: 'Qwen3_5ForConditionalGeneration',
    size: 3_000_000_000,
    label: 'Qwen 3.5 4B',
  },
  'transformers-ministral-3-3b': {
    repo: 'mistralai/Ministral-3-3B-Instruct-2512-ONNX',
    // Mistral3ForConditionalGeneration is registered internally but not
    // re-exported from transformers.js 4.1.0 — use the Auto wrapper, which
    // routes via the registered name (this is what the official demo does).
    modelClass: 'AutoModelForImageTextToText',
    dtype: {
      vision_encoder: 'q4',
      embed_tokens: 'q4',
      decoder_model_merged: 'q4f16',
    },
    family: 'mistral',
    toolFormat: 'mistral-toolcalls',
    contextLength: 32768,
    vision: true,
    size: 2_200_000_000,
    label: 'Ministral 3 3B (Vision)',
  },
};

export function getTransformersModel(id: TransformersModelId): TransformersModelEntry {
  return TRANSFORMERS_MODELS[id];
}

export function listTransformersModels(): Array<{ id: TransformersModelId; entry: TransformersModelEntry }> {
  return Object.entries(TRANSFORMERS_MODELS).map(([id, entry]) => ({
    id: id as TransformersModelId,
    entry,
  }));
}
