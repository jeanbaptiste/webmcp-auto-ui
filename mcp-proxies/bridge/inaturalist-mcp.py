#!/usr/bin/env python3
"""
iNaturalist MCP server — 16 tools, stdlib only
API: https://api.inaturalist.org/v2
"""
import json
import sys
import urllib.request
import urllib.parse

BASE = "https://api.inaturalist.org/v2"
HEADERS = {"Accept": "application/json", "User-Agent": "inaturalist-mcp/1.0"}


def api_get(path, params):
    clean = {k: v for k, v in params.items() if v is not None}
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
        "description": "Search wildlife observations. Filter by taxon, place, date range, quality grade, or geographic coordinates.",
        "inputSchema": {"type": "object", "properties": OBS_PROPS},
    },
    {
        "name": "species_counts",
        "description": "Get top species observed in an area/taxon, ranked by observation count. Great for biodiversity summaries.",
        "inputSchema": {"type": "object", "properties": {**OBS_PROPS, "include_ancestors": {"type": "boolean"}}},
    },
    {
        "name": "observations_histogram",
        "description": "Time-series histogram of observation counts. Useful for phenology and seasonal patterns.",
        "inputSchema": {"type": "object", "properties": {**OBS_PROPS,
            "date_field": {"type": "string", "enum": ["observed_on", "created_at"], "default": "observed_on"},
            "interval":   {"type": "string", "enum": ["year", "month", "week", "day", "hour"], "default": "month"},
        }},
    },
    {
        "name": "observers_leaderboard",
        "description": "Top observers ranked by observation count for a taxon/place.",
        "inputSchema": {"type": "object", "properties": {**OBS_PROPS,
            "order_by": {"type": "string", "enum": ["observation_count", "species_count"], "default": "observation_count"},
        }},
    },
    # ── Taxa ────────────────────────────────────────────────────────────────
    {
        "name": "search_taxa",
        "description": "Search species and taxa by name. Returns scientific name, common name, rank, observation count, conservation status.",
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
        "description": "Get detailed info about a taxon by its iNaturalist ID: name, common name, rank, conservation status, ancestry, Wikipedia summary.",
        "inputSchema": {"type": "object", "required": ["id"], "properties": {
            "id":     {"type": "integer", "description": "iNaturalist taxon ID"},
            "locale": {"type": "string",  "description": "Language for common names"},
        }},
    },
    {
        "name": "similar_species",
        "description": "Species frequently confused with a given taxon — same identifications. Useful for distinguishing look-alikes.",
        "inputSchema": {"type": "object", "required": ["taxon_id"], "properties": {
            "taxon_id":      {"type": "integer"},
            "quality_grade": {"type": "string", "enum": ["research", "needs_id", "casual"]},
            "place_id":      {"type": "integer"},
            "per_page":      {"type": "integer", "default": 10},
        }},
    },
    {
        "name": "taxon_suggestions",
        "description": "AI-assisted taxon ID suggestions for a location/date — powers the iNaturalist identification feature.",
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
        "description": "Search iNaturalist places by name (countries, regions, parks, etc.).",
        "inputSchema": {"type": "object", "required": ["q"], "properties": {
            "q":        {"type": "string"},
            "per_page": {"type": "integer", "default": 10},
        }},
    },
    {
        "name": "nearby_places",
        "description": "Find iNaturalist places overlapping or near a bounding box.",
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
        "description": "Top identifier leaderboard for a taxon — who identifies this species most.",
        "inputSchema": {"type": "object", "required": ["taxon_id"], "properties": {
            "taxon_id":      {"type": "integer"},
            "quality_grade": {"type": "string", "enum": ["research", "needs_id", "casual"]},
            "per_page":      {"type": "integer", "default": 10},
        }},
    },
    {
        "name": "recent_taxa",
        "description": "Recently identified taxa — a live feed of what naturalists are currently identifying.",
        "inputSchema": {"type": "object", "properties": {
            "taxon_id":      {"type": "integer"},
            "quality_grade": {"type": "string", "enum": ["research", "needs_id", "casual"]},
            "rank":          {"type": "string", "enum": ["species", "genus", "family"]},
            "per_page":      {"type": "integer", "default": 10},
        }},
    },
    {
        "name": "search_projects",
        "description": "Search iNaturalist projects (bioblitzes, citizen science campaigns, etc.).",
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
        "description": "Cross-entity search across taxa, places, projects, and users simultaneously.",
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
        "description": "Species counts broken down by iconic taxon group (Animalia, Plantae, Fungi, Aves, Reptilia, etc.). Great for biodiversity pie charts.",
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
        "description": "Species within a clade that are on the checklist for a place but NOT yet observed there. Reveals biodiversity gaps.",
        "inputSchema": {"type": "object", "required": ["taxon_id", "place_id"], "properties": {
            "taxon_id": {"type": "integer", "description": "Root clade (e.g. 3=birds, 47126=plants, 1=all)"},
            "place_id": {"type": "integer"},
            "per_page": {"type": "integer", "default": 10},
        }},
    },
]


