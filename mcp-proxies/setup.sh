#!/usr/bin/env bash
set -euo pipefail

# MCP Proxies -- VM provisioning script
# Installs and configures all MCP stdio-to-HTTP bridges on an Ubuntu/Debian host.
# Idempotent: safe to re-run.

BRIDGE_DIR="/opt/mcp-bridge"
BRIDGE_USER="mcpbridge"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NGINX_SNIPPET="/etc/nginx/snippets/mcp-locations.conf"

# ── Colour helpers ───────────────────────────────────────────────────────────

green()  { printf '\033[32m%s\033[0m\n' "$*"; }
red()    { printf '\033[31m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }

# ── Root check ───────────────────────────────────────────────────────────────

if [[ $EUID -ne 0 ]]; then
    red "This script must be run as root (or with sudo)."
    exit 1
fi

# ── Prerequisites ────────────────────────────────────────────────────────────

green "[1/7] Checking prerequisites..."

missing=()
for cmd in python3 node npm nginx; do
    if ! command -v "$cmd" &>/dev/null; then
        missing+=("$cmd")
    fi
done

if [[ ${#missing[@]} -gt 0 ]]; then
    red "Missing commands: ${missing[*]}"
    echo "Install them first (e.g. apt install python3 nodejs npm nginx)."
    exit 1
fi

echo "  python3 $(python3 --version 2>&1 | awk '{print $2}')"
echo "  node    $(node --version)"
echo "  npm     $(npm --version)"
echo "  nginx   $(nginx -v 2>&1 | awk -F/ '{print $2}')"

# ── System user ──────────────────────────────────────────────────────────────

green "[2/7] Ensuring system user '$BRIDGE_USER'..."

if id "$BRIDGE_USER" &>/dev/null; then
    echo "  User '$BRIDGE_USER' already exists."
else
    useradd --system --no-create-home --shell /usr/sbin/nologin "$BRIDGE_USER"
    echo "  Created system user '$BRIDGE_USER'."
fi

# ── Copy bridge files ────────────────────────────────────────────────────────

green "[3/7] Copying bridge files to $BRIDGE_DIR..."

mkdir -p "$BRIDGE_DIR"
mkdir -p "$BRIDGE_DIR/recipes"

cp "$SCRIPT_DIR/bridge/mcp-stdio-bridge.py" "$BRIDGE_DIR/mcp-stdio-bridge.py"
cp "$SCRIPT_DIR/bridge/inaturalist-mcp.py"  "$BRIDGE_DIR/inaturalist-mcp.py"
chmod +x "$BRIDGE_DIR/mcp-stdio-bridge.py"
chmod +x "$BRIDGE_DIR/inaturalist-mcp.py"

# Copy recipes if they exist
for server_dir in "$SCRIPT_DIR"/servers/*/; do
    server_name="$(basename "$server_dir")"
    if [[ -f "$server_dir/recipes.json" ]]; then
        cp "$server_dir/recipes.json" "$BRIDGE_DIR/recipes/${server_name}.json"
        echo "  Copied recipes.json for $server_name"
    fi
    # Copy .md recipe files if directory exists
    if [ -d "$server_dir/recipes" ]; then
        mkdir -p "$BRIDGE_DIR/recipes/$server_name"
        cp "$server_dir/recipes/"*.md "$BRIDGE_DIR/recipes/$server_name/"
        count=$(ls "$server_dir/recipes/"*.md 2>/dev/null | wc -l | tr -d ' ')
        echo "  Copied $count .md recipes for $server_name"
    fi
done

chown -R root:root "$BRIDGE_DIR"
chmod 755 "$BRIDGE_DIR"

# ── .env file for secrets ────────────────────────────────────────────────────

if [[ ! -f "$BRIDGE_DIR/.env" ]]; then
    cat > "$BRIDGE_DIR/.env" <<'ENVEOF'
# MCP bridge environment variables
# NASA_API_KEY=YOUR_NASA_API_KEY
ENVEOF
    chmod 600 "$BRIDGE_DIR/.env"
    chown root:root "$BRIDGE_DIR/.env"
    yellow "  Created $BRIDGE_DIR/.env -- edit it to add your NASA_API_KEY."
else
    echo "  $BRIDGE_DIR/.env already exists, not overwriting."
fi

# ── Generate systemd units ──────────────────────────────────────────────────

green "[4/7] Generating systemd service files..."

generate_unit() {
    local name="$1"
    local cmd="$2"
    local port="$3"
    local extra_env="${4:-}"
    local unit_file="/etc/systemd/system/mcp-${name}.service"

    local recipes_flag=""
    if [[ -d "$BRIDGE_DIR/recipes/${name}" ]]; then
        # Prefer .md recipe directory over legacy JSON
        recipes_flag="--recipes-dir $BRIDGE_DIR/recipes/${name}"
    elif [[ -f "$BRIDGE_DIR/recipes/${name}.json" ]]; then
        recipes_flag="--recipes $BRIDGE_DIR/recipes/${name}.json"
    fi

    cat > "$unit_file" <<EOF
[Unit]
Description=MCP bridge: ${name}
After=network.target

[Service]
Type=simple
User=${BRIDGE_USER}
Group=${BRIDGE_USER}
EnvironmentFile=${BRIDGE_DIR}/.env
${extra_env}
ExecStart=/usr/bin/python3 ${BRIDGE_DIR}/mcp-stdio-bridge.py --cmd "${cmd}" --port ${port} ${recipes_flag}
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=mcp-${name}

# Security hardening
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=${BRIDGE_DIR}
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
EOF

    echo "  Generated $unit_file (port $port)"
}

generate_unit "hackernews"  "npx -y hn-mcp-server"                                9006
generate_unit "metmuseum"   "npx -y metmuseum-mcp"                                9001
generate_unit "openmeteo"   "npx -y open-meteo-mcp"                               9002
generate_unit "wikipedia"   "npx -y wikipedia-mcp"                                9005
generate_unit "inaturalist" "python3 ${BRIDGE_DIR}/inaturalist-mcp.py"            9007
generate_unit "nasa"        "npx -y @programcomputer/nasa-mcp-server@latest"      9008 "Environment=NASA_API_KEY=\${NASA_API_KEY}"

systemctl daemon-reload

# ── nginx configuration ─────────────────────────────────────────────────────

green "[5/7] Installing nginx configuration..."

mkdir -p "$(dirname "$NGINX_SNIPPET")"
cp "$SCRIPT_DIR/nginx/mcp-locations.conf" "$NGINX_SNIPPET"
echo "  Installed $NGINX_SNIPPET"

# Check if the snippet is included in the main site config
if ! nginx -t 2>/dev/null; then
    yellow "  WARNING: nginx config test failed. Make sure your server block includes:"
    yellow "    include $NGINX_SNIPPET;"
else
    echo "  nginx config test passed."
fi

# ── Start services ───────────────────────────────────────────────────────────

green "[6/7] Starting/restarting services..."

SERVICES=(mcp-hackernews mcp-metmuseum mcp-openmeteo mcp-wikipedia mcp-inaturalist mcp-nasa)

for svc in "${SERVICES[@]}"; do
    systemctl enable "$svc" --now 2>/dev/null
    systemctl restart "$svc"
    echo "  $svc: $(systemctl is-active "$svc")"
done

# Reload nginx (not restart, to avoid dropping connections)
nginx -s reload 2>/dev/null || systemctl reload nginx
echo "  nginx: reloaded"

# ── Health checks ────────────────────────────────────────────────────────────

green "[7/7] Testing endpoints (waiting 3s for bridges to start)..."
sleep 3

declare -A ENDPOINTS=(
    [hackernews]=9006
    [metmuseum]=9001
    [openmeteo]=9002
    [wikipedia]=9005
    [inaturalist]=9007
    [nasa]=9008
)

PAYLOAD='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
ok=0
fail=0

for name in "${!ENDPOINTS[@]}"; do
    port="${ENDPOINTS[$name]}"
    status=$(curl -s -o /dev/null -w '%{http_code}' \
        -X POST "http://127.0.0.1:${port}/mcp" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD" \
        --max-time 10 2>/dev/null || echo "000")
    if [[ "$status" == "200" ]]; then
        green "  $name (port $port): OK ($status)"
        ((ok++))
    else
        red "  $name (port $port): FAILED ($status)"
        ((fail++))
    fi
done

echo ""
if [[ $fail -eq 0 ]]; then
    green "All $ok bridges are healthy."
else
    yellow "$ok OK, $fail FAILED. Check logs with: journalctl -u mcp-<name> -f"
fi
