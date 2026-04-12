---
id: rough-treemap
name: Treemap
description: Nested rectangles representing hierarchical data by area
data:
  items:
    - { label: "JavaScript", value: 40 }
    - { label: "Python", value: 30 }
    - { label: "TypeScript", value: 20 }
    - { label: "Rust", value: 10 }
    - { label: "Go", value: 8 }
  title: "Language Popularity"
---

## Treemap

Rectangles sized by value, with hachure fill for sketch style.

### Data format

- `items` — array of `{label, value}` objects
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "treemap", params: {items: [{label: "JavaScript", value: 40}, {label: "Python", value: 30}, {label: "Rust", value: 10}], title: "Language Popularity"}})`
