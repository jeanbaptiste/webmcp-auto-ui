#!/usr/bin/env python3
"""
iNaturalist MCP server — 16 tools, stdlib only

Returns upstream iNat API responses with shape preserved (passthrough).
Recipes rely on the canonical iNat shape: `results[].taxon.id`,
`results[].taxon.preferred_common_name`, `results[].geojson.coordinates`,
`results[].photos[].url`, `total_results`, etc.

Uses API v1 because v2 requires sparse `fields=` selectors that strip the
nested structures recipes expect. Earlier versions of this bridge flattened
the response to a custom simplified shape — that broke 39/67 recipes
(`taxon: "string"`, `photo: "string"`, no `photos[]`, no `geojson`).
Bridge fix 2026-04-30: stop flattening, return upstream JSON unchanged.

API: https://api.inaturalist.org/v1
"""
import json
import sys
import urllib.request
import urllib.parse

BASE = "https://api.inaturalist.org/v1"
HEADERS = {"Accept": "application/json", "User-Agent": "inaturalist-mcp/1.1"}


def api_get(path, params):
    clean = {k: v for k, v in (params or {}).items() if v is not None}
    url = BASE + path + ("?" + urllib.parse.urlencode(clean) if clean else "")
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


# ── Common observation filter params ──────────────────────────────────────────
OBS_PROPS = {
    "taxon_name":    {"type": "string",  "description": "Scientific or common name"},
    "taxon_id":      {"type": "integer", "description": "iNaturalist taxon ID"},
    "place_id":      {"type": "integer", "description": "iNaturalist place ID"},
    "lat":           {"type": "number",  "description": "Latitude"},
    "lng":           {"type": "number",  "description": "Longitude"},
    "radius":        {"type": "number",  "description": "Radius in km"},
    "quality_grade": {"type": "string",  "enum": ["research", "needs_id", "casual"]},
    "d1":            {"type": "string",  "description": "Start date YYYY-MM-DD"},
    "d2":            {"type": "string",  "description": "End date YYYY-MM-DD"},
    "per_page":      {"type": "integer", "description": "Results per page (max 200)", "default": 10},
}

