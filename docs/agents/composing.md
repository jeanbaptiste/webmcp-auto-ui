# Composer des UIs -- Guide Agent

> Ce document est concu pour etre injecte dans le contexte d'un agent IA. Il contient tout le necessaire pour composer une UI a partir de blocs avec webmcp-auto-ui.

## Qu'est-ce qu'une UI composee ?

Une UI composee est une collection de **blocs** arranges en sequence. Chaque bloc a un `type` et un objet `data`. Le `BlockRenderer` rend chaque bloc visuellement en dispatchant vers le widget correspondant.

## Workflow complet (v0.8) : Layers -> Prompt -> Tools -> LLM -> component() -> Render

```
App                      Agent Package                     LLM
 |                            |                             |
 |  1. Construit ToolLayer[]  |                             |
 |    - McpLayer (par serveur)|                             |
 |    - UILayer (+ adapter)   |                             |
 |                            |                             |
 |  2. buildSystemPrompt()    |                             |
 |  ----layers, toolMode----> |                             |
 |  <--- prompt structure --- |                             |
 |       ## mcp / ## webmcp   |                             |
 |                            |                             |
 |  3. buildToolsFromLayers() |                             |
 |  ----layers, toolMode----> |                             |
 |  <--- AnthropicTool[] ---  |                             |
 |                            |                             |
 |  4. runAgentLoop(msg, {layers})                          |
 |  ------------------------------------->  prompt + tools  |
 |                            |             |               |
 |                            |   5. component("help")      |
 |                            |   <----------------------   |
 |                            |   --- liste composants -->  |
 |                            |             |               |
 |                            |   6. query_sql({sql})       |
 |                            |   <----------------------   |
 |                   MCP call |   --- donnees ----------->  |
 |                            |             |               |
 |                            |   7. component("table",     |
 |                            |      {rows, columns})       |
 |  <-- onBlock(type, data) - |   <----------------------   |
 |  Canvas affiche le bloc    |                             |
```

### Etape par etape

1. **L'app construit des `ToolLayer[]`** -- un `McpLayer` par serveur MCP connecte + un `UILayer`
2. **`buildSystemPrompt(layers, { toolMode })`** genere le prompt francais structure en `## mcp` / `## webmcp`
3. **`buildToolsFromLayers(layers, toolMode)`** produit les `AnthropicTool[]` selon le mode
4. **`runAgentLoop(msg, { layers, toolMode })`** lance la boucle iterative
5. En mode smart : le LLM voit 1 tool `component()` + N tools MCP
6. Le LLM appelle `component("help")` pour decouvrir, puis `component("nom", {params})` pour rendre
7. Les recettes WebMCP guident le LLM sur comment presenter les donnees

### Exemple concret

```ts
import { runAgentLoop, buildToolsFromLayers, buildSystemPrompt } from '@webmcp-auto-ui/agent';
import type { McpLayer, UILayer, ToolLayer } from '@webmcp-auto-ui/agent';

// 1. Construire les layers
const mcpLayer: McpLayer = {
  source: 'mcp',
  serverUrl: 'https://mcp.code4code.eu/mcp',
  serverName: 'Tricoteuses',
  tools: await client.listTools(),
  recipes: [{ name: 'profil-depute', description: 'Fiche complete depute' }],
};

const uiLayer: UILayer = {
  source: 'ui',
  recipes: webmcpRecipes,  // recettes filtrees par serveur
};

const layers: ToolLayer[] = [mcpLayer, uiLayer];

// 4. Lancer la boucle
const result = await runAgentLoop('Qui est le depute de Paris 1er ?', {
  provider,
  layers,
  toolMode: 'smart',
  callbacks: {
    onBlock: (type, data) => canvas.addBlock(type, data),
    onText: (text) => console.log(text),
  },
});
```

## Les 24 types de blocs

### Blocs simples (9)

| Type | Description | Data minimal |
|------|-------------|-------------|
| `stat` | Metrique unique avec trend | `{"label":"Revenue","value":"$142K","trend":"+12%","trendDir":"up"}` |
| `kv` | Liste cle-valeur | `{"title":"Info","rows":[["Status","Active"],["Uptime","99.9%"]]}` |
| `list` | Liste a puces | `{"title":"Tasks","items":["Deploy API","Run tests"]}` |
| `chart` | Bar chart simple | `{"title":"Sales","bars":[["Q1",80],["Q2",120],["Q3",95]]}` |
| `alert` | Banniere d'alerte | `{"title":"Warning","message":"Disk 90%","level":"warn"}` |
| `code` | Bloc de code | `{"lang":"json","content":"{\"key\": \"value\"}"}` |
| `text` | Paragraphe texte | `{"content":"Description paragraph."}` |
| `actions` | Boutons d'action | `{"buttons":[{"label":"Approve","primary":true},{"label":"Reject"}]}` |
| `tags` | Collection de tags | `{"label":"Tags","tags":[{"text":"prod","active":true},{"text":"v2.1"}]}` |

### Blocs riches (15)

