# iNaturalist MCP Server

MCP proxy server for iNaturalist, a citizen science platform for biodiversity observation.

## Architecture

Unlike other MCP proxies that use npm packages, iNaturalist uses a custom Python MCP bridge (`/opt/mcp-bridge/inaturalist-mcp.py`) that wraps the iNaturalist API v1.

## Available Tools

### search_observations

Search for wildlife observations by taxon, location, date range, and quality grade.

Parameters:
- `taxon_name` (string) -- Common or scientific name to search for
- `lat` / `lng` (number) -- Center point for geographic search
- `radius` (number) -- Search radius in km
- `d1` / `d2` (string) -- Date range (YYYY-MM-DD)
- `quality_grade` (string) -- "research", "needs_id", or "casual"
- `per_page` (number) -- Results per page (max 200)

### get_observation

Fetch a single observation by ID with full details.

Parameters:
- `id` (number) -- Observation ID

### get_taxon

Fetch taxonomic information for a species.

Parameters:
- `id` (number) -- Taxon ID

## Authentication

No API key required. The iNaturalist API is freely accessible.

## Photo URLs

Observation photos use the iNaturalist CDN. URLs are returned with `square` thumbnails by default. To get higher resolution images:

- Replace `square` with `small` (75x75 -> 240x240)
- Replace `square` with `medium` (75x75 -> 500x500)
- Replace `square` with `large` (75x75 -> 1024x1024)
- Replace `square` with `original` for the full-size upload

Example: `https://inaturalist-open-data.s3.amazonaws.com/photos/12345/square.jpg`
becomes: `https://inaturalist-open-data.s3.amazonaws.com/photos/12345/medium.jpg`
