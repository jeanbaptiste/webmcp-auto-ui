/**
 * Demo data for every WidgetRenderer type.
 * Each entry is { type, data } matching WidgetRenderer's Props.
 */

export interface DemoBlock {
  type: string;
  label: string;
  data: Record<string, unknown>;
}

export const SIMPLE_BLOCKS: DemoBlock[] = [
  {
    type: 'stat',
    label: 'Stat',
    data: { label: 'Revenus mensuels', value: '42 850 EUR', trend: '+12.4% vs mois dernier', trendDir: 'up' },
  },
  {
    type: 'kv',
    label: 'Key-Value',
    data: {
      title: 'Configuration serveur',
      rows: [
        ['OS', 'Debian 12 Bookworm'],
        ['CPU', '8 vCPU (Xeon E5)'],
        ['RAM', '32 Go DDR4'],
        ['Stockage', '500 Go NVMe'],
        ['Uptime', '147 jours'],
      ],
    },
  },
  {
    type: 'list',
    label: 'List',
    data: {
      title: 'Prochaines etapes',
      items: [
        'Valider les maquettes avec le client',
        'Deployer en staging pour tests UAT',
        'Migrer la base PostgreSQL vers v16',
        'Activer le monitoring Prometheus',
      ],
    },
  },
  {
    type: 'chart',
    label: 'Chart (bars)',
    data: {
      title: 'Visiteurs par jour',
      bars: [['Lun', 420], ['Mar', 580], ['Mer', 310], ['Jeu', 690], ['Ven', 870], ['Sam', 540], ['Dim', 230]],
    },
  },
  {
    type: 'alert',
    label: 'Alert (info)',
    data: { title: 'Mise a jour disponible', message: 'La version 2.4.1 corrige un bug de rendu sur Safari. Recommandation : mettre a jour avant vendredi.', level: 'info' },
  },
  {
    type: 'alert',
    label: 'Alert (warn)',
    data: { title: 'Quota disque a 85%', message: 'Le volume /data atteint 85% de capacite. Planifiez un nettoyage ou une extension.', level: 'warn' },
  },
  {
    type: 'alert',
    label: 'Alert (error)',
    data: { title: 'Echec du build CI', message: 'Le pipeline main #347 a echoue a l\'etape de tests e2e. 3 tests en erreur.', level: 'error' },
  },
  {
    type: 'code',
    label: 'Code',
    data: {
      lang: 'typescript',
      content: `import { WidgetRenderer } from '@webmcp-auto-ui/ui';

// Render any widget type dynamically
const widgets = canvas.blocks;
for (const widget of widgets) {
  render(WidgetRenderer, { type: widget.type, data: widget.data });
}`,
    },
  },
  {
    type: 'text',
    label: 'Text',
    data: { content: 'WebMCP Auto-UI est un framework qui permet a un agent IA de generer des interfaces utilisateur dynamiques en temps reel. Chaque composant peut etre instancie, modifie et supprime par l\'agent via le protocole MCP.' },
  },
  {
    type: 'actions',
    label: 'Actions',
    data: {
      buttons: [
        { label: 'Deployer', primary: true },
        { label: 'Annuler' },
        { label: 'Voir les logs' },
      ],
    },
  },
  {
    type: 'tags',
    label: 'Tags',
    data: {
      label: 'Stack:',
      tags: [
        { text: 'SvelteKit', active: true },
        { text: 'TypeScript', active: true },
        { text: 'Tailwind' },
        { text: 'Vite', active: true },
        { text: 'WebMCP' },
        { text: 'MediaPipe' },
      ],
    },
  },
];

