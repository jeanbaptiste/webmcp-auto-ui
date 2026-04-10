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
    description: 'Base de données parlementaire française — amendements, scrutins, députés, groupes politiques.',
    url: 'https://mcp.code4code.eu/mcp',
    tags: ['politique', 'france', 'parlement', 'open-data'],
  },
  {
    id: 'hackernews',
    name: 'Hacker News',
    description: 'Hacker News stories, commentaires et classements.',
    url: 'https://demos.hyperskills.net/mcp-hackernews/mcp',
    tags: ['tech', 'news', 'communauté'],
  },
  {
    id: 'metmuseum',
    name: 'Met Museum',
    description: 'Metropolitan Museum of Art — collections, œuvres, artistes.',
    url: 'https://demos.hyperskills.net/mcp-metmuseum/mcp',
    tags: ['art', 'musée', 'culture', 'collections'],
  },
  {
    id: 'openmeteo',
    name: 'Open-Meteo',
    description: 'Données météorologiques — prévisions, historique, géolocalisation.',
    url: 'https://demos.hyperskills.net/mcp-openmeteo/mcp',
    tags: ['météo', 'climat', 'prévisions', 'géo'],
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia',
    description: 'Recherche et contenu Wikipedia — articles, résumés, catégories.',
    url: 'https://demos.hyperskills.net/mcp-wikipedia/mcp',
    tags: ['encyclopédie', 'savoir', 'recherche'],
  },
  {
    id: 'inaturalist',
    name: 'iNaturalist',
    description: 'Observations naturalistes — espèces, taxons, statistiques biodiversité.',
    url: 'https://demos.hyperskills.net/mcp-inaturalist/mcp',
    tags: ['nature', 'biodiversité', 'observations', 'science-participative'],
  },
  {
    id: 'datagouv',
    name: 'data.gouv.fr',
    description: 'Open data français — jeux de données publics, statistiques, référentiels.',
    url: 'https://demos.hyperskills.net/mcp-datagouv/mcp',
    tags: ['open-data', 'france', 'gouvernement', 'statistiques'],
  },
  {
    id: 'nasa',
    name: 'NASA',
    description: 'NASA — images spatiales, données astronomiques, rovers Mars, astéroïdes.',
    url: 'https://demos.hyperskills.net/mcp-nasa/mcp',
  },
];
