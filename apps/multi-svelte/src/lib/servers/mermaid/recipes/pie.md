---
widget: mermaid-pie
description: Pie chart with labeled slices and values.
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid pie definition"
    title:
      type: string
    showData:
      type: boolean
      description: "Show percentage values (default true)"
    slices:
      type: array
      items:
        type: object
        required: [label, value]
        properties:
          label:
            type: string
          value:
            type: number
---
Renders a pie chart. Provide either a raw `definition` or structured `slices` with labels and values.

## How
1. Call `mermaid_webmcp_widget_display({name: "pie", params: {definition: "pie title Languages\n  \"JS\" : 60\n  \"Python\" : 25\n  \"Go\" : 15"}})`
