---
title: Widgets UI
description: Les 31 composants renderable, BlockRenderer, et interfaces de donnees
sidebar:
  order: 4
---

Catalogue exhaustif des widgets webmcp-auto-ui avec interfaces et exemples.

## BlockRenderer

Le `BlockRenderer` recoit `{ type, data }` et dispatche vers le widget correspondant :

```svelte
<BlockRenderer type="stat" data={{ label: 'Revenue', value: '$142K' }} />
```

- Blocs simples : data via la prop `data`
- Blocs riches : data via la prop `spec`
- Types inconnus : placeholder `[type]`

Chaque bloc auto-enregistre des tools WebMCP (`block_<id>_get`, `block_<id>_update`, `block_<id>_remove`) quand `navigator.modelContext` est disponible.

## Blocs simples (9)

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

### chart -- Bar chart simple

```ts
interface ChartBlockData {
  title?: string;
  bars: [string, number][];
}
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

### code -- Bloc de code

```ts
interface CodeBlockData {
  lang?: string;
  content?: string;
}
```

### text -- Paragraphe texte

```ts
interface TextBlockData { content?: string; }
```

### actions -- Boutons d'action

```ts
interface ActionsBlockData {
  buttons: { label: string; primary?: boolean }[];
}
```

### tags -- Collection de tags

```ts
interface TagsBlockData {
  label?: string;
  tags: { text: string; active?: boolean }[];
}
```

## Widgets riches (16)

### stat-card -- Stat enrichie

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

Max 200 lignes affichees.

### timeline -- Chronologie

```ts
interface TimelineSpec {
  title?: string;
  events?: { date?: string; title?: string; description?: string; status?: 'done' | 'active' | 'pending' }[];
}
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
}
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

### sankey -- Diagramme de flux

```ts
interface SankeySpec {
  title?: string;
  nodes?: { id: string; label: string; color?: string }[];
  links?: { source: string; target: string; value: number }[];
}
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

### log -- Viewer de logs

```ts
interface LogViewerSpec {
  title?: string;
  entries?: { timestamp?: string; level?: 'debug' | 'info' | 'warn' | 'error'; message: string }[];
}
```

### gallery -- Galerie d'images

```ts
interface GallerySpec {
  title?: string;
  images?: { src: string; alt?: string; caption?: string }[];
  columns?: number;
}
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

## Contraintes

- `type` de bloc = exactement un des types listes (case-sensitive)
- JSON valide, strings en double-quotes
- URLs images doivent etre accessibles (CORS)
- `data-table` : max 200 lignes
- `map` : Leaflet charge dynamiquement

## Erreurs courantes

| Erreur | Consequence | Correction |
|--------|-------------|-----------|
| `chart` pour pie/donut | `chart` = bars uniquement | `chart-rich` avec `type: "pie"` |
| `rows` objets dans `grid-data` | Grid attend `unknown[][]` | `data-table` pour objets |
| Pas d'`id` sur hemicycle groups | Click events casses | Toujours inclure `id` |
| `columns.key` ne matche pas les rows | Cellules vides | `key` doit correspondre aux cles des objets |
