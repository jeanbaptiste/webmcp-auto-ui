# Widgets UI -- Guide Agent

> Ce document est concu pour etre injecte dans le contexte d'un agent IA. Catalogue exhaustif des widgets webmcp-auto-ui avec props et exemples.

## Comment ca marche

### Mode smart (defaut v0.8)

En mode smart, le LLM n'a qu'un seul outil UI : **`component()`**. Il decouvre les composants via `component("help")` et les rend via `component("nom", {params})`.

```
LLM appelle component("help")
  -> liste de 56 composants avec schemas

LLM appelle component("stat-card", {label: "Users", value: 8204})
  -> bloc rendu sur le canvas
```

### Mode explicit

En mode explicit, le LLM voit les 31 `render_*` tools individuels + `component()`. Plus verbeux mais utile pour les modeles WASM qui ont besoin d'exemples concrets.

### BlockRenderer

Le `BlockRenderer` recoit `{ type, data }` et dispatche vers le widget :
- Blocs simples : data via la prop `data`
- Blocs riches : data via la prop `spec`
- Types inconnus : placeholder `[type]`

Chaque bloc auto-enregistre des tools WebMCP (`block_<id>_get`, `block_<id>_update`, `block_<id>_remove`) quand `navigator.modelContext` est disponible.

---

## Categorie : Blocs simples (9)

### stat -- Metrique unique

```ts
interface StatBlockData {
  label: string;
  value: string;
  trend?: string;
  trendDir?: 'up' | 'down' | 'neutral';
}
```

```json
{ "type": "stat", "data": { "label": "Revenue", "value": "$142K", "trend": "+12.4%", "trendDir": "up" } }
```

Mode smart : `component("stat", {label: "Revenue", value: "$142K", trend: "+12.4%", trendDir: "up"})`

### kv -- Paires cle-valeur

```ts
interface KVBlockData {
  title?: string;
  rows: [string, string][];
}
```

```json
{ "type": "kv", "data": { "title": "Server Info", "rows": [["Host", "prod-eu-01"], ["CPU", "42%"]] } }
```

### list -- Liste texte

```ts
interface ListBlockData {
  title?: string;
  items: string[];
}
```

```json
{ "type": "list", "data": { "title": "Tasks", "items": ["Deploy API", "Run tests"] } }
```

### chart -- Bar chart simple

```ts
interface ChartBlockData {
  title?: string;
  bars: [string, number][];
}
```

```json
{ "type": "chart", "data": { "title": "Sales", "bars": [["Jan", 80], ["Feb", 95], ["Mar", 120]] } }
```

Pour multi-series, pie, line, area : utiliser `chart-rich`.

### alert -- Banniere d'alerte

```ts
interface AlertBlockData {
  title?: string;
  message?: string;
  level?: 'info' | 'warn' | 'error';
}
```

```json
{ "type": "alert", "data": { "title": "Deploy failed", "message": "Exit code 1.", "level": "error" } }
```

### code -- Bloc de code

```ts
interface CodeBlockData {
  lang?: string;
  content?: string;
}
```

```json
{ "type": "code", "data": { "lang": "sql", "content": "SELECT * FROM users LIMIT 10;" } }
```

### text -- Paragraphe texte

```ts
interface TextBlockData { content?: string; }
```

```json
{ "type": "text", "data": { "content": "Ce rapport resume les performances Q1." } }
```

### actions -- Boutons d'action

```ts
interface ActionsBlockData {
  buttons: { label: string; primary?: boolean }[];
}
```

```json
{ "type": "actions", "data": { "buttons": [{ "label": "Approve", "primary": true }, { "label": "Reject" }] } }
```

### tags -- Collection de tags

```ts
interface TagsBlockData {
  label?: string;
  tags: { text: string; active?: boolean }[];
}
```

```json
{ "type": "tags", "data": { "label": "Filters", "tags": [{ "text": "production", "active": true }, { "text": "staging" }] } }
```

---

## Categorie : Widgets riches (15)

### stat-card -- Stat card enrichie

```ts
interface StatCardSpec {
  label?: string;
  value?: unknown;
  unit?: string;
  delta?: string;
  trend?: 'up' | 'down' | 'flat' | { direction: 'up' | 'down' | 'flat'; value?: string; positive?: boolean };
  previousValue?: unknown;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}
```

