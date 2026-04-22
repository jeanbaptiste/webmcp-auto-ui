export interface HawkModelEntry {
  id: string;      // ID Hawk (sans préfixe)
  label: string;   // Label humain pour le selector
  tokps?: number;  // Tokens/sec estimés (warm, indicatif)
}

export const HAWK_MODELS: HawkModelEntry[] = [
  { id: 'qwen35-2b',       label: 'Qwen 3.5 2B — 49 tok/s',       tokps: 49 },
  { id: 'bielik-1.5b-v3',  label: 'Bielik 1.5B — 47 tok/s',       tokps: 47 },
  { id: 'gemma4-e2b',      label: 'Gemma 4 E2B — 43 tok/s',       tokps: 43 },
  { id: 'ministral3-3b',   label: 'Ministral 3B — 35 tok/s',      tokps: 35 },
  { id: 'qwen3-4b',        label: 'Qwen 3 4B — 28 tok/s',         tokps: 28 },
  { id: 'gemma4-e4b',      label: 'Gemma 4 E4B — 26 tok/s',       tokps: 26 },
  { id: 'qwen35-4b',       label: 'Qwen 3.5 4B — 23 tok/s',       tokps: 23 },
  { id: 'qwen36-35b-a3b',  label: 'Qwen 3.6 35B MoE — 22 tok/s',  tokps: 22 },
  { id: 'gemma4-26b-a4b',  label: 'Gemma 4 26B MoE — 20 tok/s',   tokps: 20 },
  { id: 'ministral-8b',    label: 'Ministral 8B — 16 tok/s',      tokps: 16 },
];

export function listHawkModels(): HawkModelEntry[] {
  return HAWK_MODELS;
}
