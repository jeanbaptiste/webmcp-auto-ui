# data.gouv.fr MCP Server

CORS reverse proxy to the official data.gouv.fr MCP server hosted at `https://mcp.data.gouv.fr/mcp`.

## Architecture

Unlike other MCP proxy servers in this project, datagouv is **not** a local bridge. The French government hosts its own MCP server at `mcp.data.gouv.fr`. This proxy exists solely to work around CORS restrictions for front-end applications that need to connect directly from the browser.

There is:
- **No local bridge script** (no Python, no npm package)
- **No `service.conf`** (no local process to manage)
- **No `recipes.json`** (recipes depend on the remote server's tool definitions, which may change)

## How it works

The `nginx-cors.conf` file defines an nginx location block that:

1. Handles CORS preflight (OPTIONS) requests by returning the appropriate `Access-Control-*` headers
2. Proxies POST requests to `https://mcp.data.gouv.fr/` with SNI enabled
3. Adds `Access-Control-Allow-Origin: *` to all responses so browser-based MCP clients can connect

## Deployment

Include `nginx-cors.conf` in your nginx server block configuration:

```nginx
server {
    listen 443 ssl;
    server_name demos.hyperskills.net;

    # ... other config ...

    include /path/to/mcp-proxies/servers/datagouv/nginx-cors.conf;
}
```

Then reload nginx: `sudo nginx -t && sudo systemctl reload nginx`

## Available Tools

The tools are defined by the remote server and may evolve. As of the last check, data.gouv.fr MCP exposes tools for:
- Searching datasets
- Fetching dataset metadata
- Listing resources within a dataset
- Downloading resource previews

Refer to `https://mcp.data.gouv.fr/mcp` for the current tool definitions.

## Authentication

No API key required. The data.gouv.fr MCP server is publicly accessible.