TOOLS = [
    # ── Observations ────────────────────────────────────────────────────────
    {
        "name": "search_observations",
        "description": "Search wildlife observations. Filter by taxon, place, date range, quality grade, or geographic coordinates. Returns canonical iNaturalist shape: `results[].taxon`, `results[].geojson.coordinates`, `results[].photos[].url`, `results[].user`, `results[].species_guess`, `total_results`.",
        "inputSchema": {"type": "object", "properties": OBS_PROPS},
    },
    {
        "name": "species_counts",
        "description": "Top species observed in an area/taxon ranked by observation count. Returns `results[].count` and `results[].taxon` (full taxon object with `id`, `name`, `preferred_common_name`, `rank`, `iconic_taxon_name`, `default_photo`).",
        "inputSchema": {"type": "object", "properties": {**OBS_PROPS, "include_ancestors": {"type": "boolean"}}},
    },
    {
        "name": "observations_histogram",
        "description": "Time-series histogram of observation counts. Returns `results.<interval>` map of `YYYY-MM-DD: count`. Useful for phenology and seasonal patterns.",
        "inputSchema": {"type": "object", "properties": {**OBS_PROPS,
            "date_field": {"type": "string", "enum": ["observed_on", "created_at"], "default": "observed_on"},
            "interval":   {"type": "string", "enum": ["year", "month", "week", "day", "hour"], "default": "month"},
        }},
    },
    {
        "name": "observers_leaderboard",
        "description": "Top observers ranked by observation/species count. Returns `results[].user` (with `login`, `name`, `icon`), `results[].observation_count`, `results[].species_count`.",
        "inputSchema": {"type": "object", "properties": {**OBS_PROPS,
            "order_by": {"type": "string", "enum": ["observation_count", "species_count"], "default": "observation_count"},
        }},
    },
    # ── Taxa ────────────────────────────────────────────────────────────────
    {
        "name": "search_taxa",
        "description": "Search species and taxa by name. Returns `results[]` with the full taxon object: `id`, `name`, `preferred_common_name`, `rank`, `observations_count`, `iconic_taxon_name`, `default_photo`, `conservation_status`.",
        "inputSchema": {"type": "object", "required": ["q"], "properties": {
            "q":        {"type": "string",  "description": "Search query (scientific or common name)"},
            "rank":     {"type": "string",  "description": "Taxonomic rank",
                         "enum": ["species", "genus", "family", "order", "class", "phylum", "kingdom"]},
            "per_page": {"type": "integer", "default": 10},
            "locale":   {"type": "string",  "description": "Language for common names (e.g. fr, en, es)"},
        }},
    },
    {
        "name": "get_taxon",
        "description": "Get detailed info about a taxon by its iNaturalist ID. Returns the full taxon record: `id`, `name`, `preferred_common_name`, `rank`, `observations_count`, `iconic_taxon_name`, `conservation_status`, `ancestry`, `ancestors`, `wikipedia_summary`, `default_photo` (with `medium_url`, `square_url`).",
        "inputSchema": {"type": "object", "required": ["id"], "properties": {
            "id":     {"type": "integer", "description": "iNaturalist taxon ID"},
            "locale": {"type": "string",  "description": "Language for common names"},
        }},
    },
    {
        "name": "similar_species",
        "description": "Species frequently confused with a given taxon. Returns `results[].count` and `results[].taxon` (full taxon object). Useful for distinguishing look-alikes.",
        "inputSchema": {"type": "object", "required": ["taxon_id"], "properties": {
            "taxon_id":      {"type": "integer"},
            "quality_grade": {"type": "string", "enum": ["research", "needs_id", "casual"]},
            "place_id":      {"type": "integer"},
            "per_page":      {"type": "integer", "default": 10},
        }},
    },
    {
        "name": "taxon_suggestions",
        "description": "AI-assisted taxon ID suggestions for a location/date. Returns `results[].score` and `results[].taxon` (full taxon object).",
        "inputSchema": {"type": "object", "properties": {
            "lat":         {"type": "number"},
            "lng":         {"type": "number"},
            "observed_on": {"type": "string", "description": "Date YYYY-MM-DD"},
            "taxon_id":    {"type": "integer", "description": "Constrain to a clade"},
            "place_id":    {"type": "integer"},
            "source":      {"type": "string", "enum": ["checklist", "observations", "*observations"],
                            "default": "*observations"},
            "limit":       {"type": "integer", "default": 10},
        }},
    },
    # ── Places ──────────────────────────────────────────────────────────────
    {
        "name": "search_places",
        "description": "Search iNaturalist places by name (countries, regions, parks, etc.). Returns `results[]` with `id`, `display_name`, `name`, `place_type`, `bbox_area`, `geometry_geojson`.",
        "inputSchema": {"type": "object", "required": ["q"], "properties": {
            "q":        {"type": "string"},
            "per_page": {"type": "integer", "default": 10},
        }},
    },
    {
        "name": "nearby_places",
        "description": "Find iNaturalist places overlapping or near a bounding box. Returns `results.standard[]` and `results.community[]`.",
        "inputSchema": {"type": "object", "required": ["nelat", "nelng", "swlat", "swlng"], "properties": {
            "nelat":    {"type": "number", "description": "NE latitude"},
            "nelng":    {"type": "number", "description": "NE longitude"},
            "swlat":    {"type": "number", "description": "SW latitude"},
            "swlng":    {"type": "number", "description": "SW longitude"},
            "per_page": {"type": "integer", "default": 5},
        }},
    },
    # ── Identifications & Projects ───────────────────────────────────────────
    {
        "name": "top_identifiers",
        "description": "Top identifier leaderboard for a taxon. Returns `results[].user` and `results[].count`.",
        "inputSchema": {"type": "object", "required": ["taxon_id"], "properties": {
            "taxon_id":      {"type": "integer"},
            "quality_grade": {"type": "string", "enum": ["research", "needs_id", "casual"]},
            "per_page":      {"type": "integer", "default": 10},
        }},
    },
    {
        "name": "recent_taxa",
        "description": "Recently identified taxa — a live feed of what naturalists are currently identifying. Returns `results[].taxon` (full taxon with `default_photo`) and `results[].observation` (the underlying observation).",
        "inputSchema": {"type": "object", "properties": {
            "taxon_id":      {"type": "integer"},
            "quality_grade": {"type": "string", "enum": ["research", "needs_id", "casual"]},
            "rank":          {"type": "string", "enum": ["species", "genus", "family"]},
            "per_page":      {"type": "integer", "default": 10},
        }},
    },
    {
        "name": "search_projects",
        "description": "Search iNaturalist projects (bioblitzes, citizen science campaigns). Returns `results[]` with `id`, `title`, `description`, `place_id`, `project_type`, `observations_count`, `species_count`.",
        "inputSchema": {"type": "object", "properties": {
            "q":        {"type": "string"},
            "place_id": {"type": "integer"},
            "type":     {"type": "string", "enum": ["collection", "umbrella"]},
            "per_page": {"type": "integer", "default": 10},
        }},
    },
    # ── Cross-entity search ──────────────────────────────────────────────────
    {
        "name": "search",
        "description": "Cross-entity search across taxa, places, projects, and users simultaneously. Returns `results[]` with `type`, `score`, `record` (the entity object).",
        "inputSchema": {"type": "object", "required": ["q"], "properties": {
            "q":        {"type": "string"},
            "sources":  {"type": "string",
                         "description": "Comma-separated: taxa,places,projects,users",
                         "default": "taxa,places,projects"},
            "place_id": {"type": "integer"},
            "per_page": {"type": "integer", "default": 10},
        }},
    },
    # ── Bonus ────────────────────────────────────────────────────────────────
    {
        "name": "iconic_taxa_counts",
        "description": "Species counts broken down by iconic taxon group (Animalia, Plantae, Fungi, Aves, Reptilia, etc.). Returns `results[].taxon`, `results[].count`, `results[].taxon_id`. Great for biodiversity pie charts.",
        "inputSchema": {"type": "object", "properties": {
            "place_id":      {"type": "integer"},
            "taxon_id":      {"type": "integer"},
            "quality_grade": {"type": "string", "enum": ["research", "needs_id", "casual"]},
            "d1":            {"type": "string"},
            "d2":            {"type": "string"},
        }},
    },
    {
        "name": "unobserved_taxa",
        "description": "Species within a clade that are on the checklist for a place but NOT yet observed there. Returns `results[]` (full taxon objects with `default_photo`). Reveals biodiversity gaps.",
        "inputSchema": {"type": "object", "required": ["taxon_id", "place_id"], "properties": {
            "taxon_id": {"type": "integer", "description": "Root clade (e.g. 3=birds, 47126=plants, 1=all)"},
            "place_id": {"type": "integer"},
            "per_page": {"type": "integer", "default": 10},
        }},
    },
]


