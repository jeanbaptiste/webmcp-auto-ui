---
widget: leaflet-data-classification
description: Classify GeoJSON data using quantile or equal-interval methods
group: data
schema:
  type: object
  properties:
    center:
      type: array
      items: { type: number }
    zoom:
      type: number
    geojson:
      type: object
      description: "GeoJSON FeatureCollection"
    valueProperty:
      type: string
    method:
      type: string
      description: "Classification method: 'quantile' or 'equal' (default: quantile)"
    numClasses:
      type: number
    colorScheme:
      type: array
      items: { type: string }
  required: [geojson]
---

## Data Classification

Like choropleth but with explicit control over the classification method (quantile vs equal-interval). Useful for skewed distributions.

### Example

```json
{
  "geojson": { "type": "FeatureCollection", "features": [] },
  "valueProperty": "income",
  "method": "quantile",
  "numClasses": 5,
  "colorScheme": ["#edf8fb", "#b3cde3", "#8c96c6", "#8856a7", "#810f7c"]
}
```
