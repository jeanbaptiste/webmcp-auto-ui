# Hacker News MCP Proxy

MCP proxy server for the Hacker News API, exposing front page stories, latest posts, and search functionality.

## Tools

| Tool | Description |
|------|-------------|
| `get-front-page` | Returns the current top stories from Hacker News with scores, authors, and comment counts |
| `get-latest-posts` | Returns the most recent stories posted to Hacker News |
| `search-posts` | Full-text search across Hacker News stories by keyword |

## Data shape

Each story object contains:

```
{
  id: number,
  title: string,
  url: string,
  score: number,
  by: string,          // author username
  time: number,        // unix timestamp
  descendants: number, // comment count
  type: string         // "story", "job", etc.
}
```

## Usage

The proxy runs the `hn-mcp-server` npm package via npx on port 9006.

```bash
npx -y hn-mcp-server
```

## Package

- npm: [hn-mcp-server](https://www.npmjs.com/package/hn-mcp-server)
- Source API: [Hacker News API](https://github.com/HackerNews/API)