| Type | Description | Data minimal |
|------|-------------|-------------|
| `stat-card` | Stat avec couleur variante | `{"label":"Users","value":8204,"variant":"success","trend":"up"}` |
| `data-table` | Table triable | `{"title":"Users","columns":[...],"rows":[...]}` |
| `timeline` | Timeline verticale | `{"title":"History","events":[{"date":"2024-01","title":"Launch","status":"done"}]}` |
| `profile` | Fiche profil | `{"name":"Jane Doe","subtitle":"Engineer","fields":[...]}` |
| `trombinoscope` | Grille de personnes | `{"title":"Team","people":[{"name":"Alice","subtitle":"Lead"}]}` |
| `json-viewer` | Arbre JSON interactif | `{"title":"Response","data":{"status":"ok"}}` |
| `hemicycle` | Hemicycle parlementaire | `{"title":"Assembly","groups":[{"id":"a","label":"Left","seats":150,"color":"#ef4444"}]}` |
| `chart-rich` | Chart multi-type (bar/line/area/pie/donut) | `{"title":"Revenue","type":"line","labels":[...],"data":[...]}` |
| `cards` | Grille de cards | `{"title":"Products","cards":[{"title":"Widget","description":"..."}]}` |
| `grid-data` | Grille spreadsheet | `{"title":"Matrix","columns":[...],"rows":[[1,2],[3,4]]}` |
| `sankey` | Diagramme de flux | `{"title":"Traffic","nodes":[...],"links":[...]}` |
| `map` | Carte Leaflet | `{"title":"Offices","center":{"lat":48.85,"lng":2.35},"markers":[...]}` |
| `log` | Viewer de logs | `{"title":"Logs","entries":[{"level":"error","message":"..."}]}` |
| `gallery` | Galerie d'images | `{"title":"Photos","images":[{"src":"url","caption":"..."}]}` |
| `carousel` | Carousel de slides | `{"title":"Slides","slides":[...],"autoPlay":true}` |

## Composer avec component() (mode smart)

En mode smart, le LLM n'a qu'un seul outil UI : `component()`. Trois modes d'appel :

```
component("help")                        -> liste de tous les composants
component("help", "stat-card")           -> schema detaille d'un composant
component("stat-card", {label, value})   -> rend le composant
```

Actions canvas via noms courts :

| Nom court | Equivalent |
|-----------|-----------|
| `clear` | `clear_canvas` |
| `update` | `update_block` |
| `move` | `move_block` |
| `resize` | `resize_block` |
| `style` | `style_block` |

Les noms utilisent des tirets (`stat-card`). Les noms `render_*` sont acceptes en backward compat.

### Tous les composants enregistres

`component("help")` retourne **tous** les composants (56), pas seulement les widgets renderables :

- **renderable: true** -- tous les block types `render_*` + actions canvas. Renderables via `executeComponent`.
- **renderable: false** -- composants Svelte (primitives, base UI, layouts, agent UI, theme). Retournent leur schema et un hint d'usage.

## Composer une recette (skill)

Une skill est un objet JSON combinant blocs + metadata :

```json
{
  "name": "kpi-dashboard",
  "description": "Key metrics overview",
  "mcp": "https://mcp.example.com/mcp",
  "mcpName": "my-server",
  "llm": "claude-sonnet",
  "tags": ["kpi", "dashboard"],
  "theme": { "color-accent": "#2563eb" },
  "blocks": [
    { "type": "stat", "data": { "label": "Revenue", "value": "$142K" } },
    { "type": "chart", "data": { "title": "Monthly Revenue", "bars": [["Jan",80],["Feb",95]] } }
  ]
}
```

## HyperSkill URL Encoding

Les skills sont encodees en `?hs=` pour le partage :
- JSON serialise -> base64
- Si >= 6KB : gzip + prefix `gz.`
- URL : `https://domain.com/viewer?hs=<base64>`

## Exemples de composition

### Dashboard KPI (3 stats + chart)

```json
{
  "blocks": [
    { "type": "stat", "data": { "label": "Revenue", "value": "$142K", "trend": "+12.4%", "trendDir": "up" } },
    { "type": "stat", "data": { "label": "Users", "value": "8,204", "trend": "+3.2%", "trendDir": "up" } },
    { "type": "stat", "data": { "label": "Churn", "value": "2.1%", "trend": "-0.4%", "trendDir": "down" } },
    { "type": "chart-rich", "data": { "title": "Revenue Trend", "type": "area", "labels": ["Jan","Feb","Mar","Apr"], "data": [{ "label": "2024", "values": [98,112,128,142] }] } }
  ]
}
```

### Profil utilisateur

```json
{
  "blocks": [
    { "type": "profile", "data": { "name": "Jane Doe", "subtitle": "Senior Engineer", "badge": { "text": "Active", "variant": "success" }, "fields": [{ "label": "Email", "value": "jane@example.com" }], "stats": [{ "label": "Projects", "value": "12" }] } },
    { "type": "timeline", "data": { "title": "Activity", "events": [{ "date": "2024-03-15", "title": "Promoted", "status": "done" }] } }
  ]
}
```

### Monitoring

```json
{
  "blocks": [
    { "type": "alert", "data": { "title": "Database degraded", "message": "High latency.", "level": "warn" } },
    { "type": "kv", "data": { "title": "Service Status", "rows": [["API","OK"],["Database","Degraded"]] } },
    { "type": "log", "data": { "title": "Recent Logs", "entries": [{ "level": "error", "message": "Connection timeout" }] } }
  ]
}
```

## Contraintes

- Le `type` de bloc doit etre un des 24 types valides.
- Les blocs sont rendus dans l'ordre, de haut en bas.
- Taille max skill ~6KB avant gzip pour l'encodage HyperSkill URL.
- `stat` : groupes de 2-4 pour le rythme visuel.
- `data-table` : max 200 lignes affichees.

## Erreurs courantes

| Erreur | Consequence | Correction |
|--------|-------------|-----------|
| `chart` pour plusieurs datasets | `chart` = single-series bars | Utiliser `chart-rich` |
| Trop de blocs (10+) | UI surchargee | Scinder en skills focalisees |
| `type` manquant sur un bloc | `[undefined]` | Toujours inclure `type` |
| Mauvaise shape `data` | Widget vide | Verifier l'interface attendue |
| `chart-rich` ecrit comme `chart` | Ignore pie/line config | Utiliser le type `chart-rich` |
