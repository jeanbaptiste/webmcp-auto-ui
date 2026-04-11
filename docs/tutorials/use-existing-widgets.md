# Utiliser les widgets existants

Ce tutorial explique comment utiliser les widgets natifs du serveur `autoui` via les outils MCP. Il couvre la recherche de widgets, la lecture de leurs schemas, l'affichage, la manipulation du canvas, et la composition de dashboards.

## Prerequis

- Un serveur `autoui` connecte via MCP
- Un agent capable d'appeler les outils MCP (`autoui_webmcp_*`)

---

## Etape 1 -- Lister les widgets disponibles

L'outil `autoui_webmcp_search_recipes` retourne la liste des widgets avec leurs descriptions et groupes.

```json
{
  "name": "autoui_webmcp_search_recipes",
  "arguments": {}
}
```

La reponse contient un tableau de recettes. Chaque entree indique le nom du widget, son groupe et une description courte. C'est le point de depart pour savoir ce qui est disponible.

Vous pouvez filtrer par mot-cle :

```json
{
  "name": "autoui_webmcp_search_recipes",
  "arguments": {
    "query": "chart"
  }
}
```

### Catalogue des 26 widgets natifs

#### Groupe simple (9 widgets)

| Widget | Description |
|--------|-------------|
| `stat` | Valeur numerique avec label et tendance |
| `kv` | Liste de paires cle-valeur |
| `list` | Liste simple d'elements |
| `chart` | Graphique basique (bar, line, pie) |
| `alert` | Message d'alerte avec niveau de severite |
| `code` | Bloc de code avec coloration syntaxique |
| `text` | Texte riche (markdown) |
| `actions` | Groupe de boutons d'action |
| `tags` | Ensemble de badges/etiquettes |

#### Groupe rich (12 widgets)

| Widget | Description |
|--------|-------------|
| `data-table` | Tableau de donnees avec tri et filtres |
| `timeline` | Chronologie d'evenements |
| `profile` | Fiche de profil utilisateur |
| `trombinoscope` | Grille de profils |
| `json-viewer` | Explorateur JSON interactif |
| `hemicycle` | Visualisation en hemicycle (votes parlementaires) |
| `chart-rich` | Graphique avance multi-series |
| `cards` | Grille de cartes avec contenu structure |
| `sankey` | Diagramme de flux Sankey |
| `log` | Journal d'evenements horodate |
| `stat-card` | Carte statistique enrichie |
| `grid-data` | Grille de donnees editable |

#### Groupe media (2 widgets)

| Widget | Description |
|--------|-------------|
| `gallery` | Galerie d'images avec lightbox |
| `carousel` | Carrousel d'images/contenus |

#### Groupe advanced (3 widgets)

| Widget | Description |
|--------|-------------|
| `map` | Carte interactive (Leaflet) |
| `d3` | Visualisation D3.js custom |
| `js-sandbox` | Sandbox JavaScript isolee |

---

## Etape 2 -- Lire le schema d'un widget

Avant d'afficher un widget, lisez sa recette pour connaitre les parametres attendus.

```json
{
  "name": "autoui_webmcp_get_recipe",
  "arguments": {
    "recipe": "hemicycle"
  }
}
```

La reponse contient :

- **schema** : les proprietes attendues (types, valeurs par defaut, contraintes)
- **description** : ce que le widget fait et comment l'utiliser
- **exemples** : des appels types avec leurs parametres

Autre exemple avec `data-table` :

```json
{
  "name": "autoui_webmcp_get_recipe",
  "arguments": {
    "recipe": "data-table"
  }
}
```

---

## Etape 3 -- Afficher un widget

L'outil `autoui_webmcp_widget_display` cree un widget sur le canvas.

### Exemples par groupe

#### Simple

Un indicateur statistique :

```json
{
  "name": "autoui_webmcp_widget_display",
  "arguments": {
    "recipe": "stat",
    "data": {
      "label": "PIB",
      "value": "2.1T EUR",
      "trend": "+1.2%"
    }
  }
}
```

Un graphique en barres :

```json
{
  "name": "autoui_webmcp_widget_display",
  "arguments": {
    "recipe": "chart",
    "data": {
      "type": "bar",
      "labels": ["Jan", "Fev", "Mar", "Avr"],
      "datasets": [
        { "label": "Ventes", "data": [120, 190, 300, 250] }
      ]
    }
  }
}
```

Une alerte :

```json
{
  "name": "autoui_webmcp_widget_display",
  "arguments": {
    "recipe": "alert",
    "data": {
      "level": "warning",
      "title": "Quota proche",
      "message": "Vous avez utilise 92% de votre quota mensuel."
    }
  }
}
```

#### Rich

Un tableau de donnees :

```json
{
  "name": "autoui_webmcp_widget_display",
  "arguments": {
    "recipe": "data-table",
    "data": {
      "columns": ["Pays", "Population", "PIB"],
      "rows": [
        ["France", "67M", "2.78T"],
        ["Allemagne", "83M", "3.86T"],
        ["Espagne", "47M", "1.40T"]
      ]
    }
  }
}
```

Une timeline :

```json
{
  "name": "autoui_webmcp_widget_display",
  "arguments": {
    "recipe": "timeline",
    "data": {
      "events": [
        { "date": "2024-01-15", "title": "Lancement v1", "description": "Premiere version publique" },
        { "date": "2024-06-01", "title": "v2 beta", "description": "Refonte complete de l'UI" },
        { "date": "2024-09-30", "title": "v2 stable", "description": "Release officielle" }
      ]
    }
  }
}
```

Un hemicycle :

