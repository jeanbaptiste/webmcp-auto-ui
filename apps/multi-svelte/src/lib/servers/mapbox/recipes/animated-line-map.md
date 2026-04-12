---
widget: animated-line-map
description: Line that draws progressively on the map with animation
group: mapbox
schema:
  type: object
  properties:
    coordinates:
      type: array
      description: Array of [lng, lat] coordinates for the animated path
    path:
      type: array
      description: Alias for coordinates
    lineColor:
      type: string
      description: Line color (default "#f97316")
    lineWidth:
      type: number
      description: Line width (default 3)
    duration:
      type: number
      description: Animation duration in ms (default 3000)
    center:
      type: array
      description: Map center [lng, lat]
    zoom:
      type: number
      description: Initial zoom level
---

## Usage

Animate a line drawing itself along a path. Useful for showing travel routes, data flows, or migration paths.

## Example

```json
{
  "coordinates": [[2.35, 48.85], [4.83, 45.76], [5.37, 43.30], [7.26, 43.71]],
  "lineColor": "#f97316",
  "lineWidth": 4,
  "duration": 4000
}
```
