---
widget: rough-marimekko
description: Variable-width stacked bar chart showing market share
schema:
  type: object
  required:
    - categories
  properties:
    categories:
      type: array
      items:
        type: object
        required:
          - label
          - total
          - segments
        properties:
          label:
            type: string
            description: Category name
          total:
            type: number
            description: Total width value for this category
          segments:
            type: array
            items:
              type: object
              required:
                - label
                - value
              properties:
                label:
                  type: string
                  description: Segment name
                value:
                  type: number
                  description: Segment value
            description: Sub-segments within the category
      description: Categories with variable width and stacked segments
    title:
      type: string
      description: Chart title
---

## Marimekko Chart

Both width and height encode data — width is category size, height is segment proportion.

### Data format

- `categories` — array of `{label, total, segments: [{label, value}]}` objects
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "marimekko", params: {categories: [{label: "US", total: 50, segments: [{label: "A", value: 20}, {label: "B", value: 30}]}, {label: "EU", total: 35, segments: [{label: "A", value: 25}, {label: "B", value: 10}]}], title: "Market Share by Region"}})`

## Example
```
rough_webmcp_widget_display({name: "rough-marimekko", params: {categories: [{label: "North America", total: 50, segments: [{label: "Premium", value: 20}, {label: "Standard", value: 30}]}, {label: "Europe", total: 35, segments: [{label: "Premium", value: 25}, {label: "Standard", value: 10}]}, {label: "Asia", total: 15, segments: [{label: "Premium", value: 5}, {label: "Standard", value: 10}]}], title: "Market Share by Region"}})
```
