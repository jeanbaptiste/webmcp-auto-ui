// @webmcp-auto-ui/sdk — Remote MCP server registry
// Single source of truth for the demo MCP servers exposed by the project.
// Convention aligned with WEBMCP_SERVER_REGISTRY (packages/servers/src/registry.ts):
// stable `id` as identity, `label` as display name.

export interface RemoteMcpRegistryEntry {
  id: string;
  label: string;
  description: string;
  url: string;
  tags?: string[];
  /** Optional auth headers passed to McpClient on handshake (e.g. Bearer token). */
  headers?: Record<string, string>;
}

export const REMOTE_MCP_REGISTRY: RemoteMcpRegistryEntry[] = [
  {
    id: 'tricoteuses',
    label: 'Tricoteuses',
    description: 'French parliamentary database — amendments, votes, MPs, political groups.',
    url: 'https://demos.hyperskills.net/mcp-code4code/mcp',
    tags: ['politics', 'france', 'parliament', 'open-data'],
  },
  {
    id: 'hackernews',
    label: 'Hacker News',
    description: 'Hacker News stories, comments, and rankings.',
    url: 'https://demos.hyperskills.net/mcp-hackernews/mcp',
    tags: ['tech', 'news', 'community'],
  },
  {
    id: 'metmuseum',
    label: 'Met Museum',
    description: 'Metropolitan Museum of Art — collections, artworks, artists.',
    url: 'https://demos.hyperskills.net/mcp-metmuseum/mcp',
    tags: ['art', 'museum', 'culture', 'collections'],
  },
  {
    id: 'openmeteo',
    label: 'Open-Meteo',
    description: 'Weather data — forecasts, history, geolocation.',
    url: 'https://demos.hyperskills.net/mcp-openmeteo/mcp',
    tags: ['weather', 'climate', 'forecasts', 'geo'],
  },
  {
    id: 'wikipedia',
    label: 'Wikipedia',
    description: 'Wikipedia search and content — articles, summaries, categories.',
    url: 'https://demos.hyperskills.net/mcp-wikipedia/mcp',
    tags: ['encyclopedia', 'knowledge', 'search'],
  },
  {
    id: 'inaturalist',
    label: 'iNaturalist',
    description: 'Nature observations — species, taxa, biodiversity statistics.',
    url: 'https://demos.hyperskills.net/mcp-inaturalist/mcp',
    tags: ['nature', 'biodiversity', 'observations', 'citizen-science'],
  },
  {
    id: 'datagouv',
    label: 'data.gouv.fr',
    description: 'French open data — public datasets, statistics, reference data.',
    url: 'https://demos.hyperskills.net/mcp-datagouv/mcp',
    tags: ['open-data', 'france', 'government', 'statistics'],
  },
  {
    id: 'nasa',
    label: 'NASA',
    description: 'NASA — space imagery, astronomical data, Mars rovers, asteroids.',
    url: 'https://demos.hyperskills.net/mcp-nasa/mcp',
  },
];
