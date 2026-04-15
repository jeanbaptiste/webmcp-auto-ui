---
id: map-biodiversity-observations
name: Map biodiversity observations on a geographic area
components_used: [map, gallery, table, stat-card]
when: the user asks for a map of naturalist observations, the biodiversity of an area, the species present in a location, or iNaturalist observations in a region
servers: [inaturalist]
layout:
  type: grid
  columns: 2
  arrangement: full-width map at top, gallery + stats below
---

## When to use

The user asks a question about the biodiversity of a location or requests a map of observations:
- "What bird species are observed in Paris?"
- "Show me a map of butterfly observations in the Alps"
- "What is the biodiversity around Lake Annecy?"
- "Endangered species observed in Ile-de-France"

The iNaturalist server provides georeferenced observations with photos, taxa, dates, and observers.

## How to use

1. **Search for observations** in the target area:
   ```
   search_observations({lat: 48.85, lng: 2.35, radius: 10, taxon_name: "Aves", per_page: 50})
   ```
   Useful parameters:
   - `lat`, `lng`, `radius`: center and radius of the area in km
   - `taxon_name`: taxonomic filter ("Aves", "Lepidoptera", "Mammalia", etc.)
   - `quality_grade`: "research" for verified observations
   - `per_page`: number of results (max 200)

2. **Display the map** with observation markers:
   ```
   component("map", {
     center: [48.85, 2.35],
     zoom: 12,
     markers: observations.map(o => ({
       lat: o.latitude,
       lon: o.longitude,
       label: o.species_guess,
       popup: o.species_guess + " — " + o.observed_on
     }))
   })
   ```

3. **Area statistics** in stat-cards:
   ```
   component("stat-card", {label: "Observations", value: total_results, icon: "eye"})
   component("stat-card", {label: "Unique species", value: uniqueSpecies.length, icon: "leaf"})
   component("stat-card", {label: "Observers", value: uniqueObservers.length, icon: "users"})
   component("stat-card", {label: "Research grade", value: researchGradeCount, icon: "check-circle"})
   ```

4. **Species gallery with photos**:
   ```
   component("gallery", {
     images: observations
       .filter(o => o.photos?.length > 0)
       .map(o => ({
         src: o.photos[0].url.replace("square", "medium"),
         alt: o.species_guess,
         caption: o.place_guess + " — " + o.observed_on
       }))
   })
   ```

5. **Summary table** of species:
   ```
   component("table", {
     columns: ["Species", "Scientific name", "Observations", "Last obs."],
     rows: speciesSummary
   })
   ```

## Examples

### Birds of Paris
```
// 1. Search
search_observations({lat: 48.8566, lng: 2.3522, radius: 10, taxon_name: "Aves", quality_grade: "research", per_page: 100})

// 2. Render
component("map", {center: [48.8566, 2.3522], zoom: 12, markers: birdMarkers})
component("stat-card", {label: "Bird species", value: "47", icon: "bird"})
component("stat-card", {label: "Verified observations", value: "312", icon: "check"})
component("gallery", {images: birdPhotos})
component("table", {columns: ["Species", "Observations", "Last"], rows: birdSummary})
```

### Butterflies in the Alps
```
// 1. Wide area around Chamonix
search_observations({lat: 45.9237, lng: 6.8694, radius: 30, taxon_name: "Lepidoptera", per_page: 100})

// 2. Render with clustering on the map
component("map", {center: [45.9237, 6.8694], zoom: 10, markers: butterflyMarkers, cluster: true})
component("stat-card", {label: "Butterfly species", value: uniqueSpecies.length})
component("gallery", {images: butterflyPhotos})
component("table", {columns: ["Species", "Altitude", "Month", "Observer"], rows: enrichedData})
```

## Common mistakes

- **Radius too large**: a 100 km radius returns too many results and buries the information — prefer 5-20 km and increase if few results are found
- **iNaturalist thumbnails**: default URLs are in "square" format (75x75) — replace "square" with "medium" (200px) or "large" (500px)
- **No taxonomic filter**: without a filter, iNaturalist returns plants + animals + fungi together — always filter by group if the user mentions one
- **Forgetting the quality grade**: "casual" observations may be misidentified — prefer `quality_grade: "research"` for reliable data
- **Map with wrong zoom level**: adjust zoom based on the search radius (5 km → zoom 13, 20 km → zoom 11, 50 km → zoom 9)