# ── Tool handlers ──────────────────────────────────────────────────────────────
#
# All handlers return the upstream iNat v1 JSON response unchanged
# (passthrough). Recipes consume the canonical shape; flattening it broke
# 39/67 recipes in the audit (2026-04-30).


def _obs_params(a, extra=None):
    p = {k: a.get(k) for k in OBS_PROPS}
    if extra:
        p.update({k: a.get(k) for k in extra})
    return p


def _cap_per_page(p, default=10, max_=200):
    if p.get("per_page") is None:
        p["per_page"] = default
    else:
        try:
            p["per_page"] = min(int(p["per_page"]), max_)
        except (TypeError, ValueError):
            p["per_page"] = default
    return p


def handle(name, a):
    a = a or {}

    if name == "search_observations":
        return api_get("/observations", _cap_per_page(_obs_params(a)))

    if name == "species_counts":
        return api_get("/observations/species_counts",
                       _cap_per_page(_obs_params(a, ["include_ancestors"])))

    if name == "observations_histogram":
        return api_get("/observations/histogram",
                       _obs_params(a, ["date_field", "interval"]))

    if name == "observers_leaderboard":
        return api_get("/observations/observers",
                       _cap_per_page(_obs_params(a, ["order_by"])))

    if name == "search_taxa":
        p = {"q": a.get("q"), "rank": a.get("rank"), "locale": a.get("locale"),
             "per_page": a.get("per_page", 10)}
        return api_get("/taxa", _cap_per_page(p))

    if name == "get_taxon":
        # /taxa/{id} returns {results: [taxon]}; surface the taxon directly
        # so recipes can do `detail.preferred_common_name` without unwrap.
        # (Recipes consistently treat this tool as returning the taxon
        # itself — see inat-species-profile.md, inat-similar-species.md.)
        d = api_get(f"/taxa/{a['id']}", {"locale": a.get("locale")})
        results = d.get("results", []) if isinstance(d, dict) else []
        if not results:
            return {"error": "taxon not found"}
        return results[0]

    if name == "similar_species":
        p = {"taxon_id": a.get("taxon_id"),
             "quality_grade": a.get("quality_grade"),
             "place_id": a.get("place_id"),
             "per_page": a.get("per_page", 10)}
        return api_get("/identifications/similar_species", _cap_per_page(p))

    if name == "taxon_suggestions":
        p = {k: a.get(k) for k in
             ["lat", "lng", "observed_on", "taxon_id", "place_id", "source", "limit"]}
        return api_get("/taxa/suggest", p)

    if name == "search_places":
        # /v1/places does not exist; use /places/autocomplete which returns
        # the same canonical place shape (id, display_name, place_type, …).
        p = {"q": a.get("q"), "per_page": a.get("per_page", 10)}
        return api_get("/places/autocomplete", _cap_per_page(p))

    if name == "nearby_places":
        p = {k: a.get(k) for k in ["nelat", "nelng", "swlat", "swlng"]}
        p["per_page"] = a.get("per_page", 5)
        d = api_get("/places/nearby", _cap_per_page(p, default=5))
        # Upstream returns `results: {standard: [...], community: [...]}`.
        # Flatten to `results: [...]` so recipes can `.map()` directly.
        # Each place keeps its full upstream shape (id, display_name,
        # place_type, geometry_geojson, …). Recipes do not branch on
        # standard/community.
        results = d.get("results", []) if isinstance(d, dict) else []
        if isinstance(results, dict):
            flat = list(results.get("standard") or []) + list(results.get("community") or [])
            d = dict(d)
            d["results"] = flat
        return d

    if name == "top_identifiers":
        p = {"taxon_id": a.get("taxon_id"),
             "quality_grade": a.get("quality_grade"),
             "per_page": a.get("per_page", 10)}
        return api_get("/identifications/identifiers", _cap_per_page(p))

    if name == "recent_taxa":
        p = {k: a.get(k) for k in ["taxon_id", "quality_grade", "rank"]}
        p["per_page"] = a.get("per_page", 10)
        return api_get("/identifications/recent_taxa", _cap_per_page(p))

    if name == "search_projects":
        p = {k: a.get(k) for k in ["q", "place_id", "type"]}
        p["per_page"] = a.get("per_page", 10)
        return api_get("/projects", _cap_per_page(p))

    if name == "search":
        p = {"q": a.get("q"),
             "sources": a.get("sources", "taxa,places,projects"),
             "place_id": a.get("place_id"),
             "per_page": a.get("per_page", 10)}
        return api_get("/search", _cap_per_page(p))

    if name == "iconic_taxa_counts":
        p = {k: a.get(k) for k in ["place_id", "taxon_id", "quality_grade", "d1", "d2"]}
        return api_get("/observations/iconic_taxa_species_counts", p)

    if name == "unobserved_taxa":
        p = {"place_id": a.get("place_id"),
             "per_page": a.get("per_page", 10)}
        return api_get(f"/taxa/{a['taxon_id']}/wanted", _cap_per_page(p))

    return {"error": f"Unknown tool: {name}"}


