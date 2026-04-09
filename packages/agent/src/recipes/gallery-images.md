---
id: gallery-images
name: Galerie d'images
components_used: [gallery, carousel]
when: donnees contenant des URLs d'images (jpg, png, webp, svg)
servers: [nasa, metmuseum, inaturalist]
layout:
  type: grid
  columns: 1
interactions:
  - source: gallery, target: lightbox, event: click, action: zoom
---

## Quand utiliser
Les donnees MCP contiennent des champs `url`, `src`, `hdurl`, `primaryImage`, `image_url` ou similaire pointant vers des images.

## Comment
1. Extraire les URLs reelles depuis les resultats MCP — **JAMAIS inventer d'URLs**
2. Appeler `component("gallery", {images: [{src: url_reelle, alt: titre}]})`
3. Si >5 images, preferer `component("carousel", {images: [...]})`
4. Toujours inclure un `alt` descriptif pour chaque image

## Exemples

### NASA APOD
`nasa_apod` retourne `{hdurl: "https://apod.nasa.gov/...", title: "..."}` :
→ `component("gallery", {images: [{src: item.hdurl, alt: item.title}]})`

### Met Museum
`search_objects` retourne des IDs, puis `get_object` retourne `{primaryImage: "...", title: "..."}` :
→ Boucler sur les objets, extraire primaryImage
→ `component("gallery", {images: [{src: obj.primaryImage, alt: obj.title}]})`

### iNaturalist
`search_observations` retourne `{photos: [{url: "..."}], species_guess: "..."}` :
→ `component("gallery", {images: [{src: photo.url, alt: obs.species_guess}]})`

## Erreurs courantes
- Inventer des URLs placeholder (`https://example.com/image.jpg`) — INTERDIT
- Oublier de verifier que l'URL existe dans les donnees retournees
- Utiliser render_text pour afficher des URLs au lieu de render_gallery