```json
{ "type": "stat-card", "data": { "label": "Active Users", "value": 8204, "unit": "users", "trend": { "direction": "up", "value": "+3.2%", "positive": true }, "variant": "success" } }
```

### data-table -- Table triable

```ts
interface DataTableSpec {
  title?: string;
  columns?: { key: string; label: string; align?: string; type?: string }[];
  rows?: Record<string, unknown>[];
  compact?: boolean;
  striped?: boolean;
}
```

```json
{ "type": "data-table", "data": { "title": "Users", "columns": [{ "key": "name", "label": "Name" }, { "key": "email", "label": "Email" }], "rows": [{ "name": "Alice", "email": "a@co.com" }] } }
```

Max 200 lignes affichees.

### timeline -- Timeline verticale

```ts
interface TimelineSpec {
  title?: string;
  events?: { date?: string; title?: string; description?: string; status?: 'done' | 'active' | 'pending' }[];
}
```

```json
{ "type": "timeline", "data": { "title": "History", "events": [{ "date": "2024-01", "title": "Launch", "status": "done" }] } }
```

### profile -- Fiche profil

```ts
interface ProfileSpec {
  name?: string;
  subtitle?: string;
  avatar?: { src: string; alt?: string };
  badge?: { text: string; variant?: string };
  fields?: { label: string; value: string }[];
  stats?: { label: string; value: string }[];
  actions?: { label: string; variant?: string }[];
}
```

```json
{ "type": "profile", "data": { "name": "Jane Doe", "subtitle": "Engineer", "badge": { "text": "Active", "variant": "success" }, "fields": [{ "label": "Email", "value": "jane@co.com" }] } }
```

### trombinoscope -- Grille de personnes

```ts
interface TrombinoscopeSpec {
  title?: string;
  people?: { name: string; subtitle?: string; avatar?: string; badge?: string }[];
  columns?: number;
}
```

```json
{ "type": "trombinoscope", "data": { "title": "Team", "people": [{ "name": "Alice", "subtitle": "Lead" }], "columns": 4 } }
```

### json-viewer -- Arbre JSON interactif

```ts
interface JsonViewerSpec {
  title?: string;
  data?: unknown;
  maxDepth?: number;
  expanded?: boolean;
}
```

```json
{ "type": "json-viewer", "data": { "title": "API Response", "data": { "status": "ok", "items": [1, 2, 3] } } }
```

### hemicycle -- Hemicycle parlementaire

```ts
interface HemicycleSpec {
  title?: string;
  groups?: { id: string; label: string; seats: number; color: string }[];
  totalSeats?: number;
  rows?: number;
}
```

```json
{ "type": "hemicycle", "data": { "title": "Assembly", "groups": [{ "id": "left", "label": "Left", "seats": 150, "color": "#ef4444" }, { "id": "right", "label": "Right", "seats": 130, "color": "#3b82f6" }] } }
```

### chart-rich -- Chart multi-type

```ts
interface ChartSpec {
  title?: string;
  type?: 'bar' | 'line' | 'area' | 'pie' | 'donut';
  labels?: string[];
  data?: { label?: string; values: number[]; color?: string }[];
  legend?: boolean;
}
```

```json
{ "type": "chart-rich", "data": { "title": "Revenue", "type": "bar", "labels": ["EU", "US"], "data": [{ "label": "2024", "values": [95, 140] }] } }
```

### cards -- Grille de cards

```ts
interface CardsSpec {
  title?: string;
  cards?: { title: string; description?: string; tags?: string[]; image?: string }[];
  minCardWidth?: string;
}
```

```json
{ "type": "cards", "data": { "title": "Products", "cards": [{ "title": "Pro Plan", "description": "For teams" }] } }
```

### grid-data -- Grille spreadsheet

```ts
interface GridDataSpec {
  title?: string;
  columns?: { key: string; label: string }[];
  rows?: unknown[][];
  highlights?: { row: number; col: number; color?: string }[];
}
```

```json
{ "type": "grid-data", "data": { "title": "Matrix", "columns": [{ "key": "a", "label": "A" }], "rows": [[1.0, 0.8], [0.8, 1.0]] } }
```

### sankey -- Diagramme de flux

```ts
interface SankeySpec {
  title?: string;
  nodes?: { id: string; label: string; color?: string }[];
  links?: { source: string; target: string; value: number }[];
}
```

