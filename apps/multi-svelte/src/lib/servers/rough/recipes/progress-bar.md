---
id: rough-progress-bar
name: Progress Bar
description: Horizontal progress bars showing completion percentage
data:
  items:
    - { label: "Backend", value: 85, max: 100 }
    - { label: "Frontend", value: 60, max: 100 }
    - { label: "Testing", value: 30, max: 100 }
    - { label: "Docs", value: 45, max: 100 }
  title: "Sprint Progress"
---

## Progress Bar

Multiple horizontal bars showing completion toward a goal.

### Data format

- `items` — array of `{label, value, max?}` objects (max defaults to 100)
- `title` — optional chart title
