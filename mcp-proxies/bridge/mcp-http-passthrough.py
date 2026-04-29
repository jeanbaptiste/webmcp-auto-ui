#!/usr/bin/env python3
"""
MCP HTTP passthrough with recipe injection.

Forwards JSON-RPC 2.0 requests to a remote MCP server (HTTP/streamable-http)
while injecting local recipe tools (`list_recipes`, `get_recipe`, `search_recipes`)
and merging them into `tools/list` responses.

Use case: wrapping a remote MCP service we don't host (e.g. mcp.data.gouv.fr)
to add server-side recipe metadata without forking the upstream code.

Usage:
    python3 mcp-http-passthrough.py --upstream https://mcp.data.gouv.fr/mcp \\
        --port 9006 --recipes-dir /opt/mcp-bridge/recipes/datagouv/
"""

import argparse
import json
import os
import sys
import threading
import time
import urllib.request
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler

session_id = "passthrough-" + str(int(time.time()))

# ── Recipes ───────────────────────────────────────────────────────────────────
recipes_data = []  # loaded from --recipes or --recipes-dir


def parse_frontmatter(text):
    """Parse YAML frontmatter from a markdown string. Minimal parser — no external deps."""
    if not text.startswith('---'):
        return {}, text
    parts = text.split('---', 2)
    if len(parts) < 3:
        return {}, text
    fm = parts[1].strip()
    body = parts[2].strip()
    meta = {}
    current_key = None
    current_list = None
    for raw in fm.split('\n'):
        line = raw.rstrip()
        if not line.strip():
            continue
        if current_list is not None and line.startswith(' ') and line.lstrip().startswith('-'):
            current_list.append(line.lstrip()[1:].strip().strip('"').strip("'"))
            continue
        current_list = None
        if ':' not in line:
            continue
        key, _, val = line.partition(':')
        key = key.strip()
        val = val.strip()
        if not val:
            current_list = []
            meta[key] = current_list
        elif val.startswith('[') and val.endswith(']'):
            inner = val[1:-1].strip()
            meta[key] = [v.strip().strip('"').strip("'") for v in inner.split(',')] if inner else []
        else:
            meta[key] = val.strip('"').strip("'")
    return meta, body


def load_recipes_from_dir(recipes_dir):
    """Load .md recipe files with YAML frontmatter from a directory."""
    recipes = []
    for f in sorted(os.listdir(recipes_dir)):
        if not f.endswith('.md'):
            continue
        with open(os.path.join(recipes_dir, f)) as fh:
            content = fh.read()
        meta, body = parse_frontmatter(content)
        if meta.get('name') or meta.get('id'):
            recipe = {**meta, 'name': meta.get('name') or meta.get('id'), 'content': body}
            recipes.append(recipe)
    return recipes


RECIPE_TOOLS = [
    {
        "name": "list_recipes",
        "description": "List all available recipes for this MCP server. Each recipe describes a data pattern returned by one or more tools, including the data shape and type.",
        "inputSchema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_recipe",
        "description": "Get a specific recipe by name.",
        "inputSchema": {
            "type": "object",
            "properties": {"name": {"type": "string", "description": "Recipe name"}},
            "required": ["name"],
        },
    },
    {
        "name": "search_recipes",
        "description": "Search recipes by keyword (matches name, description, data_type).",
        "inputSchema": {
            "type": "object",
            "properties": {"query": {"type": "string", "description": "Search keyword"}},
            "required": ["query"],
        },
    },
]


def handle_recipe_call(name, arguments):
    """Handle recipe tool calls locally, return MCP tool result content."""
    if name == "list_recipes":
        summary = [{"name": r["name"], "description": r.get("description", ""), "data_type": r.get("data_type", "")} for r in recipes_data]
        return {"content": [{"type": "text", "text": json.dumps(summary, indent=2)}]}

    if name == "get_recipe":
        rname = arguments.get("name", "")
        for r in recipes_data:
            if r["name"] == rname:
                if "content" in r:
                    return {"content": [{"type": "text", "text": r["content"]}]}
                return {"content": [{"type": "text", "text": json.dumps(r, indent=2)}]}
        return {"content": [{"type": "text", "text": "Recipe not found: " + rname}], "isError": True}

    if name == "search_recipes":
        query = arguments.get("query", "").lower()
        matches = [
            r for r in recipes_data
            if query in r.get("name", "").lower()
            or query in r.get("description", "").lower()
            or query in r.get("data_type", "").lower()
            or query in r.get("content", "").lower()
        ]
        summary = [{"name": r["name"], "description": r.get("description", ""), "data_type": r.get("data_type", "")} for r in matches]
        return {"content": [{"type": "text", "text": json.dumps(summary, indent=2)}]}

    return {"content": [{"type": "text", "text": "Unknown recipe tool: " + name}], "isError": True}


