---
widget: rough-histogram
description: Distribution of values across bins
schema:
  type: object
  required:
    - bins
  properties:
    bins:
      type: array
      items:
        type: object
        required:
          - min
          - max
          - count
        properties:
          min:
            type: number
            description: Bin lower bound
          max:
            type: number
            description: Bin upper bound
          count:
            type: number
            description: Frequency count
      description: Histogram bins with ranges and counts
    title:
      type: string
      description: Chart title
---

## Histogram

Frequency distribution shown as adjacent bars.

### Data format

- `bins` — array of `{min, max, count}` objects
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "histogram", params: {bins: [{min: 0, max: 20, count: 5}, {min: 20, max: 40, count: 12}, {min: 40, max: 60, count: 25}], title: "Score Distribution"}})`
