#!/usr/bin/env python3
"""
MCP stdio → Streamable HTTP bridge.

Wraps any MCP server that speaks JSON-RPC 2.0 over stdio into an HTTP endpoint
compatible with McpClient (Streamable HTTP transport).

Usage:
    python3 mcp-stdio-bridge.py --cmd "npx @mikechao/metmuseum-mcp" --port 9001
    python3 mcp-stdio-bridge.py --cmd "npx @mikechao/metmuseum-mcp" --port 9001 --recipes /opt/mcp-bridge/recipes/metmuseum.json
    python3 mcp-stdio-bridge.py --cmd "npx @mikechao/metmuseum-mcp" --port 9001 --recipes-dir /opt/mcp-bridge/recipes/metmuseum/

The bridge:
- Accepts POST /mcp with JSON-RPC 2.0 body
- Forwards to the subprocess stdin
- Reads JSON-RPC response from stdout
- Returns it as HTTP response (application/json)
- Manages subprocess lifecycle (start on first request, restart on crash)
- Optionally injects recipe tools (list_recipes, get_recipe, search_recipes)
"""

import argparse
import json
import os
import subprocess
import sys
import threading
import time
from http.server import HTTPServer, BaseHTTPRequestHandler

proc = None
proc_lock = threading.Lock()
session_id = "bridge-" + str(int(time.time()))

# ── Recipes ───────────────────────────────────────────────────────────────────
recipes_data = []  # loaded from --recipes or --recipes-dir


def parse_frontmatter(text):
    """Parse YAML frontmatter from a markdown string. Minimal parser — no external deps.

    Supports: scalar values, single-line lists (``[a, b]``), and indented
    dash-lists (``- item``). Returns (meta_dict, body_string).
    """
    if not text.startswith('---'):
        return {}, text
    parts = text.split('---', 2)
    if len(parts) < 3:
        return {}, text

    meta = {}
    current_key = None
    for line in parts[1].strip().split('\n'):
        stripped = line.strip()
        if not stripped or stripped.startswith('#'):
            continue
        # Indented list item belonging to current_key
        if stripped.startswith('- ') and current_key is not None and line[0] in (' ', '\t'):
            val = stripped[2:].strip().strip('"').strip("'")
            if not isinstance(meta[current_key], list):
                meta[current_key] = [meta[current_key]]
            meta[current_key].append(val)
            continue
        if ':' in stripped:
            key, val = stripped.split(':', 1)
            key = key.strip()
            val = val.strip()
            current_key = key
            # Inline list: [a, b, c]
            if val.startswith('[') and val.endswith(']'):
                meta[key] = [v.strip().strip('"').strip("'") for v in val[1:-1].split(',') if v.strip()]
            elif val == '':
                meta[key] = []
            else:
                meta[key] = val.strip('"').strip("'")
        else:
            current_key = None

    body = parts[2].strip()
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
        if meta.get('name'):
            recipe = {**meta, 'content': body}
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
                # Markdown recipes: return the body content directly
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
        # Return summary for search results (not full content)
        summary = [{"name": r["name"], "description": r.get("description", ""), "data_type": r.get("data_type", "")} for r in matches]
        return {"content": [{"type": "text", "text": json.dumps(summary, indent=2)}]}

    return {"content": [{"type": "text", "text": "Unknown recipe tool: " + name}], "isError": True}


# ── Process management ────────────────────────────────────────────────────────

def start_process(cmd):
    return subprocess.Popen(
        cmd,
        shell=True,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
    )


def ensure_process(cmd):
    global proc
    with proc_lock:
        if proc is None or proc.poll() is not None:
            proc = start_process(cmd)
        return proc


def send_jsonrpc(p, request):
    line = json.dumps(request) + "\n"
    p.stdin.write(line)
    p.stdin.flush()

    req_id = request.get("id")
    for _ in range(200):
        response_line = p.stdout.readline()
        if not response_line:
            raise RuntimeError("Process closed stdout")
        stripped = response_line.strip()
        if not stripped or not stripped.startswith("{"):
            continue
        try:
            msg = json.loads(stripped)
        except json.JSONDecodeError:
            continue
        if "id" not in msg:
            continue
        if req_id is not None and msg.get("id") != req_id:
            continue
        return msg
    raise RuntimeError("No matching JSON-RPC response after 200 lines")


class BridgeHandler(BaseHTTPRequestHandler):
    cmd = ""

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
            p = ensure_process(self.cmd)
            if is_notification:
                line = json.dumps(request) + "\n"
                p.stdin.write(line)
                p.stdin.flush()
                self.send_response(202)
                self.send_header("Content-Length", "0")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                return

            # ── Recipe tool interception ──────────────────────────────────
            if recipes_data and method == "tools/call":
                tool_name = params.get("name", "")
                if tool_name in ("list_recipes", "get_recipe", "search_recipes"):
                    result = handle_recipe_call(tool_name, params.get("arguments", {}))
                    response = {"jsonrpc": "2.0", "id": request.get("id"), "result": result}
                    payload = json.dumps(response).encode()
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Content-Length", str(len(payload)))
                    self.send_header("Mcp-Session-Id", session_id)
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.send_header("Access-Control-Expose-Headers", "Mcp-Session-Id")
                    self.end_headers()
                    self.wfile.write(payload)
                    return

            response = send_jsonrpc(p, request)

            # ── Inject recipe tools into tools/list response ──────────────
            if recipes_data and method == "tools/list":
                result = response.get("result", {})
                tools = result.get("tools", [])
                tools.extend(RECIPE_TOOLS)
                result["tools"] = tools
                response["result"] = result

        except Exception as e:
            response = {
                "jsonrpc": "2.0",
                "id": request.get("id"),
                "error": {"code": -32603, "message": str(e)},
            }

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
        sys.stderr.write("[bridge] %s\n" % (fmt % args))


def main():
    parser = argparse.ArgumentParser(description="MCP stdio -> HTTP bridge")
    parser.add_argument("--cmd", required=True, help="MCP server command")
    parser.add_argument("--port", type=int, default=9001, help="HTTP port (default: 9001)")
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

    BridgeHandler.cmd = args.cmd
    server = HTTPServer((args.host, args.port), BridgeHandler)
    print("Bridge: %s -> http://%s:%d/mcp" % (args.cmd, args.host, args.port), file=sys.stderr)
    server.serve_forever()


if __name__ == "__main__":
    main()
