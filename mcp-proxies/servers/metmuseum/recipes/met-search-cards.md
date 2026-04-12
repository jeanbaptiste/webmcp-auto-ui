---
name: met-search-cards
description: Recherche d'oeuvres du Met affichees en cartes detail
tools_used:
  - search-museum-objects
  - get-museum-object
widget: cards
data_type: cards
---

## Quand utiliser

Quand l'utilisateur veut des informations detaillees sur des oeuvres sous forme de fiches : "donne-moi des infos sur les armures japonaises au Met", "find Greek sculptures with details", "cherche des oeuvres de Rembrandt et montre les details".

Les cartes affichent le titre, l'artiste, la date, le medium, le departement et une vignette. Ce recipe convient quand l'utilisateur veut lire des metadonnees, pas juste voir des images.

## Pipeline

1. **Recherche** -- appeler `search-museum-objects` avec la requete utilisateur
   ```
   Tool: search-museum-objects
   Args: { "query": "Rembrandt portrait" }
   Result: { "total": 512, "objectIDs": [437394, 437397, 437399, ...] }
   ```

2. **Selection** -- prendre les 5-10 premiers `objectIDs`

3. **Detail par objet** -- appeler `get-museum-object` pour chaque ID
   ```
   Tool: get-museum-object
   Args: { "objectID": 437394 }
   Result: {
     "objectID": 437394,
     "title": "Self-Portrait",
     "artistDisplayName": "Rembrandt (Rembrandt van Rijn)",
     "objectDate": "1660",
     "primaryImage": "https://images.metmuseum.org/CRDImages/ep/original/...",
     "primaryImageSmall": "https://images.metmuseum.org/CRDImages/ep/web-large/...",
     "medium": "Oil on canvas",
     "department": "European Paintings",
     "culture": "Dutch",
     "objectURL": "https://www.metmuseum.org/art/collection/search/437394"
   }
   ```

4. **Affichage** -- construire les cartes avec les details de chaque objet
   ```
   autoui_webmcp_widget_display({name: "cards", params: {
     cards: [
       {
         title: "Self-Portrait",
         description: "Rembrandt (Rembrandt van Rijn), 1660\nOil on canvas\nEuropean Paintings | Dutch",
         image: "<primaryImageSmall retourne par get-museum-object>",
         link: "https://www.metmuseum.org/art/collection/search/437394"
       },
       {
         title: "Portrait of a Man",
         description: "Rembrandt (Rembrandt van Rijn), ca. 1655-60\nOil on canvas\nEuropean Paintings | Dutch",
         image: "<primaryImageSmall retourne par get-museum-object>",
         link: "https://www.metmuseum.org/art/collection/search/437397"
       }
     ]
   }})
   ```

## Exemple complet

**Prompt utilisateur :** "Cherche des sculptures grecques au Met et montre-les en cartes"

**Appels outils :**

```
Tool: search-museum-objects
Args: { "query": "Greek sculpture marble" }
-> { "total": 1243, "objectIDs": [248873, 248132, 253371, ...] }

Tool: get-museum-object
Args: { "objectID": 248873 }
-> { "title": "Marble head of a woman", "artistDisplayName": "", "objectDate": "2nd century A.D.", "primaryImageSmall": "https://images.metmuseum.org/...", "medium": "Marble", "department": "Greek and Roman Art", "culture": "Roman", "objectURL": "https://www.metmuseum.org/art/collection/search/248873" }

Tool: get-museum-object
Args: { "objectID": 248132 }
-> { "title": "Marble statue of Aphrodite", "artistDisplayName": "", "objectDate": "1st-2nd century A.D.", "primaryImageSmall": "https://images.metmuseum.org/...", "medium": "Marble", "department": "Greek and Roman Art", "culture": "Roman", "objectURL": "https://www.metmuseum.org/art/collection/search/248132" }

... (repeter pour chaque ID)
```

**Widget final :**

```
autoui_webmcp_widget_display({name: "cards", params: {
  cards: [
    {
      title: "Marble head of a woman",
      description: "2nd century A.D.\nMarble\nGreek and Roman Art | Roman",
      image: "<primaryImageSmall retourne par get-museum-object>",
      link: "https://www.metmuseum.org/art/collection/search/248873"
    },
    {
      title: "Marble statue of Aphrodite",
      description: "1st-2nd century A.D.\nMarble\nGreek and Roman Art | Roman",
      image: "<primaryImageSmall retourne par get-museum-object>",
      link: "https://www.metmuseum.org/art/collection/search/248132"
    }
  ]
}})
```

## Erreurs courantes

- **Utiliser les objectIDs comme donnees de carte** -- `search-museum-objects` retourne uniquement `{total, objectIDs[]}`. Les metadonnees (titre, artiste, image) ne sont disponibles qu'apres `get-museum-object`.
- **Utiliser `primaryImage` au lieu de `primaryImageSmall` pour les vignettes** -- les images haute resolution (`primaryImage`) sont lourdes. Pour les cartes, preferer `primaryImageSmall` qui est optimise pour l'affichage en miniature.
- **Ignorer `artistDisplayName` vide** -- beaucoup d'objets antiques n'ont pas d'artiste connu. Ne pas afficher "Unknown" ou inventer un nom ; adapter la description en consequence.
- **Inventer des URLs d'images ou de liens** -- ne jamais construire d'URL. Utiliser uniquement `primaryImageSmall` et `objectURL` retournes par `get-museum-object`.
- **Fetcher trop d'objets** -- se limiter a 5-10 objets pour les cartes (plus lourd en donnees qu'une galerie d'images).
