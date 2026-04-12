# MCP Proxies

Stdio-to-HTTP bridges that expose MCP servers (npm packages or Python scripts) as HTTP endpoints, making them accessible to browser-based MCP clients.

## Architecture

```
Browser McpClient
    |
    v  (HTTPS)
nginx reverse proxy  (demos.hyperskills.net)
    |
    v  (HTTP, localhost)
mcp-stdio-bridge.py  (one per server, systemd service)
    |
    v  (stdin/stdout, JSON-RPC 2.0)
MCP server subprocess  (npx / python3)
```

Each bridge:
- Spawns the MCP server as a child process communicating via stdio
- Accepts `POST /mcp` with JSON-RPC 2.0 body
- Forwards to the subprocess stdin, reads the response from stdout
- Returns it as `application/json`
- Manages subprocess lifecycle (lazy start, restart on crash)
- Optionally injects recipe tools from a JSON file

nginx adds CORS headers and maps each proxy to a public URL path.

## Servers

| Server | Package / script | Port | Production URL |
|--------|-----------------|------|----------------|
| hackernews | `npx -y hn-mcp-server` | 9006 | `https://demos.hyperskills.net/mcp-hackernews/mcp` |
| metmuseum | `npx -y metmuseum-mcp` | 9001 | `https://demos.hyperskills.net/mcp-metmuseum/mcp` |
| openmeteo | `npx -y open-meteo-mcp` | 9002 | `https://demos.hyperskills.net/mcp-openmeteo/mcp` |
| wikipedia | `npx -y wikipedia-mcp` | 9005 | `https://demos.hyperskills.net/mcp-wikipedia/mcp` |
| inaturalist | `python3 inaturalist-mcp.py` | 9007 | `https://demos.hyperskills.net/mcp-inaturalist/mcp` |
| nasa | `npx -y @programcomputer/nasa-mcp-server@latest` | 9008 | `https://demos.hyperskills.net/mcp-nasa/mcp` |
| datagouv | nginx CORS reverse proxy (no bridge) | -- | `https://demos.hyperskills.net/mcp-datagouv/mcp` |

## Usage

### Production (VM with systemd)

```bash
# Install everything on an Ubuntu/Debian VM
sudo ./setup.sh

# Re-run safely -- the script is idempotent
sudo ./setup.sh
```

The setup script:
1. Checks prerequisites (python3, node, npm, nginx)
2. Creates a dedicated `mcpbridge` system user
3. Copies bridge scripts to `/opt/mcp-bridge/`
4. Generates systemd unit files for each server
5. Generates the nginx location block
6. Starts/restarts all services
7. Tests each endpoint with curl

### Local development (Docker)

```bash
# Start all proxies
docker compose up -d

# Start a single proxy
docker compose up -d hackernews
```

## Configuration

### NASA API key

The NASA proxy requires a `NASA_API_KEY` environment variable. Set it before running setup:

```bash
export NASA_API_KEY="your-key-here"
sudo -E ./setup.sh
```

Or create `/opt/mcp-bridge/.env` on the VM:

```
NASA_API_KEY=your-key-here
```

### Recipes

Each server can optionally have a `recipes.json` file in `servers/{name}/` that injects recipe tools (`list_recipes`, `get_recipe`, `search_recipes`) into the MCP server's tool list. The bridge loads these at startup via the `--recipes` flag.

## File structure

```
mcp-proxies/
  bridge/
    mcp-stdio-bridge.py    -- the generic stdio-to-HTTP bridge
    inaturalist-mcp.py     -- custom Python MCP server for iNaturalist
  nginx/
    mcp-locations.conf     -- nginx location blocks (generated or manual)
  servers/
    hackernews/            -- per-server config and recipes
    metmuseum/
    openmeteo/
    wikipedia/
    inaturalist/
    nasa/
    datagouv/
  setup.sh                 -- VM provisioning script
  docker-compose.yml       -- local dev alternative
```
