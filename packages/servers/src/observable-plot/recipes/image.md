---
widget: observable-plot-image
description: Place images at specified (x, y) positions.
group: observable-plot
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array, description: "Array of {x, y, src}" }
    xKey: { type: string }
    yKey: { type: string }
    srcKey: { type: string, description: "Field for image URL (default 'src')" }
    width: { type: number }
    height: { type: number }
    r: { type: number, description: "Radius for circular crop" }
    preserveAspectRatio: { type: string }
---

## When to use
Icon-based plots, sports player portraits, flags.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-image", params: { data: [{x:1,y:1,src:'https://example.com/a.png'}] }})
```
