// @webmcp-auto-ui/sdk — MCP demo servers registry
// Lists all MCP servers available on the production VM (demos.hyperskills.net)

export interface McpDemoServer {
  id: string;
  name: string;
  description: string;
  url: string;
  tags?: string[];
}

/**
 * MCP demo servers available for webmcp-auto-ui demos.
 * tricoteuses has its own domain; others follow the pattern
 * https://demos.hyperskills.net/<id>/mcp
 */
export const MCP_DEMO_SERVERS: McpDemoServer[] = [
  {
    id: 'tricoteuses',
    name: 'Tricoteuses',
    description: 'French parliamentary database — amendments, votes, MPs, political groups.',
    url: 'https://mcp.code4code.eu/mcp',
    tags: ['politics', 'france', 'parliament', 'open-data'],
  },
  {
    id: 'hackernews',
    name: 'Hacker News',
    description: 'Hacker News stories, comments, and rankings.',
    url: 'https://demos.hyperskills.net/mcp-hackernews/mcp',
    tags: ['tech', 'news', 'community'],
  },
  {
    id: 'metmuseum',
    name: 'Met Museum',
    description: 'Metropolitan Museum of Art — collections, artworks, artists.',
    url: 'https://demos.hyperskills.net/mcp-metmuseum/mcp',
    tags: ['art', 'museum', 'culture', 'collections'],
  },
  {
    id: 'openmeteo',
    name: 'Open-Meteo',
    description: 'Weather data — forecasts, history, geolocation.',
    url: 'https://demos.hyperskills.net/mcp-openmeteo/mcp',
    tags: ['weather', 'climate', 'forecasts', 'geo'],
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia',
    description: 'Wikipedia search and content — articles, summaries, categories.',
    url: 'https://demos.hyperskills.net/mcp-wikipedia/mcp',
    tags: ['encyclopedia', 'knowledge', 'search'],
  },
  {
    id: 'inaturalist',
    name: 'iNaturalist',
    description: 'Nature observations — species, taxa, biodiversity statistics.',
    url: 'https://demos.hyperskills.net/mcp-inaturalist/mcp',
    tags: ['nature', 'biodiversity', 'observations', 'citizen-science'],
  },
  {
    id: 'datagouv',
    name: 'data.gouv.fr',
    description: 'French open data — public datasets, statistics, reference data.',
    url: 'https://demos.hyperskills.net/mcp-datagouv/mcp',
    tags: ['open-data', 'france', 'government', 'statistics'],
  },
  {
    id: 'nasa',
    name: 'NASA',
    description: 'NASA — space imagery, astronomical data, Mars rovers, asteroids.',
    url: 'https://demos.hyperskills.net/mcp-nasa/mcp',
  },
];
