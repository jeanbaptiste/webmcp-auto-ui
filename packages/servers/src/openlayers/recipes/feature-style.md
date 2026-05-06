---
widget: openlayers-feature-style
description: Per-feature styled point layer — each feature carries its own color, radius, and label.
group: openlayers
schema:
  type: object
  required: [features]
  properties:
    features:
      type: array
      items:
        type: object
        properties:
          lon: { type: number }
          lat: { type: number }
          color: { type: string }
          radius: { type: number }
          label: { type: string }
    colorField: { type: string, description: "Override field name for color (default 'color')" }
    radiusField: { type: string, description: "Override field name for radius (default 'radius')" }
    center:
      description: "Map center. Use object form { lat, lon } to avoid lat/lon swap. Array form [lon, lat] also accepted (note: longitude FIRST, latitude second)."
      oneOf:
        - type: array
          items: { type: number }
          minItems: 2
          maxItems: 2
        - type: object
          required: [lat, lon]
          properties:
            lat: { type: number, minimum: -90, maximum: 90 }
            lon: { type: number, minimum: -180, maximum: 180 }
    zoom: { type: number }
---

## When to use
Show categorical or quantitative encoding via per-feature style overrides.

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-feature-style", params: {
  features: [
    { lon: 2.35, lat: 48.85, color: "#e44", radius: 10, label: "Paris" },
    { lon: 4.85, lat: 45.75, color: "#48f", radius: 7,  label: "Lyon" }
  ],
  center: { lat: 47.0, lon: 3.0 }, zoom: 6
}})
```
