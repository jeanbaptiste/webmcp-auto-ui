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
import re
import sys
import tempfile
import threading
import time
import urllib.parse
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


# ── datagouv post-processor ───────────────────────────────────────────────────
#
# Upstream `mcp.data.gouv.fr` returns plain human-readable text wrapped in
# `structuredContent.result`. Recipes consume typed fields (`res.datasets`,
# `res.dataservices`, `res.resources`, `res.metrics`, `res.endpoints`,
# `res.rows`, `res.columns`, `res.total`, ...). We parse the text per tool and
# replace `structuredContent` with a typed object.

_DG_NUM_RE = re.compile(r"[\d.,]+")


def _dg_to_int(s):
    if s is None:
        return None
    s = str(s).strip().replace(",", "").replace(" ", "")
    if not s:
        return None
    try:
        return int(s)
    except ValueError:
        try:
            return int(float(s))
        except ValueError:
            return None


def _dg_split_csv(s):
    if not s:
        return []
    return [t.strip() for t in s.split(",") if t.strip()]


def _dg_parse_search_datasets(text):
    """search_datasets: 'Found N dataset(s) for query: ...' + numbered entries."""
    total = None
    m = re.search(r"Found\s+([\d,]+)\s+dataset", text)
    if m:
        total = _dg_to_int(m.group(1))
    page = None
    m = re.search(r"Page\s+(\d+)\s+of\s+results", text)
    if m:
        page = int(m.group(1))

    datasets = []
    # Split into entries: lines starting with "<n>. <title>"
    # Each entry is a block until the next "<n>. " or end of text.
    entries = re.split(r"(?m)^\d+\.\s+", text)
    # entries[0] is the header before the first "1. ..."
    for blk in entries[1:]:
        lines = blk.rstrip().split("\n")
        if not lines:
            continue
        title = lines[0].strip()
        item = {"title": title}
        for raw in lines[1:]:
            line = raw.strip()
            if not line:
                continue
            if line.startswith("ID:"):
                item["id"] = line[3:].strip()
            elif line.startswith("Organization:"):
                org = line[len("Organization:"):].strip()
                item["organization"] = {"name": org}
            elif line.startswith("Tags:"):
                item["tags"] = _dg_split_csv(line[5:])
            elif line.startswith("Resources:"):
                # "Resources: 4" — bare count; or "Resources: 3 file(s)"
                rest = line[len("Resources:"):].strip()
                m2 = re.match(r"(\d+)", rest)
                if m2:
                    item["resources"] = int(m2.group(1))
            elif line.startswith("URL:"):
                item["url"] = line[4:].strip()
            elif line.startswith("Description:"):
                item["description"] = line[len("Description:"):].strip()
        datasets.append(item)

    out = {"datasets": datasets}
    if total is not None:
        out["total"] = total
    if page is not None:
        out["page"] = page
    return out


def _dg_parse_search_dataservices(text):
    total = None
    m = re.search(r"Found\s+([\d,]+)\s+dataservice", text)
    if m:
        total = _dg_to_int(m.group(1))
    page = None
    m = re.search(r"Page\s+(\d+)\s+of\s+results", text)
    if m:
        page = int(m.group(1))

    services = []
    entries = re.split(r"(?m)^\d+\.\s+", text)
    for blk in entries[1:]:
        lines = blk.rstrip().split("\n")
        if not lines:
            continue
        title = lines[0].strip()
        item = {"title": title}
        # Description can span multiple lines (until the next "   Key:" pattern).
        # Strategy: walk lines, when prefix "   <Key>: " accumulate; else append to current.
        current_key = None
        for raw in lines[1:]:
            stripped = raw.strip()
            if not stripped:
                continue
            # detect "Key: value" with known keys
            mkv = re.match(
                r"^(ID|Description|Organization|Base API URL|Tags|URL|Organization ID|OpenAPI/Swagger spec):\s*(.*)$",
                stripped,
            )
            if mkv:
                key, val = mkv.group(1), mkv.group(2)
                current_key = key
                if key == "ID":
                    item["id"] = val
                elif key == "Description":
                    item["description"] = val
                elif key == "Organization":
                    item.setdefault("organization", {})["name"] = val
                elif key == "Organization ID":
                    item.setdefault("organization", {})["id"] = val
                elif key == "Base API URL":
                    item["base_api_url"] = val
                elif key == "Tags":
                    item["tags"] = _dg_split_csv(val)
                elif key == "URL":
                    item["url"] = val
                elif key == "OpenAPI/Swagger spec":
                    item["machine_documentation_url"] = val
            else:
                # continuation of previous key (mostly description)
                if current_key == "Description" and "description" in item:
                    item["description"] += " " + stripped
        services.append(item)

    out = {"dataservices": services}
    if total is not None:
        out["total"] = total
    if page is not None:
        out["page"] = page
    return out


