---
widget: rough-sparkline
description: Tiny inline chart showing trend at a glance
schema:
  type: object
  required:
    - values
  properties:
    values:
      type: array
      items:
        type: number
      description: Numeric data points for the sparkline
---

## Sparkline

Compact line chart (200x60px) for inline trend visualization.

### Data format

- `values` — array of numbers

## How
1. Call `rough_webmcp_widget_display({name: "sparkline", params: {values: [5,8,3,12,7,10,15]}})`
