# iNaturalist Examples

## Meta-recipe: Local Biodiversity

Search for raptor observations within 50km of Paris, display photos in a gallery, then plot observations on a map.

### Step 1 -- Search raptor observations near Paris

User prompt:
> Show me recent raptor observations near Paris

Expected tool call:
```json
{
  "tool": "search_observations",
  "arguments": {
    "taxon_name": "Accipitriformes",
    "lat": 48.8566,
    "lng": 2.3522,
    "radius": 50,
    "quality_grade": "research",
    "per_page": 30
  }
}
```

The agent receives an array of observations, each with photos, species identification, and geolocation.

### Step 2 -- Display as photo gallery

The agent uses the `inat-species-gallery` recipe pattern to render observations as image cards. Each card shows:
- The observation photo (URL upgraded from `square` to `medium`)
- Species name (common + scientific)
- Date observed
- Location name
- Quality grade badge

### Step 3 -- Plot on a map

The agent uses the `inat-observations-map` recipe pattern to plot each observation on a Leaflet map using its `location` field (lat,lng). Markers are colored by species, with popups showing the species name, date, and a thumbnail.

### Combined prompt

> Search for birds of prey observed within 50km of Paris in the last month. Show me a photo gallery of the results, then place them on a map so I can see where they were spotted.

This triggers both recipes in sequence: gallery rendering followed by map rendering, using the same observation dataset.