export const RICH_BLOCKS: DemoBlock[] = [
  {
    type: 'stat-card',
    label: 'Stat Card',
    data: { label: 'Utilisateurs actifs', value: '12 847', unit: 'MAU', trend: 'up', delta: '+18%', variant: 'success' },
  },
  {
    type: 'data-table',
    label: 'Data Table',
    data: {
      title: 'Deploiements recents',
      columns: [
        { key: 'env', label: 'Environnement' },
        { key: 'version', label: 'Version' },
        { key: 'date', label: 'Date', align: 'right' },
        { key: 'status', label: 'Statut' },
      ],
      rows: [
        { env: 'Production', version: 'v2.4.0', date: '2026-04-09', status: 'OK' },
        { env: 'Staging', version: 'v2.5.0-rc1', date: '2026-04-08', status: 'OK' },
        { env: 'Preview', version: 'v2.5.0-alpha.3', date: '2026-04-07', status: 'Echec' },
        { env: 'Production', version: 'v2.3.2', date: '2026-04-01', status: 'OK' },
        { env: 'Staging', version: 'v2.4.0-rc2', date: '2026-03-28', status: 'OK' },
      ],
      striped: true,
    },
  },
  {
    type: 'timeline',
    label: 'Timeline',
    data: {
      title: 'Historique du projet',
      events: [
        { date: '2026-01-15', title: 'Kickoff projet WebMCP', description: 'Definition du scope et de l\'architecture', status: 'done' },
        { date: '2026-02-20', title: 'Release v1.0', description: 'Premier prototype fonctionnel avec support Gemma', status: 'done' },
        { date: '2026-03-10', title: 'Integration MCP native', description: 'Support complet du protocole MCP via WebMCP polyfill', status: 'done' },
        { date: '2026-04-09', title: 'Phase 6 : Showcase dynamique', description: 'App de demonstration multi-themes', status: 'active' },
        { date: '2026-05-01', title: 'Release v3.0', description: 'Multi-agent, outils collaboratifs', status: 'pending' },
      ],
    },
  },
  {
    type: 'profile',
    label: 'Profile Card',
    data: {
      name: 'Ada Lovelace',
      subtitle: 'Lead Architect @ WebMCP',
      badge: { text: 'Admin', variant: 'success' },
      fields: [
        { label: 'Email', value: 'ada@webmcp.dev' },
        { label: 'Equipe', value: 'Core Platform' },
        { label: 'Localisation', value: 'Paris, France' },
      ],
      stats: [
        { label: 'Commits', value: '1,247' },
        { label: 'PRs', value: '386' },
        { label: 'Reviews', value: '892' },
      ],
      actions: [
        { label: 'Voir profil', variant: 'primary' },
        { label: 'Message', variant: 'secondary' },
      ],
    },
  },
  {
    type: 'trombinoscope',
    label: 'Trombinoscope',
    data: {
      title: 'Equipe WebMCP',
      columns: 4,
      showBadge: true,
      people: [
        { name: 'Ada Lovelace', subtitle: 'Architecte', badge: 'Lead' },
        { name: 'Alan Turing', subtitle: 'Backend', badge: 'Senior' },
        { name: 'Grace Hopper', subtitle: 'DevOps', badge: 'Senior' },
        { name: 'Linus Torvalds', subtitle: 'Infra', badge: 'Staff' },
        { name: 'Margaret Hamilton', subtitle: 'Frontend', badge: 'Senior' },
        { name: 'Dennis Ritchie', subtitle: 'Core', badge: 'Staff' },
        { name: 'Barbara Liskov', subtitle: 'QA', badge: 'Lead' },
        { name: 'Bjarne Stroustrup', subtitle: 'Perf', badge: 'Senior' },
      ],
    },
  },
  {
    type: 'json-viewer',
    label: 'JSON Viewer',
    data: {
      title: 'Reponse API',
      expanded: true,
      data: {
        status: 'success',
        data: {
          user: { id: 42, name: 'Ada', roles: ['admin', 'dev'] },
          session: { token: '***', expiresAt: '2026-04-10T00:00:00Z' },
          features: ['mcp', 'gemma', 'multi-agent'],
        },
        meta: { requestId: 'req_abc123', latency: '12ms' },
      },
    },
  },
  {
    type: 'hemicycle',
    label: 'Hemicycle',
    data: {
      title: 'Assemblee nationale (sim.)',
      groups: [
        { id: 'lfi', label: 'LFI', seats: 75, color: '#c0392b' },
        { id: 'ps', label: 'PS', seats: 31, color: '#e74c8b' },
        { id: 'ecolo', label: 'Ecolo', seats: 23, color: '#27ae60' },
        { id: 'modem', label: 'MoDem', seats: 51, color: '#f39c12' },
        { id: 'ren', label: 'Renaissance', seats: 170, color: '#3498db' },
        { id: 'lr', label: 'LR', seats: 62, color: '#2c3e50' },
        { id: 'rn', label: 'RN', seats: 89, color: '#1a237e' },
      ],
      rows: 5,
    },
  },
  {
    type: 'chart-rich',
    label: 'Chart (rich bar)',
    data: {
      title: 'Temps de reponse API (ms)',
      type: 'bar',
      labels: ['GET /users', 'POST /auth', 'GET /widgets', 'PUT /canvas', 'DELETE /session'],
      data: [
        { label: 'p50', values: [12, 45, 8, 22, 5], color: '#3ecfb2' },
        { label: 'p99', values: [89, 230, 42, 110, 18], color: '#fa6d7c' },
      ],
      legend: true,
    },
  },
  {
    type: 'chart-rich',
    label: 'Chart (rich pie)',
    data: {
      title: 'Repartition du trafic',
      type: 'donut',
      labels: ['Desktop', 'Mobile', 'Tablet', 'API'],
      data: [{ label: 'Trafic', values: [45, 38, 12, 5] }],
    },
  },
  {
    type: 'cards',
    label: 'Cards',
    data: {
      title: 'Packages du monorepo',
      cards: [
        { title: '@webmcp-auto-ui/core', description: 'Client MCP, groupes d\'outils, polyfill WebMCP', tags: ['core', 'mcp'] },
        { title: '@webmcp-auto-ui/ui', description: 'Composants Svelte 5, theme system, widgets', tags: ['ui', 'svelte'] },
        { title: '@webmcp-auto-ui/agent', description: 'Boucle agent, providers LLM, widgets WebMCP', tags: ['agent', 'llm'] },
        { title: '@webmcp-auto-ui/sdk', description: 'Canvas store, HyperSkill encode/decode', tags: ['sdk', 'canvas'] },
      ],
    },
  },
  {
    type: 'grid-data',
    label: 'Grid Data',
    data: {
      title: 'Matrice de compatibilite navigateurs',
      columns: [
        { key: 'feature', label: 'Feature', width: '180px' },
        { key: 'chrome', label: 'Chrome' },
        { key: 'firefox', label: 'Firefox' },
        { key: 'safari', label: 'Safari' },
        { key: 'edge', label: 'Edge' },
      ],
      rows: [
        ['WebGPU', 'Oui', 'Flag', 'Non', 'Oui'],
        ['WebMCP', 'Oui', 'Oui', 'Oui', 'Oui'],
        ['SharedArrayBuffer', 'Oui', 'Oui', 'Oui', 'Oui'],
        ['WASM SIMD', 'Oui', 'Oui', 'Oui', 'Oui'],
      ],
      highlights: [
        { row: 0, col: 2, color: 'rgba(240,160,80,0.2)' },
        { row: 0, col: 3, color: 'rgba(250,109,124,0.2)' },
      ],
    },
  },
  {
    type: 'sankey',
    label: 'Sankey',
    data: {
      title: 'Flux de donnees agent',
      nodes: [
        { id: 'user', label: 'Utilisateur', color: '#3b82f6' },
        { id: 'agent', label: 'Agent Loop', color: '#7c6dfa' },
        { id: 'gemma', label: 'Gemma (WASM)', color: '#f0a050' },
        { id: 'claude', label: 'Claude API', color: '#3ecfb2' },
        { id: 'mcp', label: 'MCP Tools', color: '#fa6d7c' },
        { id: 'canvas', label: 'Canvas', color: '#a855f7' },
      ],
      links: [
        { source: 'user', target: 'agent', value: 100, label: 'prompt' },
        { source: 'agent', target: 'gemma', value: 40, label: 'local' },
        { source: 'agent', target: 'claude', value: 60, label: 'remote' },
        { source: 'gemma', target: 'mcp', value: 30 },
        { source: 'claude', target: 'mcp', value: 50 },
        { source: 'mcp', target: 'canvas', value: 80, label: 'widgets' },
      ],
    },
  },
  {
    type: 'log',
    label: 'Log Viewer',
    data: {
      title: 'Agent logs',
      entries: [
        { timestamp: '14:23:01.123', level: 'info', message: 'Agent loop started', source: 'agent' },
        { timestamp: '14:23:01.456', level: 'debug', message: 'Sending prompt to Gemma WASM provider', source: 'gemma' },
        { timestamp: '14:23:03.789', level: 'info', message: 'Tool call: autoui_webmcp_widget_display({ name: "stat", params: {...} })', source: 'agent' },
        { timestamp: '14:23:03.801', level: 'info', message: 'Widget stat_revenue rendered', source: 'canvas' },
        { timestamp: '14:23:04.100', level: 'warn', message: 'Token budget at 82% (3280/4000)', source: 'agent' },
        { timestamp: '14:23:05.500', level: 'error', message: 'MCP tool fetch_data timed out after 5000ms', source: 'mcp' },
        { timestamp: '14:23:05.510', level: 'info', message: 'Retrying with fallback data', source: 'agent' },
      ],
    },
  },
  {
    type: 'carousel',
    label: 'Carousel',
    data: {
      title: 'Captures d\'ecran',
      autoPlay: true,
      interval: 4000,
      slides: [
        { title: 'Dashboard principal', subtitle: 'Vue agent avec canvas et chat', content: 'L\'agent genere des widgets en temps reel via le protocole MCP.' },
        { title: 'Theme Cyberpunk', subtitle: 'Neon et contrastes forts', content: 'Le systeme de themes permet de changer l\'apparence de toute l\'app en un clic.' },
        { title: 'Multi-agent', subtitle: 'Collaboration entre agents', content: 'Plusieurs agents peuvent travailler sur le meme canvas simultanement.' },
      ],
    },
  },
];

export const ALL_BLOCKS: DemoBlock[] = [...SIMPLE_BLOCKS, ...RICH_BLOCKS];
