---
widget: rough-histogram
name: Histogram
description: Distribution of values across bins
data:
  bins:
    - { min: 0, max: 20, count: 5 }
    - { min: 20, max: 40, count: 12 }
    - { min: 40, max: 60, count: 25 }
    - { min: 60, max: 80, count: 18 }
    - { min: 80, max: 100, count: 8 }
  title: "Score Distribution"
---

## Histogram

Frequency distribution shown as adjacent bars.

### Data format

- `bins` — array of `{min, max, count}` objects
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "histogram", params: {bins: [{min: 0, max: 20, count: 5}, {min: 20, max: 40, count: 12}, {min: 40, max: 60, count: 25}], title: "Score Distribution"}})`
