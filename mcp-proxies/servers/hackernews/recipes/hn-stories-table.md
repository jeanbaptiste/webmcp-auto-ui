---
name: hn-stories-table
description: Display Hacker News stories as a sortable table with title, score, author, comment count, and URL columns.
data_type: table
tools_used:
  - get-front-page
  - get-latest-posts
  - search-posts
---

## Quand utiliser

- L'utilisateur demande la front page HN, les derniers posts, ou une recherche de posts
- Le résultat attendu est une liste de stories à parcourir, trier, ou filtrer
- Les outils `get-front-page`, `get-latest-posts` et `search-posts` retournent tous un tableau de stories avec la même shape : `{id, title, url, score, by, time, descendants, type}`

## Pipeline

### Step 1 — Appeler l'outil approprié

Selon la demande de l'utilisateur :

```
Tool: get-front-page
Args: {}
```

ou

```
Tool: get-latest-posts
Args: {}
```

ou

```
Tool: search-posts
Args: { "query": "<terme de recherche>" }
```

Chaque outil retourne un tableau d'objets story :

```json
[
  {
    "id": 12345678,
    "title": "Show HN: New open-source project",
    "url": "https://example.com/project",
    "score": 342,
    "by": "pg",
    "time": 1712900000,
    "descendants": 128,
    "type": "story"
  }
]
```

### Step 2 — Transformer en colonnes et lignes

Extraire les champs pertinents de chaque story pour construire les colonnes du tableau :

| Colonne | Champ source | Transformation |
|---------|-------------|----------------|
| Title | `title` | Tel quel |
| Score | `score` | Tel quel (nombre) |
| Author | `by` | Tel quel |
| Comments | `descendants` | Tel quel (nombre, 0 si absent) |
| URL | `url` | Domaine extrait ou URL complète |

### Step 3 — Afficher avec le widget data-table

```
autoui_webmcp_widget_display({
  name: "data-table",
  params: {
    columns: [
      { key: "title", label: "Title", sortable: true },
      { key: "score", label: "Score", sortable: true },
      { key: "by", label: "Author", sortable: true },
      { key: "descendants", label: "Comments", sortable: true },
      { key: "url", label: "URL", sortable: false }
    ],
    rows: [
      { title: "Show HN: New open-source project", score: 342, by: "pg", descendants: 128, url: "https://example.com/project" },
      { title: "Why Rust is taking over systems programming", score: 287, by: "dang", descendants: 95, url: "https://example.com/rust" }
    ]
  }
})
```

## Exemple complet

L'utilisateur demande : "Show me today's Hacker News front page as a sortable table."

1. L'agent appelle `get-front-page` avec `{}`
2. L'outil retourne un tableau de 30 stories
3. L'agent mappe chaque story vers une ligne avec les champs `title`, `score`, `by`, `descendants`, `url`
4. L'agent appelle :

```
autoui_webmcp_widget_display({
  name: "data-table",
  params: {
    columns: [
      { key: "title", label: "Title", sortable: true },
      { key: "score", label: "Score", sortable: true },
      { key: "by", label: "Author", sortable: true },
      { key: "descendants", label: "Comments", sortable: true },
      { key: "url", label: "URL", sortable: false }
    ],
    rows: [
      { title: "Show HN: New open-source project", score: 342, by: "pg", descendants: 128, url: "https://example.com/project" },
      { title: "Why Rust is taking over systems programming", score: 287, by: "dang", descendants: 95, url: "https://blog.example.com/rust" },
      { title: "Launch HN: AI code review tool", score: 215, by: "tptacek", descendants: 67, url: "https://example.dev/launch" }
    ]
  }
})
```

Le tri par défaut est par `score` décroissant. L'utilisateur peut cliquer sur n'importe quelle colonne triable pour re-trier.

## Erreurs courantes

- **Oublier `descendants`** : le champ `descendants` contient le nombre de commentaires. Il peut etre `null` ou absent sur les stories sans commentaires — toujours fallback a `0`.
- **Confondre `time` et un timestamp lisible** : le champ `time` est un timestamp Unix (secondes). Si on veut afficher l'age, il faut le convertir en "3h ago" cote agent avant de l'envoyer au widget.
- **URL vide sur les Ask HN / Show HN** : certaines stories n'ont pas de `url` (posts texte). Afficher le lien HN `https://news.ycombinator.com/item?id={id}` comme fallback.
- **Trop de colonnes** : ne pas inclure `id`, `type`, ou `time` brut dans le tableau — ces champs ne sont pas utiles a l'utilisateur final.