```json
{
  "name": "autoui_webmcp_widget_display",
  "arguments": {
    "recipe": "hemicycle",
    "data": {
      "groups": [
        { "name": "Gauche", "seats": 150, "color": "#e74c3c" },
        { "name": "Centre", "seats": 120, "color": "#f39c12" },
        { "name": "Droite", "seats": 200, "color": "#3498db" }
      ],
      "total": 470
    }
  }
}
```

#### Media

Une galerie :

```json
{
  "name": "autoui_webmcp_widget_display",
  "arguments": {
    "recipe": "gallery",
    "data": {
      "images": [
        { "src": "https://example.com/photo1.jpg", "alt": "Vue aerienne" },
        { "src": "https://example.com/photo2.jpg", "alt": "Detail facade" }
      ]
    }
  }
}
```

#### Advanced

Une carte interactive :

```json
{
  "name": "autoui_webmcp_widget_display",
  "arguments": {
    "recipe": "map",
    "data": {
      "center": [48.8566, 2.3522],
      "zoom": 12,
      "markers": [
        { "lat": 48.8584, "lng": 2.2945, "label": "Tour Eiffel" },
        { "lat": 48.8606, "lng": 2.3376, "label": "Louvre" }
      ]
    }
  }
}
```

---

## Etape 4 -- Manipuler le canvas

Une fois les widgets affiches, utilisez `autoui_webmcp_canvas` pour les repositionner, redimensionner ou supprimer.

### Deplacer un widget

```json
{
  "name": "autoui_webmcp_canvas",
  "arguments": {
    "action": "move",
    "id": "w_abc",
    "params": { "x": 100, "y": 200 }
  }
}
```

### Redimensionner un widget

```json
{
  "name": "autoui_webmcp_canvas",
  "arguments": {
    "action": "resize",
    "id": "w_abc",
    "params": { "width": 400, "height": 300 }
  }
}
```

### Supprimer un widget

```json
{
  "name": "autoui_webmcp_canvas",
  "arguments": {
    "action": "remove",
    "id": "w_abc"
  }
}
```

### Tout effacer

```json
{
  "name": "autoui_webmcp_canvas",
  "arguments": {
    "action": "clear"
  }
}
```

---

## Etape 5 -- Composer un dashboard

Le pattern standard pour creer un dashboard complet :

1. **Chercher** les widgets adaptes avec `search_recipes`
2. **Lire** les schemas des widgets choisis avec `get_recipe`
3. **Preparer** les donnees selon chaque schema
4. **Afficher** chaque widget avec `widget_display`
5. **Positionner** les widgets sur le canvas avec `canvas`

### Exemple : dashboard economique

Quatre widgets combines pour un apercu economique d'un pays.

**Widget 1 -- Indicateur principal :**

```json
{
  "name": "autoui_webmcp_widget_display",
  "arguments": {
    "recipe": "stat",
    "data": {
      "label": "PIB France 2024",
      "value": "2.78T EUR",
      "trend": "+0.9%"
    }
  }
}
```

**Widget 2 -- Evolution trimestrielle :**

```json
{
  "name": "autoui_webmcp_widget_display",
  "arguments": {
    "recipe": "chart",
    "data": {
      "type": "line",
      "labels": ["T1", "T2", "T3", "T4"],
      "datasets": [
        { "label": "Croissance (%)", "data": [0.7, 0.9, 1.1, 0.9] }
      ]
    }
  }
}
```

**Widget 3 -- Comparatif par pays :**

```json
{
  "name": "autoui_webmcp_widget_display",
  "arguments": {
    "recipe": "data-table",
    "data": {
      "columns": ["Pays", "PIB (T EUR)", "Croissance", "Chomage"],
      "rows": [
        ["France", "2.78", "+0.9%", "7.4%"],
        ["Allemagne", "3.86", "+0.3%", "5.7%"],
        ["Italie", "1.95", "+0.7%", "7.8%"],
        ["Espagne", "1.40", "+2.1%", "11.7%"]
      ]
    }
  }
}
```

**Widget 4 -- Repartition sectorielle :**

```json
{
  "name": "autoui_webmcp_widget_display",
  "arguments": {
    "recipe": "chart",
    "data": {
      "type": "pie",
      "labels": ["Services", "Industrie", "Agriculture", "Construction"],
      "datasets": [
        { "label": "Part du PIB", "data": [70.2, 16.8, 3.4, 9.6] }
      ]
    }
  }
}
```

Apres affichage, positionnez les widgets en grille :

```json
{"name": "autoui_webmcp_canvas", "arguments": {"action": "move", "id": "w_stat1", "params": {"x": 0, "y": 0}}}
{"name": "autoui_webmcp_canvas", "arguments": {"action": "move", "id": "w_chart1", "params": {"x": 400, "y": 0}}}
{"name": "autoui_webmcp_canvas", "arguments": {"action": "move", "id": "w_table1", "params": {"x": 0, "y": 300}}}
{"name": "autoui_webmcp_canvas", "arguments": {"action": "move", "id": "w_chart2", "params": {"x": 400, "y": 300}}}
```

---

## Recapitulatif du flow

```
search_recipes  -->  get_recipe  -->  widget_display  -->  canvas
(decouvrir)          (comprendre)     (afficher)           (positionner)
```

1. **search_recipes** : trouver les widgets par nom ou mot-cle
2. **get_recipe** : lire le schema et les exemples d'un widget
3. **widget_display** : creer le widget avec les donnees preparees
4. **canvas** : deplacer, redimensionner ou supprimer les widgets sur le canvas

Chaque `widget_display` retourne un identifiant (`id`) que vous utilisez ensuite dans les appels `canvas`.
