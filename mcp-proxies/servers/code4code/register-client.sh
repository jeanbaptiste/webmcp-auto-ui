#!/usr/bin/env bash
# register-client.sh — Idempotent OIDC client registration for code4code bridge.
# Run as root on the VM: sudo bash register-client.sh
set -euo pipefail

CLIENT_JSON="/opt/mcp-bridge/code4code/client.json"
DIR="/opt/mcp-bridge/code4code"
REGISTRATION_ENDPOINT="https://auth.code4code.eu/realms/code4code/clients-registrations/openid-connect"

# ── Already registered ────────────────────────────────────────────────────────

if [[ -f "$CLIENT_JSON" ]]; then
    client_id="$(jq -r '.client_id // .clientId // empty' "$CLIENT_JSON")"
    echo "Client already registered."
    echo "  client_id: ${client_id:-<not found in client.json>}"
    exit 0
fi

# ── First-time registration ───────────────────────────────────────────────────

echo "Registering OIDC client with code4code Keycloak..."

mkdir -p "$DIR"
chmod 700 "$DIR"
chown root:root "$DIR"

PAYLOAD='{
  "client_name": "webmcp-auto-ui-bridge",
  "redirect_uris": ["https://demos.hyperskills.net/auth-test/"],
  "post_logout_redirect_uris": ["https://demos.hyperskills.net/auth-test/"],
  "grant_types": ["authorization_code","refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none"
}'

HTTP_STATUS="$(curl -s -o "$CLIENT_JSON.tmp" -w '%{http_code}' \
    -X POST "$REGISTRATION_ENDPOINT" \
    -H 'Content-Type: application/json' \
    -d "$PAYLOAD")"

if [[ "$HTTP_STATUS" != "201" && "$HTTP_STATUS" != "200" ]]; then
    echo "ERROR: Keycloak registration failed (HTTP $HTTP_STATUS):" >&2
    cat "$CLIENT_JSON.tmp" >&2
    rm -f "$CLIENT_JSON.tmp"
    exit 1
fi

mv "$CLIENT_JSON.tmp" "$CLIENT_JSON"
chmod 600 "$CLIENT_JSON"
chown root:root "$CLIENT_JSON"

client_id="$(jq -r '.client_id // .clientId // empty' "$CLIENT_JSON")"
if [[ -z "$client_id" ]]; then
    echo "ERROR: Registration succeeded but client_id not found in response." >&2
    exit 1
fi

echo "Client registered successfully."
echo "  client_id: $client_id"
echo ""
echo "Report this client_id in mcp-proxies/servers/code4code/service.conf (AUTH_CLIENT_ID)."
