# NASA MCP Proxy

MCP proxy server for NASA's open APIs. Provides access to the Astronomy Picture of the Day (APOD), Mars Rover photos, and Near-Earth Object (NEO) tracking data.

## Tools

| Tool | Description |
|------|-------------|
| `nasa_apod` | Astronomy Picture of the Day. Supports single date, date range (`start_date`/`end_date`), or random selection (`count`) |
| `nasa_mars_rover` | Photos from Mars rovers (Curiosity, Perseverance, Opportunity, Spirit). Filter by sol, earth date, or camera |
| `nasa_neo` | Near-Earth Objects. Returns asteroids with size estimates, hazard assessment, and close approach data |

## Data shapes

**APOD:**
```
{
  hdurl: string,        // high-res image URL
  url: string,          // standard resolution
  title: string,
  explanation: string,
  date: string,
  media_type: string,   // "image" or "video"
  copyright?: string
}
```

**Mars Rover photo:**
```
{
  id: number,
  img_src: string,      // direct JPEG URL
  earth_date: string,
  sol: number,
  camera: {
    name: string,       // e.g. "FHAZ", "NAVCAM", "MAST"
    full_name: string
  },
  rover: {
    name: string        // e.g. "Curiosity"
  }
}
```

**NEO:**
```
{
  name: string,
  estimated_diameter: {
    kilometers: { min: number, max: number }
  },
  is_potentially_hazardous_asteroid: boolean,
  close_approach_data: [{
    close_approach_date: string,
    relative_velocity: { kilometers_per_hour: string },
    miss_distance: { kilometers: string }
  }]
}
```

## Usage

The proxy runs the `@programcomputer/nasa-mcp-server` npm package via npx on port 9008.

```bash
NASA_API_KEY=your_key npx -y @programcomputer/nasa-mcp-server@latest
```

## API Key

A NASA API key is required. Get one for free at [api.nasa.gov](https://api.nasa.gov/). The demo key `DEMO_KEY` works for testing but has strict rate limits (30 requests/hour).

## Package

- npm: [@programcomputer/nasa-mcp-server](https://www.npmjs.com/package/@programcomputer/nasa-mcp-server)
- Source APIs: [NASA Open APIs](https://api.nasa.gov/)
