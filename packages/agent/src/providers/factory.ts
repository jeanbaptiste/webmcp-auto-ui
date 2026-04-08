import type { LLMProvider, RemoteModelId, WasmModelId } from '../types.js';
import { RemoteLLMProvider } from './remote.js';
import { WasmProvider } from './wasm.js';
import { LocalLLMProvider, type LocalBackend } from './local.js';

export type LLMConfig =
  | { type: 'remote'; model?: RemoteModelId; proxyUrl?: string; apiKey?: string }
  | { type: 'wasm';   model?: WasmModelId;   onProgress?: (loaded: number, total: number) => void }
  | { type: 'local';  model: string;         baseUrl: string; backend?: LocalBackend };

export function createProvider(config: LLMConfig): LLMProvider {
  const base = typeof window !== 'undefined' ? (document.querySelector('base') as HTMLBaseElement | null)?.href ?? '' : '';

  switch (config.type) {
    case 'remote':
      return new RemoteLLMProvider({
        proxyUrl: config.proxyUrl ?? `${base}api/chat`,
        model: config.model,
        apiKey: config.apiKey,
      });
    case 'wasm':
      return new WasmProvider({
        model: config.model,
        onProgress: config.onProgress ? (progress, _status, loaded, total) => config.onProgress!(loaded ?? 0, total ?? 0) : undefined,
      });
    case 'local':
      return new LocalLLMProvider({
        baseUrl: config.baseUrl,
        model: config.model,
        backend: config.backend,
      });
  }
}