def _dg_parse_list_dataset_resources(text):
    out = {}
    m = re.search(r"^Resources in dataset:\s*(.+)$", text, re.M)
    if m:
        out["dataset_title"] = m.group(1).strip()
    m = re.search(r"^Dataset ID:\s*(\S+)", text, re.M)
    if m:
        out["dataset_id"] = m.group(1).strip()
    m = re.search(r"^Total resources:\s*(\d+)", text, re.M)
    if m:
        out["total"] = int(m.group(1))

    resources = []
    entries = re.split(r"(?m)^\d+\.\s+", text)
    for blk in entries[1:]:
        lines = blk.rstrip().split("\n")
        if not lines:
            continue
        title = lines[0].strip()
        item = {"title": title}
        for raw in lines[1:]:
            line = raw.strip()
            if not line:
                continue
            mkv = re.match(
                r"^(Resource ID|Format|Size|MIME type|Type|URL):\s*(.*)$", line
            )
            if not mkv:
                continue
            key, val = mkv.group(1), mkv.group(2)
            if key == "Resource ID":
                item["id"] = val
            elif key == "Format":
                item["format"] = val
            elif key == "Size":
                item["size_human"] = val
            elif key == "MIME type":
                item["mime_type"] = val
            elif key == "Type":
                item["type"] = val
            elif key == "URL":
                item["url"] = val
        resources.append(item)
    out["resources"] = resources
    return out


def _dg_parse_get_dataset_info(text):
    out = {}
    m = re.search(r"^Dataset Information:\s*(.+)$", text, re.M)
    if m:
        out["title"] = m.group(1).strip()
    # Simple "Key: value" lines (top-level, no leading spaces)
    for key, target in [
        ("ID", "id"),
        ("Slug", "slug"),
        ("URL", "url"),
        ("License", "license"),
        ("Update frequency", "frequency"),
    ]:
        m = re.search(rf"^{re.escape(key)}:\s*(.+)$", text, re.M)
        if m:
            out[target] = m.group(1).strip()
    # Description
    m = re.search(r"^Full description:\s*([\s\S]+?)(?:\n\nOrganization:|\nOrganization:)", text, re.M)
    if m:
        out["description"] = m.group(1).strip()
    # Organization
    m = re.search(r"^Organization:\s*(.+)$", text, re.M)
    if m:
        out["organization"] = {"name": m.group(1).strip()}
    m = re.search(r"^\s+Organization ID:\s*(.+)$", text, re.M)
    if m:
        out.setdefault("organization", {})["id"] = m.group(1).strip()
    # Tags
    m = re.search(r"^Tags:\s*(.+)$", text, re.M)
    if m:
        out["tags"] = _dg_split_csv(m.group(1))
    # Resources count
    m = re.search(r"^Resources:\s*(\d+)\s*file\(s\)", text, re.M)
    if m:
        out["resources_count"] = int(m.group(1))
    # Dates
    m = re.search(r"^Created:\s*(\S+)", text, re.M)
    if m:
        out["created"] = m.group(1)
    m = re.search(r"^Last updated:\s*(\S+)", text, re.M)
    if m:
        out["last_modified"] = m.group(1)
    return out


