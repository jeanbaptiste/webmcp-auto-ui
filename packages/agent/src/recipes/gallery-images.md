---
id: afficher-galerie-images-depuis-urls-mcp
name: Afficher une galerie d'images a partir d'URLs retournees par un serveur MCP
components_used: [gallery, carousel, cards]
when: les donnees MCP contiennent des champs URL pointant vers des images (jpg, png, webp, svg) comme hdurl, primaryImage, image_url, photos[].url, ou tout champ similaire
servers: [nasa, metmuseum, inaturalist]
layout:
  type: grid
  columns: 1
interactions:
  - source: gallery, target: lightbox, event: click, action: zoom
---

## Quand utiliser

Les resultats d'un appel MCP contiennent des URLs d'images reelles. Cela inclut :
- **NASA** : champ `hdurl` ou `url` dans les reponses APOD, Earth, Mars Rover Photos
- **Met Museum** : champ `primaryImage` ou `primaryImageSmall` apres `get_object`
- **iNaturalist** : champ `photos[].url` dans les observations

La recette s'applique des qu'au moins 2 images sont disponibles dans les donnees. Pour une seule image, preferer un composant `card` avec l'image en en-tete.

## Comment

1. **Appeler l'outil DATA** du serveur MCP pour recuperer les donnees contenant les images
2. **Extraire les URLs reelles** depuis les resultats — ne JAMAIS inventer d'URLs placeholder
3. **Verifier que les URLs sont valides** : elles doivent pointer vers des domaines connus (apod.nasa.gov, images.metmuseum.org, inaturalist-open-data.s3.amazonaws.com, etc.)
4. **Choisir le composant** :
   - 2-5 images : `component("gallery", {images: [{src, alt, caption?}]})`
   - 6+ images : `component("carousel", {images: [{src, alt}]})` pour eviter une page trop longue
   - Images avec metadonnees riches : `component("cards", {items: [{title, image, subtitle, body}]})`
5. **Toujours fournir un `alt` descriptif** pour chaque image (titre de l'oeuvre, nom de l'espece, titre APOD)
6. **Ajouter un titre contextuel** avant la galerie avec `component("text", {content: "..."})`

## Exemples

### NASA APOD (Astronomy Picture of the Day)
Outil : `nasa_apod` ou `nasa_apod_range`
Reponse type : `{hdurl: "https://apod.nasa.gov/apod/image/2401/...", title: "Horsehead Nebula", explanation: "..."}`

```
component("gallery", {
  images: results.map(item => ({
    src: item.hdurl || item.url,
    alt: item.title,
    caption: item.date + " — " + item.explanation.slice(0, 120) + "..."
  }))
})
```

### Met Museum — Recherche d'oeuvres
Etape 1 : `search_objects({query: "impressionism sunflower"})` → liste d'IDs
Etape 2 : pour chaque ID, `get_object({objectID: id})` → `{primaryImage, title, artistDisplayName}`

```
component("gallery", {
  images: objects.map(obj => ({
    src: obj.primaryImageSmall,
    alt: obj.title + " — " + obj.artistDisplayName,
    caption: obj.objectDate
  }))
})
```

### iNaturalist — Observations avec photos
Outil : `search_observations({taxon_name: "Parus major", lat: 48.85, lng: 2.35, radius: 10})`
Reponse type : `{photos: [{url: "..."}], species_guess: "Mesange charbonniere", place_guess: "Paris"}`

```
component("gallery", {
  images: observations.flatMap(obs =>
    obs.photos.map(p => ({
      src: p.url.replace("square", "medium"),
      alt: obs.species_guess,
      caption: obs.place_guess + " — " + obs.observed_on
    }))
  )
})
```

## Erreurs courantes

- **Inventer des URLs placeholder** (`https://example.com/image.jpg`, `via.placeholder.com`, `placehold.co`, `dummyimage.com`, `?text=...`) — strictement INTERDIT. Si aucune image réelle n'est retournée par l'API, ne PAS afficher de galerie.
- **Oublier de verifier** que le champ image existe dans les donnees retournees (certains objets Met Museum n'ont pas de `primaryImage`)
- **Utiliser `text` pour afficher des URLs** au lieu de `gallery` — les images doivent etre rendues visuellement
- **Ne pas adapter la taille** : iNaturalist retourne des thumbnails "square" par defaut, remplacer par "medium" ou "large" dans l'URL
