---
id: rough-bubble-chart
name: Bubble Chart
description: Scatter plot with variable-size bubbles representing a third dimension
data:
  bubbles:
    - { x: 20, y: 30, r: 10, label: "Small" }
    - { x: 50, y: 60, r: 30, label: "Medium" }
    - { x: 80, y: 40, r: 50, label: "Large" }
  title: "Market Segments"
---

## Bubble Chart

Like a scatter plot but with a third dimension (radius).

### Data format

- `bubbles` — array of `{x, y, r, label?}` objects
- `title` — optional chart title
