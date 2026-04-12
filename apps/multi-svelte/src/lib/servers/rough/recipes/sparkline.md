---
widget: rough-sparkline
name: Sparkline
description: Tiny inline chart showing trend at a glance
data:
  values: [5, 8, 3, 12, 7, 10, 15, 9, 11, 14]
---

## Sparkline

Compact line chart (200x60px) for inline trend visualization.

### Data format

- `values` — array of numbers

## How
1. Call `rough_webmcp_widget_display({name: "sparkline", params: {values: [5,8,3,12,7,10,15]}})`
