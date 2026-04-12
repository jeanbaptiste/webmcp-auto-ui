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
