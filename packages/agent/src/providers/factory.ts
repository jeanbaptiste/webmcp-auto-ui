import type { LLMProvider, RemoteModelId, WasmModelId } from '../types.js';
import { RemoteLLMProvider } from './remote.js';
import { WasmProvider } from './wasm.js';
import { LocalLLMProvider, type LocalBackend } from './local.js';
import { TransformersProvider } from './transformers.js';
import { HawkProvider } from './hawk.js';

export type LLMConfig =
  | { type: 'remote';       model?: RemoteModelId; proxyUrl?: string; apiKey?: string }
  | { type: 'wasm';         model?: WasmModelId;   onProgress?: (loaded: number, total: number) => void }
  | { type: 'transformers'; model: string;         onProgress?: (loaded: number, total: number) => void }
  | { type: 'local';        model: string;         baseUrl: string; backend?: LocalBackend }
  | { type: 'hawk';         model: string;         proxyUrl?: string };

export function createProvider(config: LLMConfig): LLMProvider {
  const base = typeof window !== 'undefined' ? (document.querySelector('base') as HTMLBaseElement | null)?.href ?? '' : '';

  // Prefix-based dispatch: a `transformers-*` model routes to TransformersProvider
  // regardless of the declared type (defensive).
  if ('model' in config && typeof config.model === 'string' && config.model.startsWith('hawk-')) {
    return new HawkProvider({
      proxyUrl: (config as { proxyUrl?: string }).proxyUrl ?? `${base}api/hawk`,
      model: config.model.slice(5),
    });
  }

  if ('model' in config && typeof config.model === 'string' && config.model.startsWith('transformers-')) {
    const onProgress = (config as { onProgress?: (loaded: number, total: number) => void }).onProgress;
    return new TransformersProvider({
      model: config.model,
      onProgress: onProgress ? (_progress, _status, loaded, total) => onProgress(loaded ?? 0, total ?? 0) : undefined,
    });
  }

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
    case 'transformers':
      return new TransformersProvider({
        model: config.model,
        onProgress: config.onProgress ? (_progress, _status, loaded, total) => config.onProgress!(loaded ?? 0, total ?? 0) : undefined,
      });
    case 'local':
      return new LocalLLMProvider({
        baseUrl: config.baseUrl,
        model: config.model,
        backend: config.backend,
      });
    case 'hawk':
      return new HawkProvider({
        proxyUrl: config.proxyUrl ?? `${base}api/hawk`,
        model: config.model,
      });
  }
}