def _dg_parse_get_resource_info(text):
    out = {}
    m = re.search(r"^Resource Information:\s*(.+)$", text, re.M)
    if m:
        out["title"] = m.group(1).strip()
    for key, target in [
        ("Resource ID", "id"),
        ("Format", "format"),
        ("Size", "size_human"),
        ("MIME type", "mime_type"),
        ("Type", "type"),
        ("URL", "url"),
        ("Dataset ID", "dataset_id"),
        ("Dataset", "dataset_title"),
    ]:
        m = re.search(rf"^{re.escape(key)}:\s*(.+)$", text, re.M)
        if m:
            out[target] = m.group(1).strip()
    # Tabular API availability
    if "Tabular API availability" in text:
        # ✓ Available -> True ; ⚠️ Not available -> False
        if re.search(r"Tabular API availability:\s*\n\s*✓", text):
            out["tabular_available"] = True
        else:
            out["tabular_available"] = False
    return out


def _dg_parse_get_metrics(text):
    out = {}
    is_resource = "Resource Metrics:" in text
    is_dataset = "Dataset Metrics:" in text
    if is_dataset:
        m = re.search(r"^Dataset Metrics:\s*(.+)$", text, re.M)
        if m:
            out["dataset_title"] = m.group(1).strip()
        m = re.search(r"^Dataset ID:\s*(\S+)", text, re.M)
        if m:
            out["dataset_id"] = m.group(1).strip()
    if is_resource:
        m = re.search(r"^Resource Metrics:\s*(.+)$", text, re.M)
        if m:
            out["resource_title"] = m.group(1).strip()
        m = re.search(r"^Resource ID:\s*(\S+)", text, re.M)
        if m:
            out["resource_id"] = m.group(1).strip()

    # Lines like: "2026-04      2,088           2,665" (dataset) or "2026-04      675" (resource).
    metrics = []
    for line in text.split("\n"):
        m = re.match(r"^(\d{4}-\d{2})\s+([\d,]+)(?:\s+([\d,]+))?\s*$", line)
        if not m:
            continue
        month = m.group(1)
        a = _dg_to_int(m.group(2))
        b = _dg_to_int(m.group(3)) if m.group(3) else None
        entry = {"month": month}
        if is_resource and b is None:
            entry["monthly_download"] = a
        else:
            entry["monthly_visit"] = a
            entry["monthly_download"] = b
        metrics.append(entry)
    out["metrics"] = metrics

    # Total row: "Total        27,432          28,410" or "Total        6,157"
    m = re.search(r"^Total\s+([\d,]+)(?:\s+([\d,]+))?\s*$", text, re.M)
    if m:
        a = _dg_to_int(m.group(1))
        b = _dg_to_int(m.group(2)) if m.group(2) else None
        if is_resource and b is None:
            out["total_downloads"] = a
        else:
            out["total_visits"] = a
            out["total_downloads"] = b
    return out


def _dg_parse_get_dataservice_info(text):
    out = {}
    m = re.search(r"^Dataservice Information:\s*(.+)$", text, re.M)
    if m:
        out["title"] = m.group(1).strip()
    for key, target in [
        ("ID", "id"),
        ("URL", "url"),
        ("Base API URL", "base_api_url"),
        ("OpenAPI/Swagger spec", "machine_documentation_url"),
        ("Created", "created"),
        ("License", "license"),
    ]:
        m = re.search(rf"^{re.escape(key)}:\s*(.+)$", text, re.M)
        if m:
            out[target] = m.group(1).strip()
    # Description (multi-line)
    m = re.search(r"^Description:\s*([\s\S]+?)(?:\n\nBase API URL:|\nBase API URL:)", text, re.M)
    if m:
        out["description"] = m.group(1).strip()
    # Organization
    m = re.search(r"^Organization:\s*(.+)$", text, re.M)
    if m:
        out["organization"] = {"name": m.group(1).strip()}
    m = re.search(r"^\s+Organization ID:\s*(.+)$", text, re.M)
    if m:
        out.setdefault("organization", {})["id"] = m.group(1).strip()
    m = re.search(r"^Tags:\s*(.+)$", text, re.M)
    if m:
        out["tags"] = _dg_split_csv(m.group(1))
    m = re.search(r"^Related datasets:\s*(\d+)", text, re.M)
    if m:
        out["related_datasets"] = int(m.group(1))
    return out


