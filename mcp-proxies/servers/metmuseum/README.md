# Met Museum MCP Proxy

MCP proxy server for The Metropolitan Museum of Art Collection API. Search the Met's 500,000+ artworks and retrieve detailed object information including high-resolution images.

## Tools

| Tool | Description |
|------|-------------|
| `search-museum-objects` | Search the collection by keyword. Returns `{total, objectIDs[]}` |
| `get-museum-object` | Fetch full details for a single object by ID. Returns images, artist info, dates, medium, department |

## Data shape

**Search result:**
```
{
  total: number,
  objectIDs: number[]   // up to 80,000+ IDs
}
```

**Object detail:**
```
{
  objectID: number,
  primaryImage: string,       // high-res JPEG URL
  primaryImageSmall: string,  // thumbnail JPEG URL
  additionalImages: string[],
  title: string,
  artistDisplayName: string,
  objectDate: string,
  medium: string,
  department: string,
  culture: string,
  objectURL: string           // link to Met website
}
```

## Usage

The proxy runs the `metmuseum-mcp` npm package via npx on port 9001.

```bash
npx -y metmuseum-mcp
```

## Package

- npm: [metmuseum-mcp](https://www.npmjs.com/package/metmuseum-mcp)
- Source API: [Met Museum Open Access API](https://metmuseum.github.io/)

## Notes

- The Met API is free and requires no API key.
- `primaryImage` URLs are direct links to high-resolution JPEGs hosted by the Met.
- Not all objects have images. Check that `primaryImage` is non-empty before rendering.
