---
name: hn-stats-dashboard
description: Aggregate Hacker News front page data into stat cards and charts showing score distribution, top domains, and posting frequency.
data_type: chart
tools_used:
  - get-front-page
---

## Quand utiliser

- L'utilisateur demande des statistiques, tendances ou analyses sur les stories HN
- Le besoin est d'agreger les donnees (moyennes, distributions, top N) plutot que de lister des stories individuelles
- L'outil `get-front-page` retourne un tableau de stories avec `{id, title, url, score, by, time, descendants, type}` — les champs `score`, `descendants`, `time` et `url` sont les sources d'agregation

## Pipeline

### Step 1 — Appeler get-front-page

```
Tool: get-front-page
Args: {}
```

Retourne un tableau de stories. Chaque story contient les champs necessaires pour l'agregation :
- `score` — pour le score moyen et la distribution
- `descendants` — pour le total de commentaires
- `url` — pour extraire les domaines
- `time` — pour la frequence de publication par heure

### Step 2 — Agreger les metriques globales

A partir du tableau de stories, calculer :

| Metrique | Calcul |
|----------|--------|
| Score moyen | `sum(story.score) / stories.length` |
| Total commentaires | `sum(story.descendants)` |
| Nombre de stories | `stories.length` |
| Top domaine | Domaine le plus frequent extrait de `story.url` |

### Step 3 — Afficher les stat-cards

```
autoui_webmcp_widget_display({
  name: "stat-card",
  params: {
    label: "Score moyen",
    value: 187,
    trend: "up"
  }
})
```

```
autoui_webmcp_widget_display({
  name: "stat-card",
  params: {
    label: "Total commentaires",
    value: 2847,
    trend: "up"
  }
})
```

```
autoui_webmcp_widget_display({
  name: "stat-card",
  params: {
    label: "Stories en front page",
    value: 30,
    trend: "neutral"
  }
})
```

### Step 4 — Construire les donnees de charts

**Score distribution** — regrouper les scores en buckets :

```json
[
  { "bucket": "0-50", "count": 5 },
  { "bucket": "50-100", "count": 8 },
  { "bucket": "100-200", "count": 10 },
  { "bucket": "200-500", "count": 5 },
  { "bucket": "500+", "count": 2 }
]
```

**Top domaines** — extraire le hostname de chaque `story.url`, compter les occurrences :

```json
[
  { "domain": "github.com", "count": 7 },
  { "domain": "arxiv.org", "count": 4 },
  { "domain": "blog.example.com", "count": 3 },
  { "domain": "nytimes.com", "count": 2 },
  { "domain": "other", "count": 14 }
]
```

**Frequence de publication** — convertir `story.time` (Unix) en heure, compter par tranche horaire :

```json
[
  { "hour": "00:00", "count": 1 },
  { "hour": "02:00", "count": 0 },
  { "hour": "08:00", "count": 5 },
  { "hour": "12:00", "count": 8 },
  { "hour": "18:00", "count": 6 }
]
```

### Step 5 — Afficher les charts

**Score distribution (bar chart)** :

```
autoui_webmcp_widget_display({
  name: "chart-rich",
  params: {
    chart_type: "bar",
    title: "Score distribution",
    x_axis: { label: "Score range", key: "bucket" },
    y_axis: { label: "Number of stories", key: "count" },
    data: [
      { bucket: "0-50", count: 5 },
      { bucket: "50-100", count: 8 },
      { bucket: "100-200", count: 10 },
      { bucket: "200-500", count: 5 },
      { bucket: "500+", count: 2 }
    ]
  }
})
```

**Top domaines (bar chart horizontal)** :

```
autoui_webmcp_widget_display({
  name: "chart-rich",
  params: {
    chart_type: "bar",
    title: "Top domains",
    x_axis: { label: "Domain", key: "domain" },
    y_axis: { label: "Stories", key: "count" },
    data: [
      { domain: "github.com", count: 7 },
      { domain: "arxiv.org", count: 4 },
      { domain: "blog.example.com", count: 3 },
      { domain: "nytimes.com", count: 2 },
      { domain: "other", count: 14 }
    ]
  }
})
```

**Frequence de publication (line chart)** :

