---
id: display-image-gallery-from-mcp-urls
name: Display an image gallery from URLs returned by an MCP server
components_used: [gallery, carousel, cards]
when: MCP data contains URL fields pointing to images (jpg, png, webp, svg) such as hdurl, primaryImage, image_url, photos[].url, or any similar field
servers: [nasa, metmuseum, inaturalist]
layout:
  type: grid
  columns: 1
interactions:
  - source: gallery, target: lightbox, event: click, action: zoom
---

## When to use

The results of an MCP call contain real image URLs. This includes:
- **NASA**: `hdurl` or `url` field in APOD, Earth, and Mars Rover Photos responses
- **Met Museum**: `primaryImage` or `primaryImageSmall` field after `get_object`
- **iNaturalist**: `photos[].url` field in observations

This recipe applies whenever at least 2 images are available in the data. For a single image, prefer a `card` component with the image as a header.

## How to use

1. **Call the DATA tool** from the MCP server to retrieve the data containing the images
2. **Extract the real URLs** from the results — NEVER invent placeholder URLs
3. **Verify that the URLs are valid**: they must point to known domains (apod.nasa.gov, images.metmuseum.org, inaturalist-open-data.s3.amazonaws.com, etc.)
4. **Choose the component**:
   - 2-5 images: `component("gallery", {images: [{src, alt, caption?}]})`
   - 6+ images: `component("carousel", {images: [{src, alt}]})` to avoid an overly long page
   - Images with rich metadata: `component("cards", {items: [{title, image, subtitle, body}]})`
5. **Always provide a descriptive `alt`** for each image (artwork title, species name, APOD title)
6. **Add a contextual title** before the gallery with `component("text", {content: "..."})`

## Examples

### NASA APOD (Astronomy Picture of the Day)
Tool: `nasa_apod` or `nasa_apod_range`
Typical response: `{hdurl: "https://apod.nasa.gov/apod/image/2401/...", title: "Horsehead Nebula", explanation: "..."}`

```
component("gallery", {
  images: results.map(item => ({
    src: item.hdurl || item.url,
    alt: item.title,
    caption: item.date + " — " + item.explanation.slice(0, 120) + "..."
  }))
})
```

### Met Museum — Artwork search
Step 1: `search_objects({query: "impressionism sunflower"})` → list of IDs
Step 2: for each ID, `get_object({objectID: id})` → `{primaryImage, title, artistDisplayName}`

```
component("gallery", {
  images: objects.map(obj => ({
    src: obj.primaryImageSmall,
    alt: obj.title + " — " + obj.artistDisplayName,
    caption: obj.objectDate
  }))
})
```

### iNaturalist — Observations with photos
Tool: `search_observations({taxon_name: "Parus major", lat: 48.85, lng: 2.35, radius: 10})`
Typical response: `{photos: [{url: "..."}], species_guess: "Mesange charbonniere", place_guess: "Paris"}`

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

## Common mistakes

- **Inventing placeholder URLs** (`https://example.com/image.jpg`, `via.placeholder.com`, `placehold.co`, `dummyimage.com`, `?text=...`) — strictly FORBIDDEN. If no real image is returned by the API, do NOT display a gallery.
- **Forgetting to check** that the image field exists in the returned data (some Met Museum objects have no `primaryImage`)
- **Using `text` to display URLs** instead of `gallery` — images must be rendered visually
- **Not adapting the size**: iNaturalist returns "square" thumbnails by default — replace with "medium" or "large" in the URL
