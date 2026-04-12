---
id: rough-marimekko
name: Marimekko Chart
description: Variable-width stacked bar chart showing market share
data:
  categories:
    - label: "US"
      total: 50
      segments:
        - { label: "Product A", value: 20 }
        - { label: "Product B", value: 30 }
    - label: "EU"
      total: 35
      segments:
        - { label: "Product A", value: 25 }
        - { label: "Product B", value: 10 }
    - label: "Asia"
      total: 40
      segments:
        - { label: "Product A", value: 15 }
        - { label: "Product B", value: 25 }
  title: "Market Share by Region"
---

## Marimekko Chart

Both width and height encode data — width is category size, height is segment proportion.

### Data format

- `categories` — array of `{label, total, segments: [{label, value}]}` objects
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "marimekko", params: {categories: [{label: "US", total: 50, segments: [{label: "A", value: 20}, {label: "B", value: 30}]}, {label: "EU", total: 35, segments: [{label: "A", value: 25}, {label: "B", value: 10}]}], title: "Market Share by Region"}})`
