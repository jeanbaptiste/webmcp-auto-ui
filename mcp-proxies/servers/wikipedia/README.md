# Wikipedia MCP Server

MCP proxy server for Wikipedia, providing search and article reading capabilities.

## Architecture

Uses the `wikipedia-mcp` npm package, launched via `npx`. No local bridge script needed.

## Available Tools

### search

Search Wikipedia articles by keyword query.

Parameters:
- `query` (string) -- Search terms
- `limit` (number) -- Maximum number of results (default 10)

Returns an array of results, each with:
- `title` -- Article title
- `pageid` -- Wikipedia page ID
- `snippet` -- HTML excerpt with search term highlighting
- `url` -- Full URL to the Wikipedia article

### readArticle

Fetch the full text content of a Wikipedia article.

Parameters:
- `title` (string) -- Exact article title (as returned by search)

Returns:
- `title` -- Article title
- `extract` -- Full text content of the article
- `pageid` -- Wikipedia page ID
- `url` -- Full URL to the Wikipedia article

## Authentication

No API key required. Wikipedia's API is freely accessible.

## Notes

- Search results include HTML tags in the `snippet` field (mainly `<span class="searchmatch">`) that should be stripped or rendered appropriately.
- Article extracts can be very long. Consider truncating or summarizing for display.
- The default Wikipedia language is English. For other languages, the MCP server configuration may need adjustment.
