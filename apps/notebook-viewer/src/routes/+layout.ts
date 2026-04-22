// SvelteKit static adapter + SPA fallback: disable SSR so we can decode
// HyperSkill payloads that only exist in the browser URL fragment/query
// at runtime. Prerender the landing page but leave dynamic routes CSR-only.
export const ssr = false;
export const prerender = false;
export const trailingSlash = 'ignore';
