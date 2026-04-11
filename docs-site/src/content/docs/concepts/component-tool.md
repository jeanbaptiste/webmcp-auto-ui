---
title: "component()"
description: Tool unifie exposant 56 composants au LLM, mode smart vs explicit
sidebar:
  order: 2
---

Trois outils separes exposent 56 composants (31 renderable, 25 non-renderable) au LLM. En mode smart, ce sont les seuls outils UI visibles.

## Mode smart vs explicit

| | Smart (defaut) | Explicit |
|--|---------------|----------|
| **Outils UI** | 3 : `list_components()`, `get_component()`, `component()` | 31 `render_*` + `component()` |
| **Discovery** | `list_components()` + `get_component(nom)` | Le LLM voit tous les tools |
| **Tokens schema** | ~200 tokens | ~3000 tokens |
| **Recommandation** | Cloud (Claude) | WASM (Gemma) ou debug |

## Trois outils

### list_components() -- Discovery globale

```
list_components()
```

Retourne la liste des 56 composants avec nom, description, et flag `renderable`, plus les recettes disponibles.

### get_component(nom) -- Schema detaille

```
get_component("stat-card")
```

Retourne le schema JSON detaille, la description et la renderability d'un composant specifique. Appeler `list_components()` d'abord pour voir les noms disponibles.

### component(nom, params) -- Rendu

```
component("stat-card", { label: "Revenue", value: "$142K" })
```

Rend le composant sur le canvas via le callback `onBlock`. Appeler `get_component(nom)` d'abord pour connaitre les parametres attendus.

## Noms de composants

Les noms utilisent des tirets : `stat-card`, `data-table`, `chart-rich`. Les anciens noms `render_*` sont acceptes en backward compat.

### Actions canvas

| Nom court | Equivalent legacy |
|-----------|------------------|
| `clear` | `clear_canvas` |
| `update` | `update_block` |
| `move` | `move_block` |
| `resize` | `resize_block` |
| `style` | `style_block` |

## Composants renderable (31)

Tous les block types utilises par `BlockRenderer` :

| Composant | Description |
|-----------|-------------|
| `stat` | Metrique unique avec trend |
| `kv` | Paires cle-valeur |
| `list` | Liste a puces |
| `chart` | Bar chart simple |
| `alert` | Banniere d'alerte |
| `code` | Bloc de code |
| `text` | Paragraphe texte |
| `actions` | Boutons d'action |
| `tags` | Collection de tags |
| `stat-card` | Stat enrichie avec couleur |
| `data-table` | Table triable |
| `timeline` | Chronologie |
| `profile` | Fiche profil |
| `trombinoscope` | Grille de personnes |
| `json-viewer` | Arbre JSON interactif |
| `hemicycle` | Hemicycle parlementaire |
| `chart-rich` | Chart multi-type |
| `cards` | Grille de cards |
| `grid-data` | Grille spreadsheet |
| `sankey` | Diagramme de flux |
| `map` | Carte Leaflet |
| `d3` | Widget D3 (presets) |
| `log` | Viewer de logs |
| `gallery` | Galerie d'images |
| `carousel` | Carousel de slides |
| `clear` | Vider le canvas |
| `update` | Mettre a jour un bloc |
| `move` | Deplacer un bloc |
| `resize` | Redimensionner un bloc |
| `style` | Styler un bloc |

## Composants non-renderable (25)

Composants Svelte (primitives, base UI, layouts, agent UI, theme). Retournent leur schema et un hint d'usage via `get_component("nom")`.

## API

```ts
import { COMPONENT_TOOL, executeComponent, componentRegistry } from '@webmcp-auto-ui/agent';
```

### Enregistrer un composant custom

```ts
componentRegistry.set('my-widget', {
  name: 'my-widget',
  toolName: 'my-widget',
  description: 'Widget custom.',
  inputSchema: { type: 'object', properties: { title: { type: 'string' } } },
  renderable: false,
});
```

## ComponentAdapter

Filtre les composants exposes au LLM en mode explicit. Presets disponibles :

```ts
import { ComponentAdapter, minimalPreset, nativePreset, allNativePreset } from '@webmcp-auto-ui/agent';

// Minimal : stat, kv, chart, table, text + clear, update
const adapter = new ComponentAdapter();
adapter.registerAll(minimalPreset());

// Par groupes
adapter.registerAll(nativePreset('simple', 'rich', 'canvas'));

// Complet
adapter.registerAll(allNativePreset());
```

### Groupes

| Groupe | Composants |
|--------|-----------|
| `simple` | stat, kv, list, chart, alert, code, text, actions, tags |
| `rich` | table, timeline, profile, trombinoscope, json, hemicycle, chart-rich, cards, sankey, log, stat-card, grid |
| `media` | gallery, carousel, map |
| `advanced` | d3, js-sandbox |
| `canvas` | clear, update, move, resize, style |

## Flux complet

```
1. App cree UILayer avec ou sans ComponentAdapter
2. buildToolsFromLayers() genere les AnthropicTool[]
3. LLM recoit list_components(), get_component(), component() (mode smart)
4. LLM appelle list_components() -> decouverte
5. LLM appelle get_component("stat-card") -> schema detaille
6. LLM appelle component("stat-card", {label, value}) -> rendu
7. onBlock callback -> canvas affiche le bloc
```
