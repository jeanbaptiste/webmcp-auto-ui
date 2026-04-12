---
widget: leaflet-svg-overlay
description: Overlay custom SVG content on geographic bounds
group: overlays
schema:
  type: object
  properties:
    center:
      type: array
      items: { type: number }
    zoom:
      type: number
    svgContent:
      type: string
      description: "SVG inner content (elements inside <svg>)"
    bounds:
      type: array
      description: "[[southWest lat, lng], [northEast lat, lng]]"
    opacity:
      type: number
  required: [svgContent, bounds]
---

## SVG Overlay

Places custom SVG graphics on the map within geographic bounds. Useful for diagrams, annotations, or custom visualizations tied to geography.

### Example

```json
{
  "svgContent": "<rect width='100' height='100' fill='red' opacity='0.5'/><circle cx='100' cy='100' r='50' fill='blue'/>",
  "bounds": [[48.84, 2.33], [48.87, 2.37]],
  "opacity": 0.8
}
```