# ── Main loop ──────────────────────────────────────────────────────────────────

def respond(obj):
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def main():
    for raw in sys.stdin:
        raw = raw.strip()
        if not raw:
            continue
        try:
            req = json.loads(raw)
        except json.JSONDecodeError:
            continue

        method = req.get("method", "")
        rid = req.get("id")

        if method == "initialize":
            respond({"jsonrpc": "2.0", "id": rid, "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "inaturalist-mcp", "version": "1.1.0"},
            }})
        elif method == "notifications/initialized":
            pass
        elif method == "tools/list":
            respond({"jsonrpc": "2.0", "id": rid, "result": {"tools": TOOLS}})
        elif method == "tools/call":
            params = req.get("params", {})
            tool_name = params.get("name", "")
            args = params.get("arguments", {})
            try:
                result = handle(tool_name, args)
                respond({"jsonrpc": "2.0", "id": rid, "result": {
                    "content": [{"type": "text", "text": json.dumps(result, ensure_ascii=False, indent=2)}],
                }})
            except Exception as e:
                respond({"jsonrpc": "2.0", "id": rid, "result": {
                    "content": [{"type": "text", "text": f"Error: {e}"}],
                    "isError": True,
                }})
        else:
            if rid is not None:
                respond({"jsonrpc": "2.0", "id": rid,
                         "error": {"code": -32601, "message": f"Method not found: {method}"}})


if __name__ == "__main__":
    main()
