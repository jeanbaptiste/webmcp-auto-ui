---
widget: mermaid-xychart
description: XY chart with bar and line series on categorical or numeric axes.
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid xychart definition"
    title:
      type: string
    xAxis:
      type: object
      properties:
        label:
          type: string
        values:
          type: array
          items:
            type: string
    yAxis:
      type: object
      properties:
        label:
          type: string
        min:
          type: number
        max:
          type: number
    series:
      type: array
      items:
        type: object
        required: [type, data]
        properties:
          type:
            type: string
            enum: [bar, line]
          data:
            type: array
            items:
              type: number
---
Renders an XY chart with bar and/or line series. Provide either a raw `definition` or structured axes and `series`.

## How
1. Call `mermaid_webmcp_widget_display({name: "xychart", params: {definition: "xychart-beta\n  title Sales\n  x-axis [Q1, Q2, Q3, Q4]\n  y-axis \"Revenue\"\n  bar [10, 25, 15, 30]\n  line [10, 25, 15, 30]"}})`

## Example
```
mermaid_webmcp_widget_display({name: "mermaid-xychart", params: {definition: "xychart-beta\n  title Monthly Active Users 2025\n  x-axis [Jan, Feb, Mar, Apr, May, Jun]\n  y-axis \"Users (k)\" 0 --> 100\n  bar [42, 48, 55, 61, 70, 78]\n  line [42, 48, 55, 61, 70, 78]"}})
```
