---
id: rough-box-plot
name: Box Plot
description: Statistical distribution showing median, quartiles, and range
data:
  groups:
    - { label: "Team A", min: 10, q1: 25, median: 40, q3: 55, max: 70 }
    - { label: "Team B", min: 20, q1: 35, median: 50, q3: 65, max: 80 }
    - { label: "Team C", min: 5, q1: 15, median: 30, q3: 45, max: 60 }
  title: "Performance Distribution"
---

## Box Plot

Shows statistical summary (min, Q1, median, Q3, max) per group.

### Data format

- `groups` — array of `{label, min, q1, median, q3, max}` objects
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "box-plot", params: {groups: [{label: "Team A", min: 10, q1: 25, median: 40, q3: 55, max: 70}, {label: "Team B", min: 20, q1: 35, median: 50, q3: 65, max: 80}], title: "Performance Distribution"}})`