# ── Upstream forwarding ───────────────────────────────────────────────────────

def forward_to_upstream(upstream_url, request_body, accept_header):
    """POST the JSON-RPC request to the upstream MCP server, return parsed response.

    Handles both `application/json` and `text/event-stream` (SSE) responses by
    extracting the first JSON object found in the body.
    """
    req = urllib.request.Request(
        upstream_url,
        data=request_body,
        method='POST',
        headers={
            'Content-Type': 'application/json',
            'Accept': accept_header or 'application/json, text/event-stream',
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read().decode('utf-8', errors='replace')
    # SSE responses prefix with `data: ` lines — extract the JSON payload.
    if raw.lstrip().startswith('event:') or 'data:' in raw[:200]:
        for line in raw.splitlines():
            if line.startswith('data:'):
                payload = line[len('data:'):].strip()
                if payload.startswith('{'):
                    return json.loads(payload)
    return json.loads(raw)


class PassthroughHandler(BaseHTTPRequestHandler):
    upstream = ""

    def do_POST(self):
        if self.path != "/mcp":
            self.send_error(404)
            return

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)

        try:
            request = json.loads(body)
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
            return

        method = request.get("method", "")
        params = request.get("params", {})
        is_notification = "id" not in request

        try:
            # Notifications: forward fire-and-forget, return 202.
            if is_notification:
                try:
                    forward_to_upstream(self.upstream, body, self.headers.get('Accept', ''))
                except Exception:
                    pass
                self.send_response(202)
                self.send_header("Content-Length", "0")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                return

            # ── Recipe tool interception (handled locally) ───────────────
            if recipes_data and method == "tools/call":
                tool_name = params.get("name", "")
                if tool_name in ("list_recipes", "get_recipe", "search_recipes"):
                    result = handle_recipe_call(tool_name, params.get("arguments", {}))
                    response = {"jsonrpc": "2.0", "id": request.get("id"), "result": result}
                    self._respond(response)
                    return

            # Forward to upstream MCP server.
            response = forward_to_upstream(self.upstream, body, self.headers.get('Accept', ''))

            # ── Inject recipe tools into tools/list response ─────────────
            if recipes_data and method == "tools/list":
                result = response.get("result", {})
                tools = result.get("tools", [])
                tools.extend(RECIPE_TOOLS)
                result["tools"] = tools
                response["result"] = result

        except urllib.error.HTTPError as e:
            response = {
                "jsonrpc": "2.0",
                "id": request.get("id"),
                "error": {"code": -32603, "message": "Upstream %d: %s" % (e.code, e.reason)},
            }
        except Exception as e:
            response = {
                "jsonrpc": "2.0",
                "id": request.get("id"),
                "error": {"code": -32603, "message": str(e)},
            }

        self._respond(response)

    def _respond(self, response):
        payload = json.dumps(response).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Mcp-Session-Id", session_id)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Expose-Headers", "Mcp-Session-Id")
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Mcp-Session-Id, Accept")
        self.send_header("Access-Control-Expose-Headers", "Mcp-Session-Id")
        self.end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("[passthrough] %s\n" % (fmt % args))


def main():
    parser = argparse.ArgumentParser(description="MCP HTTP passthrough with recipe injection")
    parser.add_argument("--upstream", required=True, help="Upstream MCP HTTP URL (e.g. https://mcp.data.gouv.fr/mcp)")
    parser.add_argument("--port", type=int, default=9006, help="HTTP port (default: 9006)")
    parser.add_argument("--host", default="127.0.0.1", help="Bind address (default: 127.0.0.1)")
    parser.add_argument("--recipes", default=None, help="Path to recipes JSON file")
    parser.add_argument("--recipes-dir", default=None, help="Path to directory of .md recipe files with YAML frontmatter")
    args = parser.parse_args()

    global recipes_data
    if args.recipes_dir:
        try:
            recipes_data = load_recipes_from_dir(args.recipes_dir)
            print("Loaded %d recipes from %s" % (len(recipes_data), args.recipes_dir), file=sys.stderr)
        except Exception as e:
            print("Warning: could not load recipes from %s: %s" % (args.recipes_dir, e), file=sys.stderr)
    elif args.recipes:
        try:
            with open(args.recipes) as f:
                recipes_data = json.load(f)
            print("Loaded %d recipes from %s" % (len(recipes_data), args.recipes), file=sys.stderr)
        except Exception as e:
            print("Warning: could not load recipes from %s: %s" % (args.recipes, e), file=sys.stderr)

    PassthroughHandler.upstream = args.upstream
    server = HTTPServer((args.host, args.port), PassthroughHandler)
    print("Passthrough: %s -> http://%s:%d/mcp" % (args.upstream, args.host, args.port), file=sys.stderr)
    server.serve_forever()


if __name__ == "__main__":
    main()
