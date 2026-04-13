/**
 * Typed wrapper around the pure-JS `hyperskills` package.
 * This avoids "no declaration file" errors in strict TS
 * without requiring hyperskills to ship its own types.
 */

// @ts-ignore — hyperskills is intentionally pure JS
import * as hs from 'hyperskills';

export const encode: (
  sourceUrl: string,
  content: string,
  options?: { compress?: 'gz' | 'br' },
) => Promise<string> = hs.encode;

export const decode: (
  urlOrParam: string,
) => Promise<{ sourceUrl: string; content: string }> = hs.decode;

export const hash: (
  sourceUrl: string,
  content: string,
  previousHash?: string,
) => Promise<string> = hs.hash;

export const diff: (prev: unknown, next: unknown) => unknown = hs.diff;

export const getHsParam: () => string | null = hs.getHsParam;

export const createVersion: (
  sourceUrl: string,
  content: string,
  previousHash?: string,
) => Promise<{ hash: string; content: string }> = hs.createVersion;

export const sign: (hashHex: string, privateKey: CryptoKey) => Promise<string> = hs.sign;

export const verify: (
  hashHex: string,
  signatureB64: string,
  publicKey: CryptoKey,
) => Promise<boolean> = hs.verify;

export const generateKeyPair: () => Promise<{
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}> = hs.generateKeyPair;
