---
widget: pixijs-world-map
description: Simplified world map with highlighted regions — WebGL dot grid representation
schema:
  type: object
  properties:
    highlights:
      type: array
      items:
        type: object
        properties:
          lat:
            type: number
          lon:
            type: number
          label:
            type: string
          color:
            type: string
          size:
            type: number
      description: Points to highlight on the map
    title:
      type: string
    baseColor:
      type: string
      description: Base dot color (hex)
  required: []
---

## When to use

Use pixijs-world-map for geographic point visualization. Ideal for:
- Office/server locations
- Event distribution
- Global data points

## Examples

```json
{
  "highlights": [
    {"lat": 48.85, "lon": 2.35, "label": "Paris", "color": "#ef4444"},
    {"lat": 40.71, "lon": -74.01, "label": "New York", "color": "#3b82f6"},
    {"lat": 35.68, "lon": 139.69, "label": "Tokyo", "color": "#10b981"}
  ],
  "title": "Global Offices"
}
```
