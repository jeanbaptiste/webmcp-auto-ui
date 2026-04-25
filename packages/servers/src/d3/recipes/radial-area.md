---
widget: radial-area
description: Radial area chart (filled radar/spider chart)
group: d3
schema:
  type: object
  required:
    - series
  properties:
    title:
      type: string
    series:
      type: array
      items:
        type: object
        required:
          - points
        properties:
          label:
            type: string
          color:
            type: string
          points:
            type: array
            items:
              type: object
              required:
                - value
              properties:
                value:
                  type: number
    labels:
      type: array
      items:
        type: string
      description: "Axis labels (one per point)"
    colorScheme:
      type: string
---

## When to use
Like radial-line but with filled areas — better for comparing overall "area" between entities. Classic radar chart.

## How
1. Get multi-dimensional data from MCP
2. Call `d3_webmcp_widget_display({name: "radial-area", params: {labels: ["Attack","Defense","Speed","HP","Magic"], series: [{label: "Warrior", points: [{value:9},{value:8},{value:5},{value:7},{value:2}]}, {label: "Mage", points: [{value:3},{value:4},{value:6},{value:5},{value:10}]}]}})`

## Common errors
- Same as radial-line: all series must have equal number of points
- Overlapping areas use transparency; more than 3 series becomes cluttered

## Example
```
d3_webmcp_widget_display({name: "radial-area", params: {title: "Product Comparison", labels: ["Performance","Reliability","UX","Price","Support"], series: [{label: "Product A", points: [{value:8},{value:9},{value:7},{value:5},{value:8}]}, {label: "Product B", points: [{value:6},{value:7},{value:9},{value:8},{value:6}]}]}})
```
