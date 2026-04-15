---
id: cross-reference-data-from-multiple-connected-mcp-servers
name: Cross-reference data from multiple simultaneously connected MCP servers
components_used: [map, gallery, table, kv, stat-card]
when: the user's question requires combining data from multiple connected MCP servers, for example cross-referencing geolocation and observations, or enriching parliamentary data with Wikipedia
servers: []
layout:
  type: grid
  columns: 2
---

## When to use

The user asks a question that cannot be answered by a single MCP server. Examples:
- "What birds can be spotted near the Louvre?" → geocoding + iNaturalist
- "Show me the weather and nature observations in Marseille" → Open-Meteo + iNaturalist
- "Compare artworks from the Met Museum on the theme of flowers with species observed in New York" → Met Museum + iNaturalist
- "Give me the Wikipedia profile of the MP who filed the most amendments" → Tricoteuses + Wikipedia

This recipe applies whenever 2+ MCP servers are needed to answer the question.

## How to use

1. **Identify which MCP servers provide which data**:
   - Server A provides reference data (coordinates, IDs, names)
   - Server B enriches with complementary data
2. **Call the first server** to obtain the base data:
   ```
   // Example: geocode a location
   geocode({query: "Louvre, Paris"}) → {lat: 48.8606, lon: 2.3376}
   ```
3. **Use the results as input** for the second server:
   ```
   // Example: search for observations within a radius
   search_observations({lat: 48.8606, lng: 2.3376, radius: 5, taxon: "Aves"})
   ```
4. **Combine the results** in a coherent visualization:
   - `component("map", ...)` if coordinates are involved (markers from both sources)
   - `component("table", ...)` for combined results with columns from both sources
   - `component("gallery", ...)` if both sources provide images
5. **Always cite the sources** with a final `kv` component:
   ```
   component("kv", {pairs: [["Source 1", "iNaturalist"], ["Source 2", "Open-Meteo"], ["Area", "5 km around the Louvre"]]})
   ```

## Examples

### Birds near a landmark (geocoding + iNaturalist)
```
// 1. Geocode the location
geocode({query: "Tour Eiffel, Paris"}) → lat: 48.8584, lon: 2.2945

// 2. Search for bird observations
search_observations({lat: 48.8584, lng: 2.2945, radius: 3, taxon_name: "Aves"})

// 3. Combined render
component("map", {
  center: [48.8584, 2.2945],
  zoom: 14,
  markers: [{lat: 48.8584, lon: 2.2945, label: "Tour Eiffel", icon: "landmark"}]
    .concat(observations.map(o => ({lat: o.lat, lon: o.lon, label: o.species_guess})))
})
component("gallery", {images: observations.flatMap(o => o.photos.map(p => ({src: p.url, alt: o.species_guess})))})
component("table", {columns: ["Species", "Date", "Distance", "Observer"], rows: formattedObs})
component("stat-card", {label: "Distinct species", value: "23", icon: "bird"})
```

### Enriched profile (Tricoteuses + Wikipedia)
```
// 1. Find the most active MP
query_sql({sql: "SELECT depute, COUNT(*) as nb FROM amendements GROUP BY depute ORDER BY nb DESC LIMIT 1"})

// 2. Enrich with Wikipedia
search_wikipedia({query: depute.nom})

// 3. Combined render
component("profile", {name: depute.nom, subtitle: depute.groupe, details: wikipedia.extract})
component("stat-card", {label: "Amendments filed", value: depute.nb})
component("kv", {pairs: [["Parliamentary source", "Tricoteuses"], ["Biography", "Wikipedia"]]})
```

### Weather + Biodiversity in a region
```
// 1. Weather for Marseille
get_forecast({latitude: 43.2965, longitude: 5.3698, daily: "temperature_2m_max"})

// 2. Nature observations
search_observations({lat: 43.2965, lng: 5.3698, radius: 20})

// 3. Combined dashboard
component("stat-card", {label: "Max temperature", value: "26°C", icon: "thermometer"})
component("stat-card", {label: "Recent observations", value: "412", icon: "eye"})
component("map", {center: [43.2965, 5.3698], markers: observations})
component("chart", {type: "line", labels: dates, datasets: [{label: "Temperature", data: temps}, {label: "Observations", data: obsCounts}]})
```

## Common mistakes

- **Making more than 3 DATA calls without an intermediate render**: the user expects visual results between steps
- **Not explaining which servers are being used**: always display the sources with a `kv`
- **Mixing data without structure**: combined results must be in a coherent table or map, not a raw dump
- **Forgetting to handle no-match cases**: if geocoding finds nothing, or if iNaturalist has no observations in the area, display that clearly