```json
{ "type": "sankey", "data": { "title": "Traffic", "nodes": [{ "id": "google", "label": "Google" }, { "id": "site", "label": "Site" }], "links": [{ "source": "google", "target": "site", "value": 500 }] } }
```

### map -- Carte interactive

```ts
interface MapSpec {
  title?: string;
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: { lat: number; lng: number; label?: string; color?: string }[];
}
```

```json
{ "type": "map", "data": { "title": "Offices", "center": { "lat": 48.85, "lng": 2.35 }, "zoom": 5, "markers": [{ "lat": 48.85, "lng": 2.35, "label": "Paris" }] } }
```

### log -- Viewer de logs

```ts
interface LogViewerSpec {
  title?: string;
  entries?: { timestamp?: string; level?: 'debug' | 'info' | 'warn' | 'error'; message: string; source?: string }[];
  maxHeight?: string;
}
```

```json
{ "type": "log", "data": { "title": "Logs", "entries": [{ "level": "error", "message": "Connection timeout" }] } }
```

### gallery -- Galerie d'images

```ts
interface GallerySpec {
  title?: string;
  images?: { src: string; alt?: string; caption?: string }[];
  columns?: number;
}
```

```json
{ "type": "gallery", "data": { "title": "Photos", "columns": 3, "images": [{ "src": "https://picsum.photos/400/300", "caption": "Sample" }] } }
```

Navigation clavier dans la lightbox (Escape, fleches).

### carousel -- Carousel de slides

```ts
interface CarouselSpec {
  title?: string;
  slides?: { src?: string; content?: string; title?: string; subtitle?: string }[];
  autoPlay?: boolean;
  interval?: number;
}
```

```json
{ "type": "carousel", "data": { "title": "Features", "autoPlay": true, "interval": 4000, "slides": [{ "src": "https://picsum.photos/800/400", "title": "Slide 1" }] } }
```

---

## Categorie : Primitives (5)

Composants layout internes (non-renderable via component()) :

| Composant | Usage |
|-----------|-------|
| `Window` | Container draggable avec title bar |
| `Card` | Wrapper card basique |
| `Panel` | Container panel |
| `List` | Liste primitive |
| `GridLayout` | Layout grid |

---

## Categorie : Composants base (7)

UI primitives de `@webmcp-auto-ui/ui/base` :

| Composant | Usage |
|-----------|-------|
| `Button` | Bouton avec variantes |
| `Input` | Champ texte |
| `Badge` | Badge status |
| `NativeSelect` | Select dropdown |
| `Tooltip` | Tooltip hover |
| `Dialog` | Modal dialog |

---

## Categorie : Agent UI Widgets (5)

Composants specialises pour les interactions agent, depuis `@webmcp-auto-ui/ui` :

| Composant | Usage |
|-----------|-------|
| `GemmaLoader` | Overlay avec barre de progression, auto-collapse en pill |
| `TokenBubble` | Metriques temps reel : req/min, tokens input/output |
| `EphemeralBubble` | Notification ephemere |
| `RemoteMCPserversDemo` | Decouverte serveurs MCP demo |
| `SettingsPanel` | Sliders temperature, topK, maxTokens |

---

## Categorie : Layout extensions (1)

| Composant | Usage |
|-----------|-------|
| `FlexLayout` | Auto-grid avec slider de taille pour ajuster les blocs |

---

## Contraintes

- `type` de bloc = exactement un des 24 types (case-sensitive).
- JSON valide. Strings en double-quotes.
- URLs images doivent etre accessibles (CORS).
- `data-table` : max 200 lignes.
- `map` : Leaflet charge dynamiquement.

## Erreurs courantes

| Erreur | Consequence | Correction |
|--------|-------------|-----------|
| `chart` pour pie/donut | `chart` = bars uniquement | `chart-rich` avec `type: "pie"` |
| `rows` objets dans `grid-data` | Grid attend `unknown[][]` | `data-table` pour objets, `grid-data` pour arrays |
| Pas d'`id` sur hemicycle groups | Click events cassent | Toujours `id` |
| `columns.key` ne matche pas les rows | Cellules vides | `key` doit correspondre aux cles des objets row |
| `trend` string sur `stat-card` sans `delta` | Fleche sans valeur | Mettre `delta` ou utiliser la forme objet |
