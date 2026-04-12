---
name: met-artwork-gallery
description: Galerie d'images d'oeuvres du Met Museum
tools_used:
  - search-museum-objects
  - get-museum-object
widget: gallery
data_type: images
---

## Quand utiliser

Quand l'utilisateur demande a voir des oeuvres d'art sous forme de galerie d'images : "montre-moi des tableaux impressionnistes", "gallery of Egyptian art", "show me Monet paintings".

La galerie affiche les images haute resolution (`primaryImage`) avec le titre et l'artiste. Ce recipe convient pour les requetes visuelles ou l'utilisateur veut parcourir des oeuvres.

## Pipeline

`search-museum-objects` retourne uniquement des IDs, pas les images. Il faut un second appel par objet.

1. **Recherche** -- appeler `search-museum-objects` avec la requete utilisateur
   ```
   Tool: search-museum-objects
   Args: { "query": "impressionism painting" }
   Result: { "total": 2847, "objectIDs": [437133, 436965, 438722, ...] }
   ```

2. **Selection** -- prendre les 10-15 premiers `objectIDs` (pas tous, la liste peut contenir des milliers d'IDs)

3. **Detail par objet** -- appeler `get-museum-object` pour chaque ID selectionne
   ```
   Tool: get-museum-object
   Args: { "objectID": 437133 }
   Result: {
     "objectID": 437133,
     "title": "Water Lilies",
     "artistDisplayName": "Claude Monet",
     "objectDate": "1906",
     "primaryImage": "https://images.metmuseum.org/CRDImages/ep/original/...",
     "primaryImageSmall": "https://images.metmuseum.org/CRDImages/ep/web-large/...",
     "medium": "Oil on canvas",
     "department": "European Paintings",
     "culture": "",
     "objectURL": "https://www.metmuseum.org/art/collection/search/437133"
   }
   ```

4. **Filtrage** -- ignorer les objets dont `primaryImage` est vide (pas d'image disponible)

5. **Affichage** -- construire la galerie avec les objets restants
   ```
   autoui_webmcp_widget_display({name: "gallery", params: {
     images: [
       {
         src: "<primaryImage de l'objet>",
         alt: "Water Lilies -- Claude Monet, 1906",
         caption: "Water Lilies -- Claude Monet, 1906"
       },
       {
         src: "<primaryImage de l'objet>",
         alt: "A Woman with a Dog -- Pierre-Auguste Renoir, 1876",
         caption: "A Woman with a Dog -- Pierre-Auguste Renoir, 1876"
       }
     ]
   }})
   ```

## Exemple complet

**Prompt utilisateur :** "Montre-moi une galerie de peintures de Vermeer"

**Appels outils :**

```
Tool: search-museum-objects
Args: { "query": "Vermeer painting" }
-> { "total": 38, "objectIDs": [437879, 437880, 437881, ...] }

Tool: get-museum-object
Args: { "objectID": 437879 }
-> { "title": "Young Woman with a Water Pitcher", "artistDisplayName": "Johannes Vermeer", "primaryImage": "https://images.metmuseum.org/...", ... }

Tool: get-museum-object
Args: { "objectID": 437880 }
-> { "title": "Allegory of the Catholic Faith", "artistDisplayName": "Johannes Vermeer", "primaryImage": "https://images.metmuseum.org/...", ... }

... (repeter pour chaque ID)
```

**Widget final :**

```
autoui_webmcp_widget_display({name: "gallery", params: {
  images: [
    {
      src: "<primaryImage retourne par get-museum-object>",
      alt: "Young Woman with a Water Pitcher -- Johannes Vermeer",
      caption: "Young Woman with a Water Pitcher -- Johannes Vermeer, ca. 1662"
    },
    {
      src: "<primaryImage retourne par get-museum-object>",
      alt: "Allegory of the Catholic Faith -- Johannes Vermeer",
      caption: "Allegory of the Catholic Faith -- Johannes Vermeer, ca. 1670-72"
    }
  ]
}})
```

## Erreurs courantes

- **Utiliser les objectIDs comme images** -- `search-museum-objects` retourne uniquement des IDs numeriques, pas des URLs d'images. Il faut obligatoirement appeler `get-museum-object` pour chaque ID afin d'obtenir `primaryImage`.
- **Fetcher tous les IDs** -- la recherche peut retourner des milliers d'IDs. Se limiter aux 10-15 premiers.
- **Ignorer les objets sans image** -- certains objets n'ont pas de `primaryImage` (champ vide). Les inclure dans la galerie produit des images cassees.
- **Inventer des URLs d'images** -- ne jamais construire ou deviner une URL. Utiliser uniquement la valeur exacte de `primaryImage` ou `primaryImageSmall` retournee par `get-museum-object`.
