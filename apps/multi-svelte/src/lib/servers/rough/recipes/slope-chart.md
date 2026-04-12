---
widget: rough-slope-chart
name: Slope Chart
description: Shows change between two points in time per item
data:
  items:
    - { label: "Product A", start: 40, end: 65 }
    - { label: "Product B", start: 55, end: 45 }
    - { label: "Product C", start: 30, end: 50 }
  startLabel: "2023"
  endLabel: "2024"
  title: "Year-over-Year Change"
---

## Slope Chart

Two vertical axes connected by lines showing change direction.

### Data format

- `items` — array of `{label, start, end}` objects
- `startLabel` / `endLabel` — column headers
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "slope-chart", params: {items: [{label: "Product A", start: 40, end: 65}, {label: "Product B", start: 55, end: 45}], startLabel: "2023", endLabel: "2024", title: "Year-over-Year Change"}})`
