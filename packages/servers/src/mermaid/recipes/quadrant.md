---
widget: mermaid-quadrant
description: Quadrant chart for plotting items on two axes (e.g. priority vs effort).
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid quadrant chart definition"
    title:
      type: string
    xAxis:
      type: object
      properties:
        left:
          type: string
        right:
          type: string
    yAxis:
      type: object
      properties:
        bottom:
          type: string
        top:
          type: string
    quadrants:
      type: array
      items:
        type: string
      description: "Labels for quadrants 1-4 (top-right, top-left, bottom-left, bottom-right)"
    points:
      type: array
      items:
        type: object
        required: [label, x, y]
        properties:
          label:
            type: string
          x:
            type: number
            description: "0.0 to 1.0"
          y:
            type: number
            description: "0.0 to 1.0"
---
Renders a quadrant chart. Provide either a raw `definition` or structured axes, quadrant labels, and data points with x/y coordinates (0-1).

## How
1. Call `mermaid_webmcp_widget_display({name: "quadrant", params: {definition: "quadrantChart\n  x-axis Low --> High\n  y-axis Low --> High\n  quadrant-1 Do First\n  quadrant-2 Schedule\n  quadrant-3 Delegate\n  quadrant-4 Delete\n  Task A: [0.8, 0.9]\n  Task B: [0.3, 0.2]"}})`

## Example
```
mermaid_webmcp_widget_display({name: "mermaid-quadrant", params: {definition: "quadrantChart\n  title Feature Prioritization\n  x-axis Low Effort --> High Effort\n  y-axis Low Impact --> High Impact\n  quadrant-1 Quick Wins\n  quadrant-2 Major Projects\n  quadrant-3 Fill-ins\n  quadrant-4 Thankless Tasks\n  Dark mode: [0.2, 0.8]\n  SSO login: [0.7, 0.9]\n  Onboarding tour: [0.4, 0.6]\n  CSV export: [0.3, 0.3]\n  Notifications: [0.6, 0.5]"}})
```