def _dg_parse_openapi_spec(text):
    out = {}
    m = re.search(r"^OpenAPI spec for:\s*(.+)$", text, re.M)
    if m:
        out["title"] = m.group(1).strip()
    for key, target in [
        ("Source", "source"),
        ("Base API URL", "base_api_url"),
        ("API", "api_title"),
        ("Version", "version"),
        ("Description", "description"),
    ]:
        m = re.search(rf"^{re.escape(key)}:\s*(.+)$", text, re.M)
        if m:
            out[target] = m.group(1).strip()
    # Servers: lines "  - <url>" after "Servers:"
    servers = []
    m = re.search(r"^Servers:\s*\n((?:\s+-\s+.+\n?)+)", text, re.M)
    if m:
        for ln in m.group(1).split("\n"):
            ln = ln.strip()
            if ln.startswith("-"):
                servers.append(ln[1:].strip())
    out["servers"] = servers

    # Endpoints block
    endpoints = []
    em = re.search(r"^Endpoints[^:]*:\s*\n([\s\S]+)$", text, re.M)
    if em:
        body = em.group(1)
        # Each endpoint starts with: "  GET /path" (2 spaces indent), then optional summary line
        # (4 spaces) and parameter lines "      - name [in, type] (required)" (6 spaces).
        current = None
        for raw in body.split("\n"):
            if not raw.strip():
                continue
            mep = re.match(r"^  ([A-Z]+)\s+(\S+)\s*$", raw)
            if mep:
                if current is not None:
                    endpoints.append(current)
                current = {
                    "method": mep.group(1),
                    "path": mep.group(2),
                    "parameters": [],
                }
                continue
            mparam = re.match(r"^      -\s+(\S+)\s+\[([^,\]]+)(?:,\s*([^\]]+))?\](?:\s+\(([^)]+)\))?", raw)
            if mparam and current is not None:
                p = {"name": mparam.group(1), "in": mparam.group(2).strip()}
                if mparam.group(3):
                    p["type"] = mparam.group(3).strip()
                if mparam.group(4) and "required" in mparam.group(4).lower():
                    p["required"] = True
                current["parameters"].append(p)
                continue
            msum = re.match(r"^    (\S.*)$", raw)
            if msum and current is not None and "summary" not in current:
                current["summary"] = msum.group(1).strip()
        if current is not None:
            endpoints.append(current)
    out["endpoints"] = endpoints
    out["summary"] = endpoints  # alias
    return out


def _dg_parse_query_resource_data(text):
    out = {}
    m = re.search(r"^Querying resource:\s*(.+)$", text, re.M)
    if m:
        out["resource_title"] = m.group(1).strip()
    m = re.search(r"^Resource ID:\s*(\S+)", text, re.M)
    if m:
        out["resource_id"] = m.group(1).strip()
    m = re.search(r"^Dataset:\s*(.+?)\s*\(ID:\s*(\S+?)\)\s*$", text, re.M)
    if m:
        out["dataset_title"] = m.group(1).strip()
        out["dataset_id"] = m.group(2).strip()

    # Error / unavailable cases — leave rows empty but include error text
    if "not found in the Tabular API" in text or "Not available via Tabular API" in text:
        out["rows"] = []
        out["columns"] = []
        out["total"] = 0
        out["error"] = "tabular_unavailable"
        return out
    if "Tabular API rejected" in text or "invalid input syntax" in text:
        out["rows"] = []
        out["columns"] = []
        out["total"] = 0
        out["error"] = "tabular_rejected"
        return out

    m = re.search(r"^Total rows.*?:\s*([\d,]+)", text, re.M)
    if m:
        out["total"] = _dg_to_int(m.group(1))
    m = re.search(r"^Total pages:\s*([\d,]+)\s*\(page size:\s*(\d+)\)", text, re.M)
    if m:
        out["total_pages"] = _dg_to_int(m.group(1))
        out["page_size"] = int(m.group(2))
    m = re.search(r"^Retrieved:\s*([\d,]+)\s+row\(s\)\s+from\s+page\s+(\d+)", text, re.M)
    if m:
        out["page"] = int(m.group(2))
    m = re.search(r"^Columns:\s*(.+)$", text, re.M)
    if m:
        out["columns"] = _dg_split_csv(m.group(1))

    # Rows: blocks starting with "  Row N:" then "    key: value" lines.
    rows = []
    # Locate "Data (...)" block tail.
    data_idx = text.find("Data (")
    if data_idx >= 0:
        body = text[data_idx:]
        current = None
        for raw in body.split("\n"):
            if re.match(r"^\s*Row\s+\d+:\s*$", raw):
                if current is not None:
                    rows.append(current)
                current = {}
                continue
            mkv = re.match(r"^    (\S[^:]*?):\s*(.*)$", raw)
            if mkv and current is not None:
                key = mkv.group(1).strip()
                val = mkv.group(2).strip()
                current[key] = val
                continue
            # Truncate at trailing notes
            if raw.strip().startswith("⚠️") or raw.strip().startswith("📄"):
                break
        if current is not None:
            rows.append(current)
    out["rows"] = rows
    return out