```
autoui_webmcp_widget_display({
  name: "chart-rich",
  params: {
    chart_type: "line",
    title: "Posting frequency by hour",
    x_axis: { label: "Hour (UTC)", key: "hour" },
    y_axis: { label: "Stories posted", key: "count" },
    data: [
      { hour: "00:00", count: 1 },
      { hour: "02:00", count: 0 },
      { hour: "04:00", count: 1 },
      { hour: "06:00", count: 2 },
      { hour: "08:00", count: 5 },
      { hour: "10:00", count: 7 },
      { hour: "12:00", count: 8 },
      { hour: "14:00", count: 4 },
      { hour: "16:00", count: 6 },
      { hour: "18:00", count: 6 },
      { hour: "20:00", count: 3 },
      { hour: "22:00", count: 2 }
    ]
  }
})
```

## Exemple complet

L'utilisateur demande : "Show me stats about today's Hacker News front page."

1. L'agent appelle `get-front-page` avec `{}`
2. L'outil retourne 30 stories
3. L'agent calcule les metriques :
   - Score moyen : `sum(scores) / 30` = 187
   - Total commentaires : `sum(descendants)` = 2847
   - Top domaine : github.com (7 occurrences)
4. L'agent affiche 3 stat-cards :

```
autoui_webmcp_widget_display({
  name: "stat-card",
  params: { label: "Score moyen", value: 187, trend: "up" }
})

autoui_webmcp_widget_display({
  name: "stat-card",
  params: { label: "Total commentaires", value: 2847, trend: "up" }
})

autoui_webmcp_widget_display({
  name: "stat-card",
  params: { label: "Stories", value: 30, trend: "neutral" }
})
```

5. L'agent agrege les scores en buckets, extrait les domaines, et calcule la frequence horaire
6. L'agent affiche 3 charts :

```
autoui_webmcp_widget_display({
  name: "chart-rich",
  params: {
    chart_type: "bar",
    title: "Score distribution",
    x_axis: { label: "Score range", key: "bucket" },
    y_axis: { label: "Stories", key: "count" },
    data: [
      { bucket: "0-50", count: 5 },
      { bucket: "50-100", count: 8 },
      { bucket: "100-200", count: 10 },
      { bucket: "200-500", count: 5 },
      { bucket: "500+", count: 2 }
    ]
  }
})

autoui_webmcp_widget_display({
  name: "chart-rich",
  params: {
    chart_type: "bar",
    title: "Top domains",
    x_axis: { label: "Domain", key: "domain" },
    y_axis: { label: "Stories", key: "count" },
    data: [
      { domain: "github.com", count: 7 },
      { domain: "arxiv.org", count: 4 },
      { domain: "blog.example.com", count: 3 },
      { domain: "nytimes.com", count: 2 },
      { domain: "other", count: 14 }
    ]
  }
})

autoui_webmcp_widget_display({
  name: "chart-rich",
  params: {
    chart_type: "line",
    title: "Posting frequency by hour",
    x_axis: { label: "Hour (UTC)", key: "hour" },
    y_axis: { label: "Stories posted", key: "count" },
    data: [
      { hour: "00:00", count: 1 },
      { hour: "02:00", count: 0 },
      { hour: "04:00", count: 1 },
      { hour: "06:00", count: 2 },
      { hour: "08:00", count: 5 },
      { hour: "10:00", count: 7 },
      { hour: "12:00", count: 8 },
      { hour: "14:00", count: 4 },
      { hour: "16:00", count: 6 },
      { hour: "18:00", count: 6 },
      { hour: "20:00", count: 3 },
      { hour: "22:00", count: 2 }
    ]
  }
})
```

## Erreurs courantes

- **Ne pas agreger avant d'afficher** : envoyer les 30 stories brutes a un chart ne produit rien d'utile. Toujours calculer les buckets/groupes cote agent avant le widget_display.
- **Oublier les stories sans URL** : les Ask HN et Show HN texte n'ont pas de `url`. Les exclure du calcul "top domaines" ou les regrouper dans un bucket "self (news.ycombinator.com)".
- **Oublier `descendants` null** : certaines stories fraichement postees ont `descendants: null` ou absent. Fallback a `0` pour le calcul du total commentaires.
- **Timezone du champ `time`** : le timestamp Unix est en UTC. Preciser "Hour (UTC)" dans les labels du chart de frequence pour eviter toute confusion.
- **Trop de domaines** : limiter a 5-7 top domaines et regrouper le reste dans "other" pour un chart lisible.