# ── Tool handlers ──────────────────────────────────────────────────────────────

def _obs_params(a, extra=None):
    p = {k: a.get(k) for k in OBS_PROPS}
    if extra:
        p.update({k: a.get(k) for k in extra})
    return p


def handle(name, a):
    if name == "search_observations":
        p = {**_obs_params(a),
             "fields": "taxon.name,taxon.preferred_common_name,taxon.rank,observed_on,place_guess,quality_grade,uri,photos.url"}
        d = api_get("/observations", p)
        return {"total": d.get("total_results"), "results": [
            {"id": o.get("uuid"),
             "taxon": (o.get("taxon") or {}).get("name"),
             "common": (o.get("taxon") or {}).get("preferred_common_name"),
             "rank": (o.get("taxon") or {}).get("rank"),
             "observed_on": o.get("observed_on"),
             "place": o.get("place_guess"),
             "quality_grade": o.get("quality_grade"),
             "url": o.get("uri"),
             "photo": ((o.get("photos") or [{}])[0]).get("url")}
            for o in d.get("results", [])
        ]}

    if name == "species_counts":
        p = {**_obs_params(a, ["include_ancestors"]),
             "fields": "taxon.name,taxon.preferred_common_name,taxon.rank,taxon.iconic_taxon_name"}
        d = api_get("/observations/species_counts", p)
        return {"total": d.get("total_results"), "results": [
            {"count": r.get("count"),
             "taxon_id": (r.get("taxon") or {}).get("id"),
             "name": (r.get("taxon") or {}).get("name"),
             "common": (r.get("taxon") or {}).get("preferred_common_name"),
             "rank": (r.get("taxon") or {}).get("rank"),
             "iconic": (r.get("taxon") or {}).get("iconic_taxon_name")}
            for r in d.get("results", [])
        ]}

    if name == "observations_histogram":
        p = _obs_params(a, ["date_field", "interval"])
        d = api_get("/observations/histogram", p)
        return d.get("results", {})

    if name == "observers_leaderboard":
        p = {**_obs_params(a, ["order_by"]),
             "fields": "user.login,user.name,user.observations_count"}
        d = api_get("/observations/observers", p)
        return {"total": d.get("total_results"), "results": [
            {"rank": i + 1,
             "login": (r.get("user") or {}).get("login"),
             "name": (r.get("user") or {}).get("name"),
             "observation_count": r.get("observation_count"),
             "species_count": r.get("species_count")}
            for i, r in enumerate(d.get("results", []))
        ]}

    if name == "search_taxa":
        p = {"q": a.get("q"), "rank": a.get("rank"),
             "per_page": min(a.get("per_page", 10), 200),
             "locale": a.get("locale"),
             "fields": "name,preferred_common_name,rank,observations_count,iconic_taxon_name,conservation_status"}
        d = api_get("/taxa", p)
        return {"total": d.get("total_results"), "results": [
            {"id": t.get("id"),
             "name": t.get("name"),
             "common": t.get("preferred_common_name"),
             "rank": t.get("rank"),
             "observations_count": t.get("observations_count"),
             "iconic": t.get("iconic_taxon_name"),
             "conservation": (t.get("conservation_status") or {}).get("status")}
            for t in d.get("results", [])
        ]}

    if name == "get_taxon":
        d = api_get(f"/taxa/{a['id']}", {
            "locale": a.get("locale"),
            "fields": "name,preferred_common_name,rank,observations_count,iconic_taxon_name,"
                      "conservation_status,ancestry,wikipedia_summary,default_photo",
        })
        results = d.get("results", [])
        if not results:
            return {"error": "taxon not found"}
        t = results[0]
        return {
            "id": t.get("id"),
            "name": t.get("name"),
            "common": t.get("preferred_common_name"),
            "rank": t.get("rank"),
            "observations_count": t.get("observations_count"),
            "iconic": t.get("iconic_taxon_name"),
            "conservation": (t.get("conservation_status") or {}).get("status"),
            "ancestry": t.get("ancestry"),
            "wikipedia_summary": t.get("wikipedia_summary"),
            "photo": (t.get("default_photo") or {}).get("medium_url"),
        }

    if name == "similar_species":
        p = {"taxon_id": a["taxon_id"],
             "quality_grade": a.get("quality_grade"),
             "place_id": a.get("place_id"),
             "per_page": min(a.get("per_page", 10), 200),
             "fields": "taxon.name,taxon.preferred_common_name,taxon.rank"}
        d = api_get("/identifications/similar_species", p)
        return {"total": d.get("total_results"), "results": [
            {"count": r.get("count"),
             "taxon_id": (r.get("taxon") or {}).get("id"),
             "name": (r.get("taxon") or {}).get("name"),
             "common": (r.get("taxon") or {}).get("preferred_common_name"),
             "rank": (r.get("taxon") or {}).get("rank")}
            for r in d.get("results", [])
        ]}

    if name == "taxon_suggestions":
        p = {k: a.get(k) for k in ["lat", "lng", "observed_on", "taxon_id", "place_id", "source", "limit"]}
        p["fields"] = "taxon.name,taxon.preferred_common_name,taxon.rank,taxon.iconic_taxon_name"
        d = api_get("/taxa/suggest", p)
        return {"results": [
            {"score": r.get("score"),
             "taxon_id": (r.get("taxon") or {}).get("id"),
             "name": (r.get("taxon") or {}).get("name"),
             "common": (r.get("taxon") or {}).get("preferred_common_name"),
             "rank": (r.get("taxon") or {}).get("rank")}
            for r in d.get("results", [])
        ]}

    if name == "search_places":
        p = {"q": a["q"],
             "per_page": min(a.get("per_page", 10), 200),
             "fields": "name,display_name,place_type,bbox_area"}
        d = api_get("/places", p)
        return {"total": d.get("total_results"), "results": [
            {"id": pl.get("id"),
             "name": pl.get("display_name") or pl.get("name"),
             "place_type": pl.get("place_type"),
             "bbox_area": pl.get("bbox_area")}
            for pl in d.get("results", [])
        ]}

    if name == "nearby_places":
        p = {k: a[k] for k in ["nelat", "nelng", "swlat", "swlng"]}
        p["per_page"] = min(a.get("per_page", 5), 200)
        p["fields"] = "name,display_name,place_type"
        d = api_get("/places/nearby", p)
        results = d.get("results", {})
        items = (results.get("standard", []) if isinstance(results, dict) else results) + \
                (results.get("community", []) if isinstance(results, dict) else [])
        return {"results": [
            {"id": pl.get("id"),
             "name": pl.get("display_name") or pl.get("name"),
             "place_type": pl.get("place_type")}
            for pl in items
        ]}

    if name == "top_identifiers":
        p = {"taxon_id": a["taxon_id"],
             "quality_grade": a.get("quality_grade"),
             "per_page": min(a.get("per_page", 10), 200),
             "fields": "user.login,user.name"}
        d = api_get("/identifications/identifiers", p)
        return {"total": d.get("total_results"), "results": [
            {"rank": i + 1,
             "login": (r.get("user") or {}).get("login"),
             "name": (r.get("user") or {}).get("name"),
             "count": r.get("count")}
            for i, r in enumerate(d.get("results", []))
        ]}

    if name == "recent_taxa":
        p = {k: a.get(k) for k in ["taxon_id", "quality_grade", "rank"]}
        p["per_page"] = min(a.get("per_page", 10), 200)
        p["fields"] = "taxon.name,taxon.preferred_common_name,taxon.rank,obs_count"
        d = api_get("/identifications/recent_taxa", p)
        return {"results": [
            {"taxon_id": (r.get("taxon") or {}).get("id"),
             "name": (r.get("taxon") or {}).get("name"),
             "common": (r.get("taxon") or {}).get("preferred_common_name"),
             "rank": (r.get("taxon") or {}).get("rank"),
             "recent_obs_count": r.get("obs_count")}
            for r in d.get("results", [])
        ]}

    if name == "search_projects":
        p = {k: a.get(k) for k in ["q", "place_id", "type"]}
        p["per_page"] = min(a.get("per_page", 10), 200)
        p["fields"] = "title,description,place_id,project_type,observations_count,species_count"
        d = api_get("/projects", p)
        return {"total": d.get("total_results"), "results": [
            {"id": r.get("id"),
             "title": r.get("title"),
             "description": (r.get("description") or "")[:200],
             "type": r.get("project_type"),
             "observations_count": r.get("observations_count"),
             "species_count": r.get("species_count")}
            for r in d.get("results", [])
        ]}

    if name == "search":
        p = {"q": a["q"],
             "sources": a.get("sources", "taxa,places,projects"),
             "place_id": a.get("place_id"),
             "per_page": min(a.get("per_page", 10), 200),
             "fields": "record.name,record.title,record.preferred_common_name,record.rank"}
        d = api_get("/search", p)
        return {"total": d.get("total_results"), "results": [
            {"type": r.get("type"),
             "id": (r.get("record") or {}).get("id"),
             "name": (r.get("record") or {}).get("name") or (r.get("record") or {}).get("title"),
             "common": (r.get("record") or {}).get("preferred_common_name"),
             "rank": (r.get("record") or {}).get("rank")}
            for r in d.get("results", [])
        ]}

    if name == "iconic_taxa_counts":
        p = {k: a.get(k) for k in ["place_id", "taxon_id", "quality_grade", "d1", "d2"]}
        p["fields"] = "taxon.name,taxon.preferred_common_name"
        d = api_get("/observations/iconic_taxa_species_counts", p)
        return {"results": [
            {"iconic_taxon": (r.get("taxon") or {}).get("name"),
             "common": (r.get("taxon") or {}).get("preferred_common_name"),
             "count": r.get("count")}
            for r in d.get("results", [])
        ]}

    if name == "unobserved_taxa":
        p = {"place_id": a["place_id"],
             "per_page": min(a.get("per_page", 10), 200),
             "fields": "name,preferred_common_name,rank,observations_count"}
        d = api_get(f"/taxa/{a['taxon_id']}/wanted", p)
        return {"total": d.get("total_results"), "results": [
            {"id": t.get("id"),
             "name": t.get("name"),
             "common": t.get("preferred_common_name"),
             "rank": t.get("rank"),
             "global_obs_count": t.get("observations_count")}
            for t in d.get("results", [])
        ]}

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
                "serverInfo": {"name": "inaturalist-mcp", "version": "1.0.0"},
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