_DG_PARSERS = {
    "search_datasets": _dg_parse_search_datasets,
    "search_dataservices": _dg_parse_search_dataservices,
    "list_dataset_resources": _dg_parse_list_dataset_resources,
    "get_dataset_info": _dg_parse_get_dataset_info,
    "get_resource_info": _dg_parse_get_resource_info,
    "get_metrics": _dg_parse_get_metrics,
    "get_dataservice_info": _dg_parse_get_dataservice_info,
    "get_dataservice_openapi_spec": _dg_parse_openapi_spec,
    "query_resource_data": _dg_parse_query_resource_data,
}


def parse_datagouv_response(tool_name, text):
    """Parse the human-readable text returned by mcp.data.gouv.fr into a typed dict.

    Returns None if tool is unknown or text cannot be parsed (caller keeps the
    original passthrough behaviour).
    """
    fn = _DG_PARSERS.get(tool_name)
    if fn is None:
        return None
    if not isinstance(text, str) or not text.strip():
        return None
    # Don't try to parse error messages from the upstream — pass through.
    if text.startswith("Error executing tool"):
        return None
    try:
        return fn(text)
    except Exception as e:
        sys.stderr.write("[passthrough] datagouv parse error for %s: %s\n" % (tool_name, e))
        return None


def _first_text(content):
    """Extract the first text from MCP tool result content array."""
    if not isinstance(content, list):
        return None
    for c in content:
        if isinstance(c, dict) and c.get("type") == "text" and isinstance(c.get("text"), str):
            return c["text"]
    return None


# ── OAuth / TokenManager ──────────────────────────────────────────────────────

