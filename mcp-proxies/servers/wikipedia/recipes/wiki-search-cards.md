---
name: wiki-search-cards
description: Affiche les resultats de recherche Wikipedia sous forme de cartes avec titre, extrait et tags
data_type: cards
tools_used:
  - search
---

## Quand utiliser

L'utilisateur demande de chercher sur Wikipedia, de trouver des articles sur un sujet, d'explorer un theme encyclopedique, ou de lister des pages Wikipedia pertinentes. Toute requete de recherche ou d'exploration thematique.

## Pipeline

1. Appeler `search({query: "termes de recherche", limit: N})` avec les termes de recherche. Le parametre `limit` controle le nombre de resultats (defaut raisonnable : 5 a 10).
2. Le resultat contient un tableau d'objets `{title, pageid, snippet, url}`. Le champ `snippet` est un extrait HTML avec des balises `<span class="searchmatch">` autour des termes correspondants.
3. Transformer chaque resultat en carte : `title` = titre de l'article, `description` = `snippet` nettoye des balises HTML, `tags` = extraire les mots-cles pertinents du snippet, `url` = lien vers l'article.
4. Afficher avec `autoui_webmcp_widget_display({name: "cards", params: {title: "Resultats Wikipedia : <query>", items: [...]}})`

## Exemple complet

### Requete utilisateur
> "Cherche des articles Wikipedia sur les trous noirs"

### Appel outil
```json
{"tool": "search", "arguments": {"query": "black holes", "limit": 5}}
```

### Resultat (extrait)
```json
[
  {
    "title": "Black hole",
    "pageid": 904,
    "snippet": "A <span class=\"searchmatch\">black</span> <span class=\"searchmatch\">hole</span> is a region of spacetime where gravity is so strong that nothing, not even light and other electromagnetic waves, has enough energy to escape it.",
    "url": "https://en.wikipedia.org/wiki/Black_hole"
  },
  {
    "title": "Supermassive black hole",
    "pageid": 329578,
    "snippet": "A supermassive <span class=\"searchmatch\">black</span> <span class=\"searchmatch\">hole</span> is the largest type of <span class=\"searchmatch\">black</span> <span class=\"searchmatch\">hole</span>, with its mass being on the order of millions to billions of times the mass of the Sun.",
    "url": "https://en.wikipedia.org/wiki/Supermassive_black_hole"
  }
]
```

### Affichage
```json
autoui_webmcp_widget_display({
  name: "cards",
  params: {
    title: "Resultats Wikipedia : black holes",
    items: [
      {
        title: "Black hole",
        description: "A black hole is a region of spacetime where gravity is so strong that nothing, not even light and other electromagnetic waves, has enough energy to escape it.",
        tags: ["spacetime", "gravity", "physics"],
        url: "https://en.wikipedia.org/wiki/Black_hole"
      },
      {
        title: "Supermassive black hole",
        description: "A supermassive black hole is the largest type of black hole, with its mass being on the order of millions to billions of times the mass of the Sun.",
        tags: ["astrophysics", "galaxy", "mass"],
        url: "https://en.wikipedia.org/wiki/Supermassive_black_hole"
      }
    ]
  }
})
```

## Erreurs courantes

- Ne JAMAIS inventer de resultats de recherche -- utiliser uniquement les donnees retournees par l'outil `search`
- Toujours nettoyer les balises HTML du champ `snippet` avant de l'afficher dans `description` (retirer `<span class="searchmatch">` et `</span>`)
- Les `tags` ne sont PAS retournes par l'API -- les deduire intelligemment du contenu du snippet et du titre, en restant factuel
- Ne pas depasser `limit: 20` -- au-dela, les resultats deviennent peu pertinents
- Si la recherche retourne un tableau vide, signaler a l'utilisateur qu'aucun article ne correspond et proposer des termes alternatifs
- Le champ `url` de chaque resultat doit etre inclus pour permettre la navigation vers l'article complet
