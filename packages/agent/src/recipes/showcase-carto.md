---
id: showcase-cartography
name: Showcase cartographic widgets — points, polygons, aggregations, tiles, 3D
when: the user asks specifically for a map / cartography / geo demo, e.g. "showcase carto", "demo carto", "show me geo widgets", "what kinds of maps can you render?"
servers: [deckgl, h3, s2, turf, maplibre]
components_used: [deckgl-scatterplot, deckgl-arc, deckgl-polygon, deckgl-h3-hexagon, deckgl-heatmap, deckgl-tile, deckgl-trips]
layout:
  type: grid
  columns: 2
  arrangement: 7 deck.gl maps in a 2-column grid
---

## When to use

The user wants to see the **cartographic capabilities** of the system. Typical phrases:
- "Montre-moi un showcase carto"
- "Demo cartographie"
- "What kinds of maps / geo widgets can you render?"
- "Showcase deckgl"

This recipe covers the four major deck.gl layer families: **points/lines**, **polygons**, **aggregation** (hexagon/H3/heatmap), **tiles & animation**.

## How to use

Mount **7 deck.gl widgets**, each with realistic Paris-region demo data. **Do NOT** stuff all the widget names into a single `deckgl-text` widget — that is not a showcase, that is a label list. Each widget must render its own layer family with real geometric data.

Use exact widget names and exact parameter names below. Schemas come from each widget's recipe.

1. **Scatterplot** — points around Paris (`deckgl-scatterplot`, key: `points`):
   ```
   widget_display({name: "deckgl-scatterplot", params: {
     points: [
       {lng: 2.3522, lat: 48.8566, radius: 200, color: [255, 100, 100]},
       {lng: 2.2945, lat: 48.8584, radius: 180, color: [100, 200, 255]},
       {lng: 2.3499, lat: 48.8530, radius: 150, color: [120, 255, 120]},
       {lng: 2.3376, lat: 48.8606, radius: 220, color: [255, 200, 80]},
       {lng: 2.3326, lat: 48.8867, radius: 160, color: [200, 100, 255]}
     ],
     center: [2.3522, 48.8566], zoom: 12
   }})
   ```

2. **Arc** — flows from Paris to other French cities (`deckgl-arc`, key: `arcs`):
   ```
   widget_display({name: "deckgl-arc", params: {
     arcs: [
       {from: [2.3522, 48.8566], to: [4.8357, 45.7640], width: 3},
       {from: [2.3522, 48.8566], to: [5.3698, 43.2965], width: 4},
       {from: [2.3522, 48.8566], to: [-1.5536, 47.2184], width: 2},
       {from: [2.3522, 48.8566], to: [7.7521, 48.5734], width: 3}
     ],
     center: [3.5, 46.5], zoom: 5
   }})
   ```

3. **Polygon** — three quadrilaterals around central Paris (`deckgl-polygon`, key: `polygons`, color key: `fillColor`):
   ```
   widget_display({name: "deckgl-polygon", params: {
     polygons: [
       {polygon: [[2.32, 48.86], [2.36, 48.86], [2.36, 48.88], [2.32, 48.88], [2.32, 48.86]], fillColor: [255, 100, 100, 120]},
       {polygon: [[2.36, 48.86], [2.40, 48.86], [2.40, 48.88], [2.36, 48.88], [2.36, 48.86]], fillColor: [100, 200, 255, 120]},
       {polygon: [[2.32, 48.84], [2.36, 48.84], [2.36, 48.86], [2.32, 48.86], [2.32, 48.84]], fillColor: [100, 255, 120, 120]}
     ],
     center: [2.35, 48.86], zoom: 12
   }})
   ```

4. **H3 hexagon** — Uber H3 cells with values (`deckgl-h3-hexagon`, key: `cells`). If the `h3` server is activated, prefer to call `latLngToCell({lat, lng, res: 8})` first to obtain valid indices for Paris. Otherwise use known-valid Paris-area indices below:
   ```
   widget_display({name: "deckgl-h3-hexagon", params: {
     cells: [
       {hex: "881fb46625fffff", value: 12},
       {hex: "881fb46627fffff", value: 8},
       {hex: "881fb4662dfffff", value: 22},
       {hex: "881fb46663fffff", value: 6},
       {hex: "881fb46669fffff", value: 15}
     ],
     extruded: true, elevationScale: 30,
     center: [2.35, 48.86], zoom: 11
   }})
   ```

5. **Heatmap** — weighted point density (`deckgl-heatmap`, key: `points`):
   ```
   widget_display({name: "deckgl-heatmap", params: {
     points: [
       {lng: 2.35, lat: 48.86, weight: 5}, {lng: 2.36, lat: 48.86, weight: 8},
       {lng: 2.34, lat: 48.87, weight: 3}, {lng: 2.33, lat: 48.85, weight: 12},
       {lng: 2.37, lat: 48.88, weight: 6}, {lng: 2.32, lat: 48.84, weight: 9}
     ],
     center: [2.35, 48.86], zoom: 12
   }})
   ```

6. **Tile** — OSM raster tiles (`deckgl-tile`, key: `tileUrl`):
   ```
   widget_display({name: "deckgl-tile", params: {
     tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
     center: [2.35, 48.86], zoom: 10
   }})
   ```

7. **Trips** — animated trajectory (`deckgl-trips`, key: `trips`):
   ```
   widget_display({name: "deckgl-trips", params: {
     trips: [
       {path: [[2.30, 48.85], [2.33, 48.86], [2.36, 48.87], [2.40, 48.88]], timestamps: [0, 200, 400, 600], color: [253, 128, 93]}
     ],
     trailLength: 200, animationSpeed: 1,
     center: [2.35, 48.86], zoom: 12
   }})
   ```

## Important

- **Never** call `deckgl-text` with a list of widget *names* as labels. That is not a showcase.
- Each widget must contain real geometric data (positions, polygons, H3 cells…), not labels.
- Use exactly the parameter keys above (`points` not `data`, `arcs` not `data`, `polygons` not `data`, `cells` not `data`, `tileUrl` not `url`, `trips` not `data`).
- If the user asks for a specific layer family, drill down into the per-widget recipe (`scatterplot`, `arc`, `h3-hexagon`, etc.).
- Keep the canvas under 8 maps to stay within WebGL context limits.

## Output text

Return a single sentence such as: "Tour cartographique : 7 widgets deck.gl — points, arcs, polygones, H3, heatmap, tiles OSM et trajets animés."
