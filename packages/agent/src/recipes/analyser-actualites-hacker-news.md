---
id: analyser-actualites-hacker-news
name: Analyser les actualites et tendances Hacker News en tableau et graphiques
components_used: [table, chart, stat-card, cards]
when: l'utilisateur demande les actualites tech, les tendances Hacker News, les top stories, ou une analyse des discussions et commentaires HN
servers: [hackernews]
layout:
  type: grid
  columns: 2
  arrangement: stats en ligne, table pleine largeur, chart en bas
---

## Quand utiliser

L'utilisateur s'interesse aux actualites technologiques ou aux tendances de la communaute Hacker News :
- "Quelles sont les top stories Hacker News ?"
- "Montre-moi les posts les plus commentes aujourd'hui"
- "Les tendances tech de la semaine sur HN"
- "Analyse les Ask HN recents"
- "Quels sujets dominent Hacker News en ce moment ?"

Le serveur Hacker News donne acces aux stories, commentaires, classements et metadonnees de posts.

## Comment

1. **Recuperer les top stories** :
   ```
   get_top_stories({limit: 30})
   ```
   Retourne les IDs des stories les plus populaires.

2. **Recuperer les details** de chaque story :
   ```
   get_item({id: storyId})
   ```
   Retourne : `title`, `url`, `score`, `by` (auteur), `descendants` (nb commentaires), `time`, `type`.

3. **Afficher les KPIs** en stat-cards :
   ```
   component("stat-card", {label: "Top Stories", value: "30", icon: "newspaper"})
   component("stat-card", {label: "Score moyen", value: Math.round(avgScore), icon: "trending-up"})
   component("stat-card", {label: "Commentaires moyen", value: Math.round(avgComments), icon: "message-circle"})
   component("stat-card", {label: "Score max", value: maxScore + " pts", icon: "award"})
   ```

4. **Tableau des stories** trie par score :
   ```
   component("table", {
     columns: ["#", "Titre", "Score", "Commentaires", "Auteur"],
     rows: stories.sort((a, b) => b.score - a.score).map((s, i) => [
       i + 1, s.title, s.score, s.descendants, s.by
     ])
   })
   ```

5. **Graphique de distribution** des scores :
   ```
   component("chart", {
     type: "bar",
     labels: stories.map(s => s.title.slice(0, 30) + "..."),
     datasets: [{label: "Score", data: stories.map(s => s.score)}]
   })
   ```

6. **Cards pour les stories vedettes** (top 5) :
   ```
   component("cards", {
     items: top5.map(s => ({
       title: s.title,
       subtitle: s.by + " — " + s.score + " points",
       body: s.descendants + " commentaires | " + new Date(s.time * 1000).toLocaleDateString(),
       url: s.url
     }))
   })
   ```

## Exemples

### Top 10 stories du moment
```
// 1. Recuperer
get_top_stories({limit: 10})
// Pour chaque ID: get_item({id})

// 2. Rendu
component("stat-card", {label: "Score total", value: totalScore, icon: "zap"})
component("stat-card", {label: "Commentaires total", value: totalComments, icon: "message-circle"})
component("table", {
  columns: ["Rang", "Titre", "Score", "Commentaires", "Auteur", "Age"],
  rows: rankedStories
})
component("cards", {items: top3Stories})
```

### Analyse Ask HN
```
// 1. Rechercher les Ask HN recents
get_ask_stories({limit: 20})

// 2. Rendu
component("stat-card", {label: "Ask HN recents", value: "20", icon: "help-circle"})
component("stat-card", {label: "Reponses moyennes", value: avgReplies, icon: "message-circle"})
component("table", {columns: ["Titre", "Reponses", "Score", "Auteur"], rows: askStories})
component("chart", {type: "bar", labels: titles, datasets: [{label: "Reponses", data: replyCounts}]})
```

### Tendances par domaine
```
// 1. Recuperer top stories et extraire les domaines des URLs
get_top_stories({limit: 50})

// 2. Grouper par domaine
const domains = groupBy(stories, s => new URL(s.url).hostname)

// 3. Rendu
component("stat-card", {label: "Domaines uniques", value: Object.keys(domains).length, icon: "globe"})
component("chart", {type: "bar", labels: topDomains.map(d => d.name), datasets: [{label: "Stories", data: topDomains.map(d => d.count)}]})
component("table", {columns: ["Domaine", "Stories", "Score total"], rows: domainStats})
```

## Erreurs courantes

- **Trop d'appels `get_item`** : chaque story necessite un appel individuel — limiter a 20-30 pour eviter la lenteur
- **Timestamps non convertis** : HN retourne des timestamps Unix — convertir en dates lisibles
- **Titres tronques dans les graphiques** : les titres HN sont longs — tronquer a 30-40 caracteres pour les labels de graphiques
- **Oublier les stories sans URL** : les "Ask HN", "Show HN" et "Tell HN" n'ont pas toujours d'URL externe — gerer ce cas
- **Ne pas distinguer les types** : HN a des stories, jobs, polls — filtrer par type si l'utilisateur demande un type specifique