class TokenManager:
    """Gère l'obtention et le rafraîchissement d'un token Bearer Keycloak.

    Charge les tokens depuis tokens_file, rafraîchit automatiquement quand
    l'access token expire dans moins de 60 secondes, et persiste le nouveau
    token de manière atomique.
    """

    def __init__(self, tokens_file, token_endpoint, client_id):
        self.tokens_file = tokens_file
        self.token_endpoint = token_endpoint
        self.client_id = client_id
        self.lock = threading.Lock()
        self.cache = None  # dict: access_token, refresh_token, expires_at, scope, obtained_at

    # ── Lecture / écriture fichier ─────────────────────────────────────────

    def _load_file(self):
        """Charge tokens.json depuis le disque. Retourne None si absent/invalide."""
        try:
            with open(self.tokens_file) as fh:
                return json.load(fh)
        except (OSError, json.JSONDecodeError) as e:
            print("[token_manager] impossible de charger %s: %s" % (self.tokens_file, e), file=sys.stderr)
            return None

    def _write_file(self, data):
        """Écriture atomique : NamedTemporaryFile dans le même répertoire + os.replace."""
        dirpath = os.path.dirname(os.path.abspath(self.tokens_file))
        fd, tmp_path = tempfile.mkstemp(dir=dirpath, suffix=".tmp")
        try:
            with os.fdopen(fd, 'w') as fh:
                json.dump(data, fh, indent=2)
            os.chmod(tmp_path, 0o600)
            os.replace(tmp_path, self.tokens_file)
        except Exception:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
            raise

    # ── Rafraîchissement Keycloak ──────────────────────────────────────────

    def _do_refresh(self, refresh_token):
        """Effectue un POST grant_type=refresh_token. Retourne le dict Keycloak."""
        body = urllib.parse.urlencode({
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": self.client_id,
        }).encode()
        req = urllib.request.Request(
            self.token_endpoint,
            data=body,
            method='POST',
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())

    def _apply_token_response(self, payload, old_refresh_token=None):
        """Construit le dict cache à partir de la réponse Keycloak et le persiste."""
        now = int(time.time())
        expires_in = int(payload.get("expires_in", 300))
        new_refresh = payload.get("refresh_token") or old_refresh_token
        entry = {
            "access_token": payload["access_token"],
            "refresh_token": new_refresh,
            "expires_at": now + expires_in,
            "scope": payload.get("scope", ""),
            "obtained_at": now,
        }
        self._write_file(entry)
        self.cache = entry
        return entry

    # ── API publique ───────────────────────────────────────────────────────

    def get_bearer(self):
        """Retourne l'access_token courant, rafraîchi si nécessaire.

        Lève une exception si le rafraîchissement échoue (le caller fera 503).
        """
        with self.lock:
            if self.cache is None:
                self.cache = self._load_file()
                if self.cache is None:
                    raise RuntimeError("tokens.json absent ou invalide — appeler /admin/save-tokens d'abord")

            # Rafraîchir si expire dans moins de 60 secondes
            if self.cache.get("expires_at", 0) < int(time.time()) + 60:
                print("[token_manager] access token expiré, rafraîchissement…", file=sys.stderr)
                payload = self._do_refresh(self.cache["refresh_token"])
                self._apply_token_response(payload, old_refresh_token=self.cache["refresh_token"])

            return self.cache["access_token"]

    def invalidate_access(self):
        """Force un rafraîchissement au prochain get_bearer (utilisé après 401 upstream)."""
        with self.lock:
            if self.cache is not None:
                # Mettre expires_at dans le passé
                self.cache["expires_at"] = 0

    def save_initial(self, refresh_token):
        """Initialise les tokens à partir d'un refresh_token externe (endpoint /admin/save-tokens).

        Effectue un échange Keycloak, persiste tokens.json et retourne le payload
        pour confirmation. Lève une exception si Keycloak refuse.
        """
        with self.lock:
            try:
                payload = self._do_refresh(refresh_token)
            except urllib.error.HTTPError as e:
                detail = e.read().decode(errors='replace')
                raise RuntimeError("Keycloak %d: %s" % (e.code, detail))
            entry = self._apply_token_response(payload, old_refresh_token=refresh_token)
            print("[token_manager] tokens initiaux sauvegardés dans %s" % self.tokens_file, file=sys.stderr)
            return {
                "ok": True,
                "scope": entry["scope"],
                "expires_in": payload.get("expires_in"),
                "expires_at": entry["expires_at"],
            }


# ── Upstream forwarding ───────────────────────────────────────────────────────

