# @webmcp-auto-ui/notebook-viewer

Public read-only viewer for shared notebooks — deployed at **`nb.hyperskills.net`**.

## What it does

Displays notebooks that were shared via the `Share → Hyperskill link` button of
the `notebook` widget. Legacy payloads with `notebook-compact`, `notebook-workspace`,
`notebook-document` or `notebook-editorial` are transparently mapped to `notebook`.

Three ingestion paths are supported:

| URL shape         | How it resolves                                                                  |
|-------------------|-----------------------------------------------------------------------------------|
| `/?hs=<payload>`  | Payload decoded client-side via `@webmcp-auto-ui/sdk` → `decode()`.              |
| `/?n=<token>`     | Token resolved via `GET /api/resolve?n=<token>` (Agent H backend).               |
| `/:slug`          | Permanent published notebook — `GET /api/p/:slug` (Agent H backend).             |

In every case, `state.mode` is forced to `'view'` before the widget is mounted,
so the shared page is strictly read-only.

## Architecture

- **SvelteKit** with `@sveltejs/adapter-static` (SPA fallback `index.html`).
- SSR is disabled at the layout level — the app is entirely client-side so
  that HyperSkill payloads in the URL are decoded at runtime.
- No external markdown / image libraries: widgets come from the registered
  `autoui` WebMCP server (`@webmcp-auto-ui/agent`) and render themselves via
  `mountWidget()` from `@webmcp-auto-ui/core`.

### Key files

```
src/
├── app.css                      # Light/dark theme + landing/error layout
├── app.html                     # Minimal shell
├── lib/
│   └── notebook-loader.ts       # decode / fetch / normalize / OG extraction
└── routes/
    ├── +layout.svelte           # Global shell + footer
    ├── +layout.ts               # ssr=false, prerender=false
    ├── +page.svelte             # ?hs= and ?n= ingestion + landing
    ├── +error.svelte            # 404 / generic error page
    └── [slug]/+page.svelte      # Permanent /:slug notebooks
```

## Build

From the repo root:

```bash
npm run build -w apps/notebook-viewer
```

The output goes to `apps/notebook-viewer/build/` (SPA bundle + `index.html`
fallback).

## Deploy

Always use the shared deploy script:

```bash
./scripts/deploy.sh notebook-viewer
```

**Do not deploy manually** with `scp` or `rsync` — the shared script knows the
correct destination on the VM.

## Runtime backend

The static bundle calls two HTTP endpoints that must be served from the same
origin (configured in the nginx vhost maintained by Agent H):

| Endpoint                  | Owner   | Purpose                                                |
|---------------------------|---------|--------------------------------------------------------|
| `GET /api/resolve?n=...`  | Agent H | Resolve short token → full notebook state JSON         |
| `GET /api/p/:slug`        | Agent H | Fetch permanent published notebook state JSON          |
| `GET /api/proxy?...`      | Agent H | (Optional) CORS proxy for notebook data servers        |

See `apps/notebook-viewer/server.ts`, `nginx.conf.template` and
`systemd/*.service` (maintained by Agent H) for the backend implementation.

## DNS / TLS

- DNS `A nb.hyperskills.net → <bot VM IP>`
- TLS via Let's Encrypt (cert-manager / certbot on the VM)
- nginx vhost proxies `/api/*` to the Node resolver and serves the SvelteKit
  SPA for every other path with `try_files $uri $uri/ /index.html;` so that
  `/:slug` routes hit the client-side router.

## Environment

The SPA itself reads no environment variables at build time. The backend
(`server.ts`) is configured separately via systemd `EnvironmentFile=`.

## Limits (v1)

- No real-time presence in view mode (this is a read-only snapshot).
- No OG preview image — only textual OG / Twitter cards are emitted.
- Notebook data servers are not re-hydrated: cells that depend on live MCP
  servers render their last saved result (or blank). Re-execution requires
  opening the notebook in an editing host (e.g. the composer app).