def forward_to_upstream(upstream_url, request_body, accept_header, bearer_token=None):
    """POST the JSON-RPC request to the upstream MCP server, return parsed response.

    Handles both `application/json` and `text/event-stream` (SSE) responses by
    extracting the first JSON object found in the body.

    Si bearer_token est fourni, ajoute un header Authorization: Bearer <token>.
    """
    headers = {
        'Content-Type': 'application/json',
        'Accept': accept_header or 'application/json, text/event-stream',
    }
    if bearer_token:
        headers['Authorization'] = 'Bearer ' + bearer_token
    req = urllib.request.Request(
        upstream_url,
        data=request_body,
        method='POST',
        headers=headers,
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
    token_manager = None  # TokenManager instance si --auth-* activé, sinon None

    def do_POST(self):
        # ── Endpoint admin : sauvegarde du refresh_token initial ─────────
        if self.path == "/admin/save-tokens":
            if self.token_manager is None:
                self.send_error(404, "OAuth not configured")
                return
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
            except json.JSONDecodeError:
                self.send_error(400, "Invalid JSON")
                return
            rt = data.get("refresh_token", "").strip()
            if not rt:
                payload = json.dumps({"error": "missing_field", "detail": "refresh_token requis et non vide"}).encode()
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            try:
                result = self.token_manager.save_initial(rt)
                payload = json.dumps(result).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
            except Exception as e:
                payload = json.dumps({"error": "token_exchange_failed", "detail": str(e)}).encode()
                self.send_response(503)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
            return

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

        # Obtenir le bearer courant si OAuth activé (une seule fois avant le try).
        tm = self.token_manager
        accept_hdr = self.headers.get('Accept', '')

        try:
            # Notifications: forward fire-and-forget, return 202.
            if is_notification:
                try:
                    bearer = tm.get_bearer() if tm else None
                    forward_to_upstream(self.upstream, body, accept_hdr, bearer_token=bearer)
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

            # ── Forward to upstream MCP server (avec retry 401 si OAuth) ─
            def _forward():
                bearer = tm.get_bearer() if tm else None
                return forward_to_upstream(self.upstream, body, accept_hdr, bearer_token=bearer)

            try:
                response = _forward()
            except urllib.error.HTTPError as e:
                if e.code == 401 and tm is not None:
                    # Token peut-être révoqué côté upstream — invalider et réessayer une fois.
                    print("[passthrough] 401 upstream, rafraîchissement forcé…", file=sys.stderr)
                    tm.invalidate_access()
                    try:
                        response = _forward()
                    except urllib.error.HTTPError as e2:
                        raise e2  # Propagé vers le handler extérieur
                else:
                    raise

            # ── Inject recipe tools into tools/list response ─────────────
            if recipes_data and method == "tools/list":
                result = response.get("result", {})
                tools = result.get("tools", [])
                tools.extend(RECIPE_TOOLS)
                result["tools"] = tools
                response["result"] = result

            # ── Post-process datagouv text -> typed structuredContent ────
            if method == "tools/call":
                tool_name = params.get("name", "")
                result = response.get("result") or {}
                if isinstance(result, dict):
                    sc = result.get("structuredContent") or {}
                    text = sc.get("result") if isinstance(sc, dict) else None
                    if not isinstance(text, str):
                        text = _first_text(result.get("content"))
                    if isinstance(text, str):
                        parsed = parse_datagouv_response(tool_name, text)
                        if parsed is not None:
                            result["structuredContent"] = parsed
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
    # ── OAuth / Token manager ──────────────────────────────────────────────────
    parser.add_argument("--auth-tokens-file", default=None, metavar="PATH",
                        help="Chemin vers tokens.json (lu/écrit par le bridge)")
    parser.add_argument("--auth-token-endpoint", default=None, metavar="URL",
                        help="URL Keycloak /protocol/openid-connect/token")
    parser.add_argument("--auth-client-id", default=None, metavar="ID",
                        help="client_id OIDC public (sans secret)")
    args = parser.parse_args()

    # Validation : les 3 flags OAuth doivent être fournis ensemble ou pas du tout.
    auth_flags = [args.auth_tokens_file, args.auth_token_endpoint, args.auth_client_id]
    if any(auth_flags) and not all(auth_flags):
        parser.error("--auth-tokens-file, --auth-token-endpoint et --auth-client-id doivent être fournis ensemble")

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

    # Wiring OAuth : instancier TokenManager si les 3 flags sont présents.
    if all(auth_flags):
        PassthroughHandler.token_manager = TokenManager(
            args.auth_tokens_file, args.auth_token_endpoint, args.auth_client_id
        )
        print("[passthrough] OAuth activé — tokens: %s, endpoint: %s, client_id: %s" % (
            args.auth_tokens_file, args.auth_token_endpoint, args.auth_client_id,
        ), file=sys.stderr)
    else:
        PassthroughHandler.token_manager = None

    PassthroughHandler.upstream = args.upstream
    server = HTTPServer((args.host, args.port), PassthroughHandler)
    print("Passthrough: %s -> http://%s:%d/mcp" % (args.upstream, args.host, args.port), file=sys.stderr)
    server.serve_forever()


if __name__ == "__main__":
    main()
